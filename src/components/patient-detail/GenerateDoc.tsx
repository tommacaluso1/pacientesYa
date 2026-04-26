"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { generateAndSaveSummaryAction } from "@/app/actions/summaries";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";

export function GenerateDoc({ patientId, encounterId, kind, label }: {
  patientId: string; encounterId: string;
  kind: "historia_clinica" | "evolucion" | "egreso"; label: string;
}) {
  const [busy, setBusy] = React.useState(false);
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        setBusy(true);
        try {
          await generateAndSaveSummaryAction({ patient_id: patientId, encounter_id: encounterId, kind });
          toast.success("Documento generado");
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Error generando");
        } finally { setBusy(false); }
      }}
      disabled={busy}
      className="gap-2"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {label}
    </Button>
  );
}
