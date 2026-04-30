"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updatePatientHistoryAction } from "@/app/actions/patient-history";

type ListKey = "antecedentes" | "alergias" | "medicacion_habitual";

const LABELS: Record<ListKey, { title: string; placeholder: string }> = {
  antecedentes:        { title: "Antecedentes personales", placeholder: "Ej: HTA, DBT2, IAM previo" },
  alergias:            { title: "Alergias",                 placeholder: "Ej: Penicilina" },
  medicacion_habitual: { title: "Medicación habitual",      placeholder: "Ej: Enalapril 10mg/día" }
};

export function AntecedentesEditor({
  patientId,
  initial
}: {
  patientId: string;
  initial: { antecedentes: string[]; alergias: string[]; medicacion_habitual: string[] };
}) {
  return (
    <div className="space-y-4">
      {(Object.keys(LABELS) as ListKey[]).map((k) => (
        <ChipList
          key={k}
          patientId={patientId}
          field={k}
          title={LABELS[k].title}
          placeholder={LABELS[k].placeholder}
          initial={initial[k] ?? []}
        />
      ))}
    </div>
  );
}

function ChipList({
  patientId, field, title, placeholder, initial
}: {
  patientId: string;
  field: ListKey;
  title: string;
  placeholder: string;
  initial: string[];
}) {
  const [items, setItems] = React.useState<string[]>(initial);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // The list rendered in the UI is always our local state. Syncing on
  // `initial` change handles the case where the server-rendered patient
  // re-flows through props after another tab edits the same record.
  React.useEffect(() => { setItems(initial); }, [initial]);

  async function persist(next: string[]) {
    setBusy(true);
    const prev = items;
    setItems(next); // optimistic
    const res = await updatePatientHistoryAction(patientId, { [field]: next });
    setBusy(false);
    if (!res.ok) {
      setItems(prev);
      toast.error("No se pudo guardar");
      return false;
    }
    return true;
  }

  async function add() {
    const v = draft.trim();
    if (!v) return;
    if (items.some((x) => x.toLowerCase() === v.toLowerCase())) {
      toast.message("Ya está en la lista");
      setDraft("");
      return;
    }
    const ok = await persist([...items, v]);
    if (ok) setDraft("");
  }

  async function remove(idx: number) {
    await persist(items.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground">— sin registros —</div>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <li key={`${item}-${i}`} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-1 text-xs">
              <span>{item}</span>
              <button
                type="button"
                aria-label={`quitar ${item}`}
                onClick={() => remove(i)}
                disabled={busy}
                className="rounded-full hover:bg-muted p-0.5 disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(e) => { e.preventDefault(); void add(); }}
        className="flex gap-2"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          disabled={busy}
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={busy || draft.trim().length === 0} className="gap-1">
          <Plus className="h-4 w-4" /> Agregar
        </Button>
      </form>
    </div>
  );
}
