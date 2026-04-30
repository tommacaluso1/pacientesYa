import { requireUser } from "@/lib/supabase/server";
import { taskCreateSchema, taskUpdateSchema, type TaskCreate, type TaskUpdate } from "@/lib/validation/schemas";
import type { Task } from "@/types/database";

export async function listTasksForPatient(patientId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("tasks").select("*").eq("patient_id", patientId)
    .order("status", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function listTasksForEncounter(encounterId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("tasks").select("*").eq("encounter_id", encounterId)
    .order("status", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function createTask(input: TaskCreate) {
  const data = taskCreateSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      encounter_id: data.encounter_id,
      patient_id: data.patient_id,
      owner_id: user.id,
      title: data.title,
      detail: data.detail || null,
      due_at: data.due_at ?? null
    })
    .select("*").single();
  if (error) throw error;
  return task as Task;
}

export async function updateTask(taskId: string, patch: TaskUpdate) {
  const data = taskUpdateSchema.parse(patch);
  const { supabase } = await requireUser();
  const update: Record<string, unknown> = { ...data };
  if (data.status === "completada") update.completed_at = new Date().toISOString();
  const { data: task, error } = await supabase
    .from("tasks").update(update).eq("id", taskId).select("*").single();
  if (error) throw error;
  return task as Task;
}
