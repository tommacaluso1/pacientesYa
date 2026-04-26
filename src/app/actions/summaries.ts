"use server";

import { revalidatePath } from "next/cache";
import { generateClinicalDocument, type SummaryKind } from "@/lib/ai/summarization";
import { saveSummary } from "@/lib/domain/summaries";
import { requireUser } from "@/lib/supabase/server";

export async function generateAndSaveSummaryAction(args: { patient_id: string; encounter_id: string; kind: SummaryKind }) {
  const { supabase } = await requireUser();
  const { data: patient } = await supabase.from("patients").select("*").eq("id", args.patient_id).single();
  const { data: encounter } = await supabase.from("encounters").select("*").eq("id", args.encounter_id).single();
  const { data: vitals } = await supabase.from("vitals").select("*").eq("encounter_id", args.encounter_id).order("measured_at", { ascending: false }).limit(5);
  const { data: labs } = await supabase.from("labs").select("*").eq("encounter_id", args.encounter_id).order("observed_at", { ascending: false }).limit(20);
  const { data: entities } = await supabase.from("clinical_entities").select("*").eq("encounter_id", args.encounter_id);

  const patientCtx = [
    `${patient!.nombre} ${patient!.apellido}, ${patient!.edad ?? "?"} años`,
    patient!.antecedentes?.length ? `Antecedentes: ${patient!.antecedentes.join(", ")}` : "",
    patient!.alergias?.length ? `Alergias: ${patient!.alergias.join(", ")}` : "",
    patient!.medicacion_habitual?.length ? `Medicación habitual: ${patient!.medicacion_habitual.join(", ")}` : ""
  ].filter(Boolean).join("\n");

  const encCtx = [
    `Sector ${encounter!.sector ?? "—"}, cama ${encounter!.cama ?? "—"}, triage ${encounter!.triage}`,
    `Motivo: ${encounter!.motivo_consulta ?? "—"}`,
    `Dx presuntivo: ${encounter!.diagnostico_presuntivo ?? "—"}`,
    vitals?.length ? `Signos vitales recientes: ${vitals.map(v => `TA ${v.ta_sistolica}/${v.ta_diastolica} FC ${v.fc} Sat ${v.saturacion}%`).join("; ")}` : "",
    labs?.length  ? `Laboratorios: ${labs.map(l => `${l.analito} ${l.valor}${l.unidad ?? ""}`).join("; ")}` : "",
    entities?.length ? `Datos extraídos: ${entities.map(e => `${e.kind}=${e.label}${e.value ? `(${e.value})` : ""}`).join("; ")}` : ""
  ].filter(Boolean).join("\n");

  const content = await generateClinicalDocument({ kind: args.kind, patientContext: patientCtx, encounterContext: encCtx });
  const summary = await saveSummary({
    patient_id: args.patient_id,
    encounter_id: args.encounter_id,
    kind: args.kind,
    content
  });
  revalidatePath(`/pacientes/${args.patient_id}`);
  return summary;
}

export async function updateSummaryContentAction(id: string, content: string) {
  const { supabase } = await requireUser();
  await supabase.from("patient_summaries").update({ content }).eq("id", id);
  revalidatePath(`/pacientes`);
}
