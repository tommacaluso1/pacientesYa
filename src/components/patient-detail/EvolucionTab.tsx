import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioRecorder } from "@/components/audio/AudioRecorder";
import { listSummaries } from "@/lib/domain/summaries";
import { fmtDateTime } from "@/lib/utils";
import type { Encounter, Patient } from "@/types/database";
import { GenerateDoc } from "./GenerateDoc";
import { EditableSummary } from "./EditableSummary";

export async function EvolucionTab({ patient, encounter }: { patient: Patient; encounter: Encounter }) {
  const summaries = await listSummaries(patient.id);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Grabar consulta</CardTitle></CardHeader>
        <CardContent><AudioRecorder encounterId={encounter.id} /></CardContent>
      </Card>

      <div className="grid gap-2 md:grid-cols-2">
        <GenerateDoc patientId={patient.id} encounterId={encounter.id} kind="evolucion" label="Generar evolución" />
        <GenerateDoc patientId={patient.id} encounterId={encounter.id} kind="historia_clinica" label="Generar historia clínica" />
      </div>

      <div className="space-y-2">
        {summaries.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-6">
            Sin evoluciones cargadas todavía.
          </div>
        )}
        {summaries.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-sm flex justify-between items-center">
                <span className="capitalize">{s.kind.replace("_", " ")}</span>
                <span className="font-normal text-muted-foreground">{fmtDateTime(s.created_at)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent><EditableSummary id={s.id} initial={s.content} /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
