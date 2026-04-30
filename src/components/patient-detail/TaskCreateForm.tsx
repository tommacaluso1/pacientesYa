"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTaskAction } from "@/app/actions/tasks";
import { toast } from "sonner";

export function TaskCreateForm({
  encounterId, patientId
}: { encounterId: string; patientId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const fd = new FormData(e.currentTarget);
        fd.set("encounter_id", encounterId);
        fd.set("patient_id", patientId);
        const res = await createTaskAction(fd);
        setBusy(false);
        if (!res.ok) { toast.error("Revisá los campos"); return; }
        toast.success("Tarea creada");
        formRef.current?.reset();
        router.refresh();
      }}
      className="space-y-2"
    >
      <Input name="title" placeholder="Ej: Solicitar troponina" required />
      <Input name="detail" placeholder="Detalle (opcional)" />
      <div className="flex gap-2">
        <Input
          type="datetime-local"
          name="due_at_local"
          onChange={(e) => {
            const v = e.target.value;
            const f = formRef.current;
            if (!f) return;
            const hidden = f.querySelector<HTMLInputElement>('input[name="due_at"]');
            if (hidden) hidden.value = v ? new Date(v).toISOString() : "";
          }}
          className="flex-1"
        />
        <input type="hidden" name="due_at" />
      </div>
      <Button type="submit" disabled={busy} className="w-full">Agregar</Button>
    </form>
  );
}
