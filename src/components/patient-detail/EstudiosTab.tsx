import { requireUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Lab, Vitals } from "@/types/database";
import { VitalsForm } from "./VitalsForm";

export async function EstudiosTab({ encounterId }: { encounterId: string }) {
  const { supabase } = await requireUser();
  const [{ data: vitals }, { data: labs }] = await Promise.all([
    supabase.from("vitals").select("*").eq("encounter_id", encounterId).order("measured_at", { ascending: false }),
    supabase.from("labs").select("*").eq("encounter_id", encounterId).order("observed_at", { ascending: false })
  ]);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Cargar signos vitales</CardTitle></CardHeader>
        <CardContent><VitalsForm encounterId={encounterId} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de signos vitales</CardTitle></CardHeader>
        <CardContent>
          {(vitals?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">Sin registros.</p> : (
            <ul className="text-sm space-y-1">
              {(vitals as Vitals[]).map((v) => (
                <li key={v.id} className="flex justify-between border-b py-1">
                  <span>
                    TA {v.ta_sistolica ?? "—"}/{v.ta_diastolica ?? "—"} ·
                    FC {v.fc ?? "—"} · Sat {v.saturacion ?? "—"}% · Tº {v.temperatura ?? "—"}
                  </span>
                  <span className="text-muted-foreground">{fmtDateTime(v.measured_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Laboratorio</CardTitle></CardHeader>
        <CardContent>
          {(labs?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">Sin laboratorios cargados.</p> : (
            <ul className="text-sm space-y-1">
              {(labs as Lab[]).map((l) => {
                const isHigh = l.ref_max != null && l.valor != null && l.valor > l.ref_max;
                const isLow  = l.ref_min != null && l.valor != null && l.valor < l.ref_min;
                return (
                  <li key={l.id} className="flex items-center gap-2 border-b py-1">
                    <span className="flex-1 truncate">{l.analito}</span>
                    <span className="font-medium">{l.valor}{l.unidad ?? ""}</span>
                    {(isHigh || isLow) && <Badge variant="warn">{isHigh ? "Alto" : "Bajo"}</Badge>}
                    <span className="text-xs text-muted-foreground">{fmtDateTime(l.observed_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
