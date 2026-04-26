import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/supabase/server";
import { fmtDateTime } from "@/lib/utils";
import type { Encounter, Patient, Vitals, ClinicalEntity } from "@/types/database";

export async function ResumenTab({ patient, encounter }: { patient: Patient; encounter: Encounter }) {
  const { supabase } = await requireUser();
  const [{ data: vitals }, { data: entities }] = await Promise.all([
    supabase.from("vitals").select("*").eq("encounter_id", encounter.id).order("measured_at", { ascending: false }).limit(1),
    supabase.from("clinical_entities").select("*").eq("encounter_id", encounter.id)
  ]);
  const v = (vitals?.[0] ?? null) as Vitals | null;
  const ents = (entities ?? []) as ClinicalEntity[];

  const grouped: Record<string, ClinicalEntity[]> = {};
  for (const e of ents) (grouped[e.kind] ??= []).push(e);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader><CardTitle className="text-base">Episodio actual</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <div><b>Ingreso:</b> {fmtDateTime(encounter.ingreso_at)}</div>
          <div><b>Motivo:</b> {encounter.motivo_consulta ?? "—"}</div>
          <div><b>Dx presuntivo:</b> {encounter.diagnostico_presuntivo ?? "—"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Antecedentes</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <div><b>Personales:</b> {patient.antecedentes?.join(", ") || "—"}</div>
          <div><b>Alergias:</b> {patient.alergias?.join(", ") || "—"}</div>
          <div><b>Medicación habitual:</b> {patient.medicacion_habitual?.join(", ") || "—"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Signos vitales (último registro)</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {v ? (
            <div className="grid grid-cols-3 gap-2">
              <Stat l="TA" v={v.ta_sistolica != null && v.ta_diastolica != null ? `${v.ta_sistolica}/${v.ta_diastolica}` : "—"} />
              <Stat l="FC" v={v.fc ?? "—"} />
              <Stat l="FR" v={v.fr ?? "—"} />
              <Stat l="Tº" v={v.temperatura ?? "—"} />
              <Stat l="SatO2" v={v.saturacion ? `${v.saturacion}%` : "—"} />
              <Stat l="HGT" v={v.glucemia ?? "—"} />
            </div>
          ) : <span className="text-muted-foreground">Sin signos vitales cargados.</span>}
        </CardContent>
      </Card>

      {Object.entries(grouped).map(([kind, items]) => (
        <Card key={kind}>
          <CardHeader><CardTitle className="text-base capitalize">{kind.replace("_", " ")}</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <ul className="list-disc pl-5 space-y-0.5">
              {items.map((e) => <li key={e.id}>{e.label}{e.value ? ` — ${e.value}` : ""}{e.unit ? e.unit : ""}</li>)}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Stat({ l, v }: { l: string; v: React.ReactNode }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <div className="text-xs text-muted-foreground">{l}</div>
      <div className="font-medium">{v}</div>
    </div>
  );
}
