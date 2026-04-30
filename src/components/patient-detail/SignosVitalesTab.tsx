import { requireUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDateTime } from "@/lib/utils";
import type { Vitals } from "@/types/database";
import { VitalsForm } from "./VitalsForm";

export async function SignosVitalesTab({ encounterId }: { encounterId: string }) {
  const { supabase } = await requireUser();
  const { data: vitals } = await supabase
    .from("vitals").select("*").eq("encounter_id", encounterId)
    .order("measured_at", { ascending: false });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Cargar signos vitales</CardTitle></CardHeader>
        <CardContent><VitalsForm encounterId={encounterId} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
        <CardContent>
          {(vitals?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Sin registros.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {(vitals as Vitals[]).map((v) => (
                <li key={v.id} className="flex justify-between border-b py-1 gap-2">
                  <span className="truncate">
                    TA {v.ta_sistolica ?? "—"}/{v.ta_diastolica ?? "—"} ·
                    FC {v.fc ?? "—"} · FR {v.fr ?? "—"} ·
                    Sat {v.saturacion ?? "—"}% · Tº {v.temperatura ?? "—"} ·
                    Glucemia {v.glucemia ?? "—"} ·
                    Glasgow {v.glasgow ?? "—"}
                  </span>
                  <span className="text-muted-foreground whitespace-nowrap">{fmtDateTime(v.measured_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
