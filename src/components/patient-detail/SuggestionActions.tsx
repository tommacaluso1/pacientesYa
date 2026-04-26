"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { decideSuggestionAction } from "@/app/actions/suggestions";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

export function SuggestionActions({ id, accepted }: { id: string; accepted: boolean | null }) {
  const router = useRouter();
  if (accepted === true) return <span className="text-xs text-emerald-600">Aceptada</span>;
  if (accepted === false) return <span className="text-xs text-muted-foreground">Descartada</span>;
  return (
    <div className="flex gap-2 pt-1">
      <Button size="sm" variant="outline" className="gap-1"
              onClick={async () => { await decideSuggestionAction(id, true); router.refresh(); }}>
        <Check className="h-4 w-4" /> Aceptar
      </Button>
      <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground"
              onClick={async () => { await decideSuggestionAction(id, false); router.refresh(); }}>
        <X className="h-4 w-4" /> Descartar
      </Button>
    </div>
  );
}
