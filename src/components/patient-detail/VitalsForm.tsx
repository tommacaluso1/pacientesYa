"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { recordVitalsAction } from "@/app/actions/vitals";
import { toast } from "sonner";

export function VitalsForm({ encounterId }: { encounterId: string }) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("encounter_id", encounterId);
        const res = await recordVitalsAction(fd);
        if (!res.ok) { toast.error("Revisá los valores"); return; }
        toast.success("Signos vitales cargados");
        formRef.current?.reset();
        router.refresh();
      }}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
    >
      {[
        ["ta_sistolica", "TA sist."], ["ta_diastolica", "TA diast."],
        ["fc", "FC"], ["fr", "FR"],
        ["temperatura", "Tº"], ["saturacion", "SatO2"],
        ["glucemia", "HGT"], ["dolor_eva", "Dolor /10"]
      ].map(([k, l]) => (
        <div key={k} className="space-y-1">
          <Label htmlFor={k}>{l}</Label>
          <Input id={k} name={k} type="number" inputMode="decimal" step="any" />
        </div>
      ))}
      <Button type="submit" className="col-span-full mt-1">Guardar signos vitales</Button>
    </form>
  );
}
