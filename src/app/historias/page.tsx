import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { fmtDateTime } from "@/lib/utils";
import type { PatientSummary } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function HistoriasPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("patient_summaries").select("*, patients(id,nombre,apellido)")
    .order("created_at", { ascending: false }).limit(100);
  const list = (data ?? []) as unknown as Array<PatientSummary & { patients: { id: string; nombre: string; apellido: string } }>;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Historias</h1>
      {list.length === 0 && <p className="text-muted-foreground">Sin historias guardadas todavía.</p>}
      {list.map((s) => (
        <Link key={s.id} href={`/pacientes/${s.patient_id}`}>
          <Card className="active:scale-[0.99]">
            <CardContent className="p-3">
              <div className="flex items-baseline justify-between">
                <div className="font-medium truncate">{s.patients.apellido}, {s.patients.nombre}</div>
                <div className="text-xs text-muted-foreground">{fmtDateTime(s.created_at)}</div>
              </div>
              <div className="text-xs text-muted-foreground capitalize">{s.kind.replace("_", " ")}</div>
              <p className="text-sm mt-1 line-clamp-3 whitespace-pre-wrap">{s.content}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
