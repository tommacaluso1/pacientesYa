"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { vitalsSchema } from "@/lib/validation/schemas";

export async function recordVitalsAction(formData: FormData) {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const cleaned: Record<string, unknown> = { encounter_id: raw.encounter_id };
  for (const k of ["ta_sistolica","ta_diastolica","fc","fr","temperatura","saturacion","glucemia","glasgow","dolor_eva"]) {
    if (raw[k] != null && raw[k] !== "") cleaned[k] = raw[k];
  }
  if (raw.notas) cleaned.notas = raw.notas;

  const parsed = vitalsSchema.safeParse(cleaned);
  if (!parsed.success) return { ok: false as const, errors: parsed.error.flatten().fieldErrors };

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("vitals").insert({ ...parsed.data, owner_id: user.id });
  if (error) return { ok: false as const, errors: { _: [error.message] } };
  revalidatePath(`/pacientes`);
  return { ok: true as const };
}
