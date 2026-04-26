"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPatientWithEncounter, dischargeEncounter, updateEncounterTriage } from "@/lib/domain/patients";
import { patientFastCreateSchema } from "@/lib/validation/schemas";
import type { TriageColor } from "@/types/database";

export async function createPatientAction(formData: FormData) {
  const parsed = patientFastCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  }
  const { patient } = await createPatientWithEncounter(parsed.data);
  revalidatePath("/");
  redirect(`/pacientes/${patient.id}`);
}

export async function setTriageAction(encounterId: string, triage: TriageColor) {
  await updateEncounterTriage(encounterId, triage);
  revalidatePath("/");
  revalidatePath(`/pacientes`);
}

export async function dischargeAction(encounterId: string, patientId: string) {
  await dischargeEncounter(encounterId);
  revalidatePath("/");
  revalidatePath(`/pacientes/${patientId}`);
}
