import { redirect } from "next/navigation";
import { getPatient } from "@/lib/domain/patients";
import { TriageBadge } from "@/components/patients/TriageBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ResumenTab } from "@/components/patient-detail/ResumenTab";
import { EvolucionTab } from "@/components/patient-detail/EvolucionTab";
import { TareasTab } from "@/components/patient-detail/TareasTab";
import { SignosVitalesTab } from "@/components/patient-detail/SignosVitalesTab";
import { EstudiosTab } from "@/components/patient-detail/EstudiosTab";
import { DocumentosTab } from "@/components/patient-detail/DocumentosTab";
import { SugerenciasTab } from "@/components/patient-detail/SugerenciasTab";
import { daysOfStay } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PatientDetail({ params }: { params: { id: string } }) {
  const { patient, encounters } = await getPatient(params.id);
  const active = encounters.find((e) => e.estado === "activo") ?? encounters[0];
  if (!active) redirect("/");
  const dia = daysOfStay(active.ingreso_at);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold truncate">{patient.apellido}, {patient.nombre}</h1>
                <TriageBadge value={active.triage} />
                {dia != null && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    día {dia} de internación
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {patient.edad ?? "—"}a · {patient.sexo} · {patient.documento ?? "DNI s/d"}
              </div>
              <div className="text-sm mt-1">
                {active.sector ?? "—"} · {active.cama ?? "—"} · {active.motivo_consulta ?? "Sin motivo cargado"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="resumen">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="evolucion">Evolución</TabsTrigger>
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
          <TabsTrigger value="vitales">Signos Vitales</TabsTrigger>
          <TabsTrigger value="estudios">Estudios</TabsTrigger>
          <TabsTrigger value="documentos">Docs</TabsTrigger>
          <TabsTrigger value="sugerencias">Sugerencias</TabsTrigger>
        </TabsList>
        <TabsContent value="resumen"><ResumenTab patient={patient} encounter={active} /></TabsContent>
        <TabsContent value="evolucion"><EvolucionTab patient={patient} encounter={active} /></TabsContent>
        <TabsContent value="tareas"><TareasTab encounterId={active.id} patientId={patient.id} /></TabsContent>
        <TabsContent value="vitales"><SignosVitalesTab encounterId={active.id} /></TabsContent>
        <TabsContent value="estudios"><EstudiosTab encounterId={active.id} /></TabsContent>
        <TabsContent value="documentos"><DocumentosTab patientId={patient.id} encounterId={active.id} /></TabsContent>
        <TabsContent value="sugerencias"><SugerenciasTab encounterId={active.id} /></TabsContent>
      </Tabs>
    </div>
  );
}
