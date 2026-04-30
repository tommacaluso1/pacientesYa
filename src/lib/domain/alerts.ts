import { requireUser } from "@/lib/supabase/server";
import type { Alert, AlertKind, AlertSeverity, Lab } from "@/types/database";

export async function listOpenAlerts() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("alerts").select("*").eq("acknowledged", false)
    .order("severity", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Alert[];
}

export async function acknowledgeAlert(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("alerts").update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

async function emit(encounter_id: string, kind: AlertKind, severity: AlertSeverity, message: string, related_id?: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("alerts").insert({
    encounter_id, owner_id: user.id, kind, severity, message, related_id: related_id ?? null
  });
}

// Evaluate the encounter's open alerts: overdue tasks + abnormal labs + missing critical fields.
export async function evaluateEncounter(encounterId: string) {
  const { supabase } = await requireUser();

  // overdue tasks. Severity is fixed at "warn" — task priority was removed from
  // the UI and we no longer rely on it for downstream signals.
  const nowIso = new Date().toISOString();
  const { data: overdue } = await supabase
    .from("tasks").select("id,title,due_at")
    .eq("encounter_id", encounterId).eq("status", "pendiente")
    .not("due_at", "is", null).lt("due_at", nowIso);
  for (const t of overdue ?? []) {
    await emit(encounterId, "tarea_vencida", "warn", `Tarea vencida: ${t.title}`, t.id);
  }

  // abnormal labs (most recent only)
  const { data: labs } = await supabase
    .from("labs").select("*").eq("encounter_id", encounterId)
    .order("observed_at", { ascending: false }).limit(50);
  for (const l of (labs ?? []) as Lab[]) {
    if (l.valor == null) continue;
    if (l.ref_max != null && l.valor > l.ref_max)
      await emit(encounterId, "laboratorio_anormal", "warn", `${l.analito} alto: ${l.valor}${l.unidad ?? ""}`, l.id);
    if (l.ref_min != null && l.valor < l.ref_min)
      await emit(encounterId, "laboratorio_anormal", "warn", `${l.analito} bajo: ${l.valor}${l.unidad ?? ""}`, l.id);
  }

  // missing critical data: no vitals in this encounter
  const { count: vitalsCount } = await supabase
    .from("vitals").select("id", { count: "exact", head: true }).eq("encounter_id", encounterId);
  if ((vitalsCount ?? 0) === 0) {
    await emit(encounterId, "dato_critico_faltante", "info", "Sin signos vitales registrados.");
  }
}
