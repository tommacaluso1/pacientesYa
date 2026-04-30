import { requireUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/utils";
import type { Lab } from "@/types/database";

export async function EstudiosTab({ encounterId }: { encounterId: string }) {
  const { supabase } = await requireUser();
  const { data: labs } = await supabase
    .from("labs").select("*").eq("encounter_id", encounterId)
    .order("observed_at", { ascending: false });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Laboratorio</CardTitle></CardHeader>
        <CardContent>
          {(labs?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Sin laboratorios cargados.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {(labs as Lab[]).map((l) => {
                const isHigh = l.ref_max != null && l.valor != null && l.valor > l.ref_max;
                const isLow  = l.ref_min != null && l.valor != null && l.valor < l.ref_min;
                return (
                  <li key={l.id} className="flex items-center gap-2 border-b py-1">
                    <span className="flex-1 truncate">{l.analito}</span>
                    <span className="font-medium">{l.valor}{l.unidad ?? ""}</span>
                    {(isHigh || isLow) && <Badge variant="warn">{isHigh ? "Alto" : "Bajo"}</Badge>}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(l.observed_at)}</span>
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
