import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { TriageBadge } from "./TriageBadge";
import { daysOfStay, timeAgo } from "@/lib/utils";
import type { PatientWithEncounter } from "@/lib/domain/patients";
import { CheckCircle2, ListTodo } from "lucide-react";

export function PatientCard({ p }: { p: PatientWithEncounter }) {
  const enc = p.active_encounter;
  const dia = daysOfStay(enc?.ingreso_at);
  return (
    <Link href={`/pacientes/${p.id}`}>
      <Card className="active:scale-[0.99] transition-transform">
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{p.apellido}, {p.nombre}</span>
              {enc && <TriageBadge value={enc.triage} />}
              {dia != null && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  día {dia}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {p.edad ? `${p.edad}a` : "—"} · {enc?.sector ?? "—"} {enc?.cama ? `· ${enc.cama}` : ""}
            </div>
            {enc?.diagnostico_presuntivo && (
              <div className="text-sm mt-1 truncate">{enc.diagnostico_presuntivo}</div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
            <span>{timeAgo(enc?.ingreso_at)}</span>
            <span className="inline-flex items-center gap-1">
              {p.pending_tasks > 0
                ? <><ListTodo className="h-3.5 w-3.5" /> {p.pending_tasks}</>
                : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
