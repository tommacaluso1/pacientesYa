// End-to-end pipeline for one consultation:
// audio → transcribe → clean → extract → structure → summarize → embed → similarity → suggestions

import { requireUser } from "@/lib/supabase/server";
import { transcribe } from "./transcription";
import { extract } from "./extraction";
import { generateClinicalDocument } from "./summarization";
import { embed } from "./embeddings";
import { generateSuggestions } from "./suggestions";
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

  // 2. download audio
  const { data: blob, error: dlErr } = await supabase.storage.from(STORAGE_BUCKET).download(c.audio_path);
  if (dlErr || !blob) {
    await supabase.from("consultations").update({ status: "failed", error: dlErr?.message ?? "download failed" }).eq("id", consultationId);
    throw dlErr ?? new Error("audio download failed");
  }
  const arrayBuf = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuf);

  // 3. transcribe
  let transcribed;
  try {
    transcribed = await transcribe({
      bytes,
      filename: c.audio_path.split("/").pop() ?? "audio.webm",
      mimeType: blob.type,
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

  // 5. extract structured data
  const patientCtx = [
    `${patient!.nombre} ${patient!.apellido}, ${patient!.edad ?? "?"} años, sexo ${patient!.sexo}`,
    patient!.antecedentes?.length ? `Antecedentes: ${patient!.antecedentes.join(", ")}` : "",
    patient!.alergias?.length ? `Alergias: ${patient!.alergias.join(", ")}` : "",
    patient!.medicacion_habitual?.length ? `Medicación habitual: ${patient!.medicacion_habitual.join(", ")}` : "",
    enc!.motivo_consulta ? `Motivo de consulta: ${enc!.motivo_consulta}` : "",
    enc!.diagnostico_presuntivo ? `Dx presuntivo: ${enc!.diagnostico_presuntivo}` : ""
  ].filter(Boolean).join("\n");

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
        encounter_id: c.encounter_id, owner_id: user.id,
        title: t.title, priority: t.priority
      }))
    );
  }

  // 7. summary (evolución) + embedding
  let summaryText = extraction.resumen?.trim();
  if (!summaryText) {
    summaryText = await generateClinicalDocument({
      kind: "evolucion",
      patientContext: patientCtx,
      encounterContext: cleaned.slice(0, 4000)
    });
  }

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
  try {
    const queryVec = await embed(summaryText);
    const { data: matches } = await supabase.rpc("match_embeddings", {
      query_embedding: queryVec, match_count: 5, match_threshold: 0.78,
      filter_patient: null
    });
    const similar = (matches ?? [])
      .filter((m) => m.source_id !== summary!.id)
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
