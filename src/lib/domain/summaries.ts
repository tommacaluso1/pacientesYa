import { requireUser } from "@/lib/supabase/server";
import type { PatientSummary } from "@/types/database";
import { embed } from "@/lib/ai/embeddings";

export async function listSummaries(patientId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("patient_summaries").select("*").eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PatientSummary[];
}

export async function saveSummary(args: {
  patient_id: string;
  encounter_id?: string | null;
  kind?: PatientSummary["kind"];
  content: string;
  metadata?: Record<string, unknown>;
}) {
  const { supabase, user } = await requireUser();
  const { data: summary, error } = await supabase
    .from("patient_summaries")
    .insert({
      patient_id: args.patient_id,
      encounter_id: args.encounter_id ?? null,
      owner_id: user.id,
      kind: args.kind ?? "evolucion",
      content: args.content,
      metadata: args.metadata ?? {}
    })
    .select("*").single();
  if (error) throw error;

  // best-effort embedding: don't block save if embeddings fail
  try {
    const vec = await embed(args.content);
    await supabase.from("embeddings").insert({
      owner_id: user.id,
      source_kind: "summary",
      source_id: summary!.id,
      patient_id: args.patient_id,
      content: args.content.slice(0, 4000),
      embedding: vec,
      metadata: { kind: summary!.kind }
    });
  } catch (e) {
    // intentional: AI optional
  }

  return summary as PatientSummary;
}
