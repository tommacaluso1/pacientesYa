// End-to-end pipeline for one consultation:
// audio → transcribe → clean → extract → structure → summarize → embed → similarity → suggestions

import { requireUser } from "@/lib/supabase/server";
import { transcribe } from "./transcription";
import { extract } from "./extraction";
import { generateClinicalDocument } from "./summarization";
import { embed } from "./embeddings";
import { generateSuggestions } from "./suggestions";
import { buildPatientContext, formatPatientContext } from "@/lib/domain/context";
import { env } from "@/lib/env";
import type { ExtractionResult } from "@/lib/validation/schemas";

const STORAGE_BUCKET = "clinical";

function clean(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/(\.|\?|!)\s*/g, "$1\n")
    .trim();
}

export async function processConsultation(consultationId: string) {
  const { supabase, user } = await requireUser();

  // 1. load consultation + encounter + patient
  const { data: c, error: cErr } = await supabase
    .from("consultations").select("*").eq("id", consultationId).single();
  if (cErr || !c) throw cErr ?? new Error("consultation not found");
  if (!c.audio_path) throw new Error("consultation has no audio_path");

  const { data: enc } = await supabase
    .from("encounters").select("*").eq("id", c.encounter_id).single();
  const { data: patient } = await supabase
    .from("patients").select("*").eq("id", enc!.patient_id).single();

  await supabase.from("consultations").update({ status: "transcribing" }).eq("id", consultationId);

  // 2. download audio (skipped in mock mode — no real transcription needed)
  let bytes = new Uint8Array(0);
  if (env.AI_MODE !== "mock") {
    const { data: blob, error: dlErr } = await supabase.storage.from(STORAGE_BUCKET).download(c.audio_path);
    if (dlErr || !blob) {
      await supabase.from("consultations").update({ status: "failed", error: dlErr?.message ?? "download failed" }).eq("id", consultationId);
      throw dlErr ?? new Error("audio download failed");
    }
    const arrayBuf = await blob.arrayBuffer();
    bytes = new Uint8Array(arrayBuf);
  }

  // 3. transcribe
  let transcribed;
  try {
    transcribed = await transcribe({
      bytes,
      filename: c.audio_path.split("/").pop() ?? "audio.webm",
      language: "es"
    });
  } catch (e) {
    await supabase.from("consultations").update({ status: "failed", error: String(e) }).eq("id", consultationId);
    throw e;
  }

  const cleaned = clean(transcribed.text);

  // 4. persist transcript
  const { data: tr, error: trErr } = await supabase
    .from("transcripts")
    .insert({
      consultation_id: consultationId,
      owner_id: user.id,
      raw_text: transcribed.text,
      cleaned_text: cleaned,
      language: transcribed.language,
      model: transcribed.model
    }).select("*").single();
  if (trErr) throw trErr;

  await supabase.from("consultations").update({
    status: "transcribed",
    audio_duration_s: transcribed.duration_s ?? c.audio_duration_s,
    finished_at: new Date().toISOString()
  }).eq("id", consultationId);

  // 5. extract structured data — shared context builder, scoped to THIS patient
  const preCtx = await buildPatientContext(patient!.id, c.encounter_id);
  const { patientText: patientCtx } = formatPatientContext(preCtx);

  let extraction: ExtractionResult;
  try {
    extraction = await extract({ transcript: cleaned, context: patientCtx });
  } catch (e) {
    await supabase.from("consultations").update({ status: "failed", error: String(e) }).eq("id", consultationId);
    throw e;
  }

  // 6. structure into tables
  if (extraction.entities.length) {
    await supabase.from("clinical_entities").insert(
      extraction.entities.map((e) => ({
        encounter_id: c.encounter_id,
        consultation_id: consultationId,
        owner_id: user.id,
        kind: e.kind,
        label: e.label,
        value: e.value ?? null,
        unit: e.unit ?? null,
        confidence: e.confidence,
        source_span: e.source_span ?? null
      }))
    );
  }

  const v = extraction.vitals ?? {};
  const hasVitals = Object.values(v).some((x) => x != null);
  if (hasVitals) {
    await supabase.from("vitals").insert({
      encounter_id: c.encounter_id,
      owner_id: user.id,
      ta_sistolica: v.ta_sistolica ?? null,
      ta_diastolica: v.ta_diastolica ?? null,
      fc: v.fc ?? null, fr: v.fr ?? null,
      temperatura: v.temperatura ?? null,
      saturacion: v.saturacion ?? null,
      glucemia: v.glucemia ?? null,
      glasgow: v.glasgow ?? null,
      dolor_eva: v.dolor_eva ?? null,
      notas: "auto-extraído"
    });
  }

  if (extraction.labs.length) {
    await supabase.from("labs").insert(
      extraction.labs.map((l) => ({
        encounter_id: c.encounter_id, owner_id: user.id,
        analito: l.analito, valor: l.valor, unidad: l.unidad ?? null,
        ref_min: l.ref_min ?? null, ref_max: l.ref_max ?? null,
        source: `consultation:${consultationId}`
      }))
    );
  }

  if (extraction.tasks_sugeridas.length) {
    await supabase.from("tasks").insert(
      extraction.tasks_sugeridas.map((t) => ({
        encounter_id: c.encounter_id,
        patient_id: patient!.id,
        owner_id: user.id,
        title: t.title
      }))
    );
  }

  // 7. summary (evolución) + embedding — rebuild context AFTER inserts so the
  // newly-extracted vitals/labs/entities are reflected. extraction.resumen is
  // explicitly NOT used — it's mock content in demo mode and unreliable in
  // real mode. The summary always derives from this patient's structured data.
  const postCtx = await buildPatientContext(patient!.id, c.encounter_id);
  const { patientText: postPatient, encounterText: postEncounter } = formatPatientContext(postCtx);
  const summaryText = await generateClinicalDocument({
    kind: "evolucion",
    patientContext: postPatient,
    encounterContext: postEncounter
  });

  const { data: summary } = await supabase.from("patient_summaries").insert({
    patient_id: patient!.id,
    encounter_id: c.encounter_id,
    owner_id: user.id,
    kind: "evolucion",
    content: summaryText,
    metadata: { consultation_id: consultationId }
  }).select("*").single();

  // embed both summary and transcript (best-effort)
  try {
    const [eSum, eTr] = await Promise.all([embed(summaryText), embed(cleaned.slice(0, 4000))]);
    await supabase.from("embeddings").insert([
      { owner_id: user.id, source_kind: "summary",    source_id: summary!.id, patient_id: patient!.id, content: summaryText.slice(0, 4000), embedding: eSum, metadata: {} },
      { owner_id: user.id, source_kind: "transcript", source_id: tr!.id,      patient_id: patient!.id, content: cleaned.slice(0, 4000),     embedding: eTr,  metadata: {} }
    ]);
  } catch { /* embeddings optional */ }

  await supabase.from("consultations").update({ status: "extracted" }).eq("id", consultationId);

  // 8. similarity-driven suggestions (best-effort)
  // RAG is scoped to THIS patient only. Cross-patient retrieval is a contamination
  // vector — the LLM would otherwise paraphrase other patients' summaries into
  // suggestions for the current encounter. The defensive filter below is a
  // belt-and-suspenders check in case the RPC ever returns a mismatched row.
  try {
    const queryVec = await embed(summaryText);
    const { data: matches } = await supabase.rpc("match_embeddings", {
      query_embedding: queryVec, match_count: 5, match_threshold: 0.78,
      filter_patient: patient!.id
    });
    const similar = (matches ?? [])
      .filter((m) => m.source_id !== summary!.id)
      .filter((m) => {
        if (m.patient_id && m.patient_id !== patient!.id) {
          console.warn(`[pipeline] dropped cross-patient embedding: got patient_id=${m.patient_id}, expected ${patient!.id}`);
          return false;
        }
        return true;
      })
      .map((m) => m.content)
      .slice(0, 5);

    const suggestions = await generateSuggestions({
      encounterContext: `${patientCtx}\n\nRESUMEN ACTUAL:\n${summaryText}`,
      similarCases: similar
    });
    if (suggestions.length) {
      await supabase.from("clinical_suggestions").insert(
        suggestions.map((s) => ({
          encounter_id: c.encounter_id, owner_id: user.id,
          kind: s.kind, title: s.title, reasoning: s.reasoning,
          confidence: s.confidence, source: s.source
        }))
      );
    }
  } catch { /* suggestions optional */ }

  return { consultationId, transcript_id: tr!.id, summary_id: summary!.id };
}
