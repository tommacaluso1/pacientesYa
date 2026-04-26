import Link from "next/link";
import { listActivePatients } from "@/lib/domain/patients";
import { PatientCard } from "@/components/patients/PatientCard";
import { Button } from "@/components/ui/button";
import { Plus, Stethoscope } from "lucide-react";
import { triageWeight } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const patients = await listActivePatients();
  patients.sort((a, b) => {
    const ta = triageWeight(a.active_encounter?.triage ?? "verde");
    const tb = triageWeight(b.active_encounter?.triage ?? "verde");
    if (ta !== tb) return ta - tb;
    if (a.pending_tasks !== b.pending_tasks) return b.pending_tasks - a.pending_tasks;
    return new Date(b.active_encounter?.ingreso_at ?? 0).getTime() - new Date(a.active_encounter?.ingreso_at ?? 0).getTime();
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Guardia</h1>
          <p className="text-sm text-muted-foreground">{patients.length} paciente{patients.length === 1 ? "" : "s"} activo{patients.length === 1 ? "" : "s"}</p>
        </div>
        <Link href="/pacientes/nuevo">
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" /> Nuevo
          </Button>
        </Link>
      </div>

      {patients.length === 0 ? (
        <div className="border border-dashed rounded-lg p-10 text-center text-muted-foreground">
          <Stethoscope className="mx-auto h-10 w-10 mb-2" />
          <p>Sin pacientes activos. Cargá uno nuevo para empezar.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {patients.map((p) => (
            <li key={p.id}><PatientCard p={p} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}
