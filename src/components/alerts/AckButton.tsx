"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { acknowledgeAlertAction } from "@/app/actions/alerts";

export function AckButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <Button
      size="icon" variant="ghost" aria-label="Acknowledge"
      onClick={async () => { await acknowledgeAlertAction(id); router.refresh(); }}
    >
      <Check className="h-4 w-4" />
    </Button>
  );
}
