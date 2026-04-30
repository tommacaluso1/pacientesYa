"use server";

import { revalidatePath } from "next/cache";
import { generateClinicalDocument, type SummaryKind } from "@/lib/ai/summarization";
import { saveSummary } from "@/lib/domain/summaries";
import { buildPatientContext, formatPatientContext } from "@/lib/domain/context";
import { requireUser } from "@/lib/supabase/server";

export async function generateAndSaveSummaryAction(args: {
  patient_id: string;
  encounter_id: string;
  kind: SummaryKind
}) {
  const ctx = await buildPatientContext(args.patient_id, args.encounter_id);
  const { patientText, encounterText } = formatPatientContext(ctx);

  const content = await generateClinicalDocument({
    kind: args.kind,
    patientContext: patientText,
    encounterContext: encounterText
  });

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
