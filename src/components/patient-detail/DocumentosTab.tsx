import { requireUser } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentUploader } from "./DocumentUploader";
import { DocumentList } from "./DocumentList";
import type { DocumentRow } from "@/types/database";

export async function DocumentosTab({ patientId, encounterId }: { patientId: string; encounterId: string }) {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("documents").select("*").eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader><CardTitle className="text-base">Subir documento (ECG / lab / imagen)</CardTitle></CardHeader>
        <CardContent><DocumentUploader patientId={patientId} encounterId={encounterId} /></CardContent>
      </Card>
      <DocumentList docs={(data ?? []) as DocumentRow[]} />
    </div>
  );
}
