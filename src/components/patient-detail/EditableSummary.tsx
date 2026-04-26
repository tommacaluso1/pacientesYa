"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateSummaryContentAction } from "@/app/actions/summaries";
import { toast } from "sonner";
import { Copy, Save } from "lucide-react";

export function EditableSummary({ id, initial }: { id: string; initial: string }) {
  const [text, setText] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const dirty = text !== initial;

  return (
    <div className="space-y-2">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={Math.max(6, text.split("\n").length + 1)} />
      <div className="flex gap-2">
        <Button
          size="sm" variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            toast.success("Copiado al portapapeles");
          }}
          className="gap-1"
        >
          <Copy className="h-4 w-4" /> Copiar
        </Button>
        <Button
          size="sm" disabled={!dirty || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await updateSummaryContentAction(id, text);
              toast.success("Guardado");
            } catch (e) {
              toast.error("Error al guardar");
            } finally { setBusy(false); }
          }}
          className="gap-1"
        >
          <Save className="h-4 w-4" /> Guardar
        </Button>
      </div>
    </div>
  );
}
