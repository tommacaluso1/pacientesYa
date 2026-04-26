"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function DocumentUploader({ patientId, encounterId }: { patientId: string; encounterId: string }) {
  const router = useRouter();
  const [kind, setKind] = React.useState<"ecg"|"laboratorio"|"imagen"|"informe"|"otro">("imagen");
  const [busy, setBusy] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const fd = new FormData(e.currentTarget);
          fd.set("patient_id", patientId);
          fd.set("encounter_id", encounterId);
          fd.set("kind", kind);
          const res = await fetch("/api/documents", { method: "POST", body: fd });
          if (!res.ok) throw new Error("upload failed");
          toast.success("Documento subido");
          formRef.current?.reset();
          router.refresh();
        } catch {
          toast.error("Error al subir");
        } finally { setBusy(false); }
      }}
      className="space-y-2"
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Tipo</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ecg">ECG</SelectItem>
              <SelectItem value="laboratorio">Laboratorio</SelectItem>
              <SelectItem value="imagen">Imagen / Rx</SelectItem>
              <SelectItem value="informe">Informe</SelectItem>
              <SelectItem value="otro">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="title">Título</Label>
          <Input id="title" name="title" placeholder="Ej: ECG ingreso" />
        </div>
      </div>
      <Input type="file" name="file" accept="image/*,application/pdf" capture="environment" required />
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Subiendo..." : "Subir"}</Button>
    </form>
  );
}
