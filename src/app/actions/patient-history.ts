"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

const stringList = z.array(z.string().trim().min(1).max(120)).max(60);

const patchSchema = z.object({
  antecedentes: stringList.optional(),
  alergias: stringList.optional(),
  medicacion_habitual: stringList.optional()
});

export async function updatePatientHistoryAction(
  patientId: string,
  patch: { antecedentes?: string[]; alergias?: string[]; medicacion_habitual?: string[] }
) {
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false as const, errors: parsed.error.flatten().fieldErrors };

  const { supabase } = await requireUser();
  // RLS guarantees we can only update OUR patient. The id filter is defense in depth.
  const { error } = await supabase
    .from("patients")
    .update(parsed.data)
    .eq("id", patientId);

  if (error) return { ok: false as const, errors: { _: [error.message] } };
  revalidatePath(`/pacientes/${patientId}`);
  return { ok: true as const };
}
