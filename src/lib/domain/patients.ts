import { requireUser } from "@/lib/supabase/server";
import { patientFastCreateSchema, type PatientFastCreate } from "@/lib/validation/schemas";
import type { Encounter, Patient, TriageColor } from "@/types/database";

export type PatientWithEncounter = Patient & { active_encounter: Encounter | null; pending_tasks: number };

export async function listActivePatients(): Promise<PatientWithEncounter[]> {
  const { supabase } = await requireUser();
  const { data: encounters, error: e1 } = await supabase
    .from("encounters")
    .select("*, patients(*)")
    .eq("estado", "activo")
    .order("triage", { ascending: true })
    .order("ingreso_at", { ascending: false });
  if (e1) throw e1;

  const encList = (encounters ?? []) as unknown as Array<Encounter & { patients: Patient }>;
  if (encList.length === 0) return [];

  const encIds = encList.map((e) => e.id);
  const { data: tasks } = await supabase
    .from("tasks")
    .select("encounter_id, status")
    .in("encounter_id", encIds)
    .eq("status", "pendiente");
  const pendingByEnc = new Map<string, number>();
  for (const t of tasks ?? []) {
    pendingByEnc.set(t.encounter_id!, (pendingByEnc.get(t.encounter_id!) ?? 0) + 1);
  }

  return encList.map((e) => ({
    ...e.patients,
    active_encounter: { ...e, patients: undefined } as unknown as Encounter,
    pending_tasks: pendingByEnc.get(e.id) ?? 0
  }));
}

export async function getPatient(patientId: string) {
  const { supabase } = await requireUser();
  const { data: patient, error: ep } = await supabase
    .from("patients").select("*").eq("id", patientId).single();
  if (ep) throw ep;
  const { data: encounters, error: ee } = await supabase
    .from("encounters").select("*").eq("patient_id", patientId)
    .order("ingreso_at", { ascending: false });
  if (ee) throw ee;
  return { patient: patient as Patient, encounters: (encounters ?? []) as Encounter[] };
}

export async function createPatientWithEncounter(input: PatientFastCreate) {
  const data = patientFastCreateSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { data: patient, error: pErr } = await supabase
    .from("patients")
    .insert({
      owner_id: user.id,
      nombre: data.nombre,
      apellido: data.apellido,
      documento: data.documento || null,
      edad: data.edad ?? null,
      sexo: data.sexo
    })
    .select("*").single();
  if (pErr) throw pErr;

  const { data: encounter, error: eErr } = await supabase
    .from("encounters")
    .insert({
      patient_id: patient!.id,
      owner_id: user.id,
      sector: data.sector || null,
      cama: data.cama || null,
      triage: (data.triage ?? "verde") as TriageColor,
      ingreso_at: data.ingreso_at ?? new Date().toISOString(),
      motivo_consulta: data.motivo_consulta || null,
      diagnostico_presuntivo: data.diagnostico_presuntivo || null
    })
    .select("*").single();
  if (eErr) throw eErr;

  return { patient: patient as Patient, encounter: encounter as Encounter };
}

export async function updateEncounterTriage(encounterId: string, triage: TriageColor) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("encounters").update({ triage }).eq("id", encounterId);
  if (error) throw error;
}

export async function dischargeEncounter(encounterId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("encounters")
    .update({ estado: "alta", egreso_at: new Date().toISOString() })
    .eq("id", encounterId);
  if (error) throw error;
}
