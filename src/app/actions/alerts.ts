"use server";

import { revalidatePath } from "next/cache";
import { acknowledgeAlert, evaluateEncounter } from "@/lib/domain/alerts";

export async function acknowledgeAlertAction(id: string) {
  await acknowledgeAlert(id);
  revalidatePath("/alertas");
}

export async function evaluateEncounterAlertsAction(encounterId: string) {
  await evaluateEncounter(encounterId);
  revalidatePath("/alertas");
  revalidatePath(`/pacientes`);
}
