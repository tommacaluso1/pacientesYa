"use server";

import { revalidatePath } from "next/cache";
import { createTask, updateTask } from "@/lib/domain/tasks";
import { taskCreateSchema, taskUpdateSchema } from "@/lib/validation/schemas";

export async function createTaskAction(formData: FormData) {
  const parsed = taskCreateSchema.safeParse({
    encounter_id: formData.get("encounter_id"),
    title: formData.get("title"),
    detail: formData.get("detail") || undefined,
    priority: formData.get("priority") || "media",
    due_at: formData.get("due_at") || undefined
  });
  if (!parsed.success) return { ok: false as const, errors: parsed.error.flatten().fieldErrors };
  const task = await createTask(parsed.data);
  revalidatePath(`/pacientes`);
  return { ok: true as const, task };
}

export async function toggleTaskAction(taskId: string, status: "pendiente" | "completada") {
  await updateTask(taskId, taskUpdateSchema.parse({ status }));
  revalidatePath(`/pacientes`);
}
