import * as React from "react";
import { cn } from "@/lib/utils";

export function Separator({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("shrink-0 bg-border h-px w-full my-2", className)} {...p} />;
}
