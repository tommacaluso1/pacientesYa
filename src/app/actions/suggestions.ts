"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export async function decideSuggestionAction(id: string, accepted: boolean) {
  const { supabase } = await requireUser();
  await supabase
    .from("clinical_suggestions")
    .update({ accepted, accepted_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(`/pacientes`);
}
