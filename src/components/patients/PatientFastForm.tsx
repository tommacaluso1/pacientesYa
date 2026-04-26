"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { createPatientAction } from "@/app/actions/patients";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Guardando..." : "Crear paciente"}
    </Button>
  );
}

export function PatientFastForm() {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [triage, setTriage] = React.useState<"rojo"|"amarillo"|"verde">("verde");
  const [sexo, setSexo] = React.useState<"masculino"|"femenino"|"otro"|"no_informado">("no_informado");

  async function action(fd: FormData) {
    fd.set("triage", triage);
    fd.set("sexo", sexo);
    const res = await createPatientAction(fd);
    if (res && !res.ok) {
      toast.error("Revisá los campos marcados");
      return;
    }
  }

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="apellido">Apellido</Label>
          <Input id="apellido" name="apellido" required autoFocus inputMode="text" autoComplete="off" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" required inputMode="text" autoComplete="off" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="edad">Edad</Label>
          <Input id="edad" name="edad" type="number" inputMode="numeric" min={0} max={120} />
        </div>
        <div className="space-y-1 col-span-2">
          <Label>Sexo</Label>
          <Select value={sexo} onValueChange={(v) => setSexo(v as typeof sexo)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="femenino">Femenino</SelectItem>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="otro">Otro</SelectItem>
              <SelectItem value="no_informado">No informado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="documento">DNI</Label>
        <Input id="documento" name="documento" inputMode="numeric" autoComplete="off" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="sector">Sector</Label>
          <Input id="sector" name="sector" placeholder="Guardia / UTI / Sala" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cama">Cama</Label>
          <Input id="cama" name="cama" placeholder="G-12" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Triage</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["rojo","amarillo","verde"] as const).map((c) => (
            <button
              type="button" key={c}
              onClick={() => setTriage(c)}
              className={`h-11 rounded-md font-medium border-2 ${
                triage === c ? "border-foreground" : "border-transparent"
              } ${
                c === "rojo" ? "bg-triage-rojo text-white" :
                c === "amarillo" ? "bg-triage-amarillo text-black" :
                "bg-triage-verde text-white"
              }`}
            >
              {c[0]!.toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="motivo_consulta">Motivo de consulta</Label>
        <Textarea id="motivo_consulta" name="motivo_consulta" rows={2} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="diagnostico_presuntivo">Diagnóstico presuntivo</Label>
        <Input id="diagnostico_presuntivo" name="diagnostico_presuntivo" />
      </div>

      <SubmitButton />
    </form>
  );
}
