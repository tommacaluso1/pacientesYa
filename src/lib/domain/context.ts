// Single source of truth for "what does this patient look like, right now?"
//
// Both the AI pipeline and the on-demand summary generator (Generar evolución
// / historia) need to assemble the same context. Doing it twice is how drift
// happens — and drift is how data from one patient ends up in another's
// document. This module is the ONLY place that builds patient context.
//
// Every query is filtered by patient_id and/or encounter_id. RLS already
// enforces owner_id at the database; the JS-side filters are belt-and-
// suspenders + make the intent explicit at the call site.

import { requireUser } from "@/lib/supabase/server";
import { daysOfStay } from "@/lib/utils";
import type {
  ClinicalEntity, Encounter, Lab, Patient, Transcript, Vitals
} from "@/types/database";

export type PatientContext = {
  patient: Patient;
  encounter: Encounter;
  vitals: Vitals[];        // up to 5 most recent
  labs: Lab[];             // up to 20 most recent
  entities: ClinicalEntity[];
  transcripts: Transcript[]; // most recent first
  diaInternacion: number | null;
};

export async function buildPatientContext(
  patientId: string,
  encounterId: string
): Promise<PatientContext> {
  const { supabase } = await requireUser();

  const [
    { data: patient, error: pErr },
    { data: encounter, error: eErr }
  ] = await Promise.all([
    supabase.from("patients").select("*").eq("id", patientId).single(),
    supabase.from("encounters").select("*").eq("id", encounterId).single()
  ]);
  if (pErr || !patient) throw pErr ?? new Error("patient not found");
  if (eErr || !encounter) throw eErr ?? new Error("encounter not found");

  // Critical invariant: the encounter we were handed must belong to this
  // patient. If it doesn't, something upstream got the IDs crossed — refuse to
  // continue rather than build a Frankenstein context.
  if (encounter.patient_id !== patient.id) {
    throw new Error(
      `[buildPatientContext] encounter ${encounterId} belongs to patient ${encounter.patient_id}, not ${patientId}`
    );
  }

  // All encounter-scoped queries are filtered by THIS encounter's id only.
  const [
    { data: vitals },
    { data: labs },
    { data: entities },
    { data: transcripts }
  ] = await Promise.all([
    supabase.from("vitals").select("*").eq("encounter_id", encounterId)
      .order("measured_at", { ascending: false }).limit(5),
    supabase.from("labs").select("*").eq("encounter_id", encounterId)
      .order("observed_at", { ascending: false }).limit(20),
    supabase.from("clinical_entities").select("*").eq("encounter_id", encounterId),
    // Transcripts join through consultations to the encounter.
    supabase.from("transcripts")
      .select("*, consultations!inner(encounter_id)")
      .eq("consultations.encounter_id", encounterId)
      .order("created_at", { ascending: false })
      .limit(5)
  ]);

  return {
    patient: patient as Patient,
    encounter: encounter as Encounter,
    vitals: (vitals ?? []) as Vitals[],
    labs: (labs ?? []) as Lab[],
    entities: (entities ?? []) as ClinicalEntity[],
    transcripts: (transcripts ?? []) as Transcript[],
    diaInternacion: daysOfStay(encounter.ingreso_at)
  };
}

// Two-block string format for prompting the LLM. Patient-level data (stable
// across the whole stay) is separated from encounter-level data (this episode)
// so the model can reason about each cleanly.
export function formatPatientContext(ctx: PatientContext): {
  patientText: string;
  encounterText: string;
} {
  const { patient: p, encounter: e, vitals, labs, entities, transcripts, diaInternacion } = ctx;

  const patientText = [
    `${p.nombre} ${p.apellido}, ${p.edad ?? "?"} años, sexo ${p.sexo}`,
    p.documento ? `DNI ${p.documento}` : "",
    p.antecedentes?.length ? `Antecedentes: ${p.antecedentes.join(", ")}` : "",
    p.alergias?.length ? `Alergias: ${p.alergias.join(", ")}` : "",
    p.medicacion_habitual?.length ? `Medicación habitual: ${p.medicacion_habitual.join(", ")}` : ""
  ].filter(Boolean).join("\n");

  const vitalsLine = vitals.length
    ? `Signos vitales recientes: ${vitals.map((v) =>
        `[${v.measured_at.slice(0, 16).replace("T", " ")}] ` +
        `TA ${v.ta_sistolica ?? "—"}/${v.ta_diastolica ?? "—"} ` +
        `FC ${v.fc ?? "—"} FR ${v.fr ?? "—"} ` +
        `Tº ${v.temperatura ?? "—"} SatO2 ${v.saturacion ?? "—"}% ` +
        `Glucemia ${v.glucemia ?? "—"} ` +
        // glasgow may not exist on legacy rows; render only when present
        ((v as Vitals & { glasgow?: number | null }).glasgow != null
          ? `Glasgow ${(v as Vitals & { glasgow?: number | null }).glasgow}`
          : "")
      ).join(" | ")}`
    : "";

  const labsLine = labs.length
    ? `Laboratorios: ${labs.map((l) => `${l.analito} ${l.valor}${l.unidad ?? ""}`).join("; ")}`
    : "";

  const entitiesLine = entities.length
    ? `Datos extraídos: ${entities.map((x) => `${x.kind}=${x.label}${x.value ? `(${x.value})` : ""}`).join("; ")}`
    : "";

  // Most recent transcript only — older ones live in patient_summaries via
  // pgvector if relevant. Prepending older transcripts inline blows past the
  // context window without adding clinical value.
  const transcriptLine = transcripts[0]?.cleaned_text
    ? `Transcripción de la última consulta:\n${transcripts[0].cleaned_text.slice(0, 4000)}`
    : "";

  const encounterText = [
    diaInternacion != null
      ? `Día de internación: ${diaInternacion === 0 ? "ingreso (día 0)" : `día ${diaInternacion}`}`
      : "",
    `Sector ${e.sector ?? "—"}, cama ${e.cama ?? "—"}, triage ${e.triage}`,
    `Motivo: ${e.motivo_consulta ?? "—"}`,
    `Dx presuntivo: ${e.diagnostico_presuntivo ?? "—"}`,
    vitalsLine,
    labsLine,
    entitiesLine,
    transcriptLine
  ].filter(Boolean).join("\n");

  return { patientText, encounterText };
}
