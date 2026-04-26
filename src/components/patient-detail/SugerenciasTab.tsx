import { requireUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ClinicalSuggestion } from "@/types/database";
import { SuggestionActions } from "./SuggestionActions";
import { fmtDateTime } from "@/lib/utils";

export async function SugerenciasTab({ encounterId }: { encounterId: string }) {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("clinical_suggestions").select("*").eq("encounter_id", encounterId)
    .order("created_at", { ascending: false });
  const list = (data ?? []) as ClinicalSuggestion[];
  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-amber-50 dark:bg-amber-950 p-3 text-sm">
        Estas son <b>sugerencias</b>, no indicaciones. La decisión clínica es del médico.
      </div>
      {list.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin sugerencias todavía. Generá una consulta para activarlas.</p>}
      {list.map((s) => (
        <Card key={s.id}>
          <CardHeader>
            <CardTitle className="text-base flex items-start justify-between gap-2">
              <span>{s.title}</span>
              <Badge variant="outline">{s.kind.replace("_", " ")}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="whitespace-pre-wrap">{s.reasoning}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>confianza: {(s.confidence * 100).toFixed(0)}%</span>
              <span>·</span>
              <span>{fmtDateTime(s.created_at)}</span>
            </div>
            <SuggestionActions id={s.id} accepted={s.accepted} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
