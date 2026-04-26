import Link from "next/link";
import { listOpenAlerts } from "@/lib/domain/alerts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/utils";
import { AckButton } from "@/components/alerts/AckButton";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AlertasPage() {
  const alerts = await listOpenAlerts();
  const { supabase } = await requireUser();
  const encIds = Array.from(new Set(alerts.map((a) => a.encounter_id)));
  const encs = encIds.length
    ? (await supabase.from("encounters").select("id,patient_id,patients(nombre,apellido)").in("id", encIds)).data ?? []
    : [];
  const byEnc = new Map(encs.map((e: { id: string; patient_id: string; patients?: { nombre: string; apellido: string } | null }) => [e.id, e]));

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Alertas abiertas</h1>
      {alerts.length === 0 && <p className="text-muted-foreground">Nada urgente.</p>}
      {alerts.map((a) => {
        const enc = byEnc.get(a.encounter_id);
        return (
          <Card key={a.id}>
            <CardContent className="p-3 flex items-start gap-3">
              <Badge variant={a.severity === "critico" ? "critico" : a.severity === "warn" ? "warn" : "info"}>
                {a.severity}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{a.message}</div>
                <div className="text-xs text-muted-foreground">{fmtDateTime(a.created_at)} · {a.kind}</div>
                {enc && (
                  <Link href={`/pacientes/${enc.patient_id}`} className="text-xs underline text-muted-foreground">
                    {enc.patients?.apellido}, {enc.patients?.nombre}
                  </Link>
                )}
              </div>
              <AckButton id={a.id} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
