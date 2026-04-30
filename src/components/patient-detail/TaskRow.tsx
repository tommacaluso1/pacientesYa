"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toggleTaskAction } from "@/app/actions/tasks";
import { fmtDateTime } from "@/lib/utils";
import type { Task } from "@/types/database";
import { Check } from "lucide-react";

export function TaskRow({ task }: { task: Task }) {
  const router = useRouter();
  const overdue = task.status === "pendiente" && task.due_at && new Date(task.due_at) < new Date();
  return (
    <div className={`flex items-center gap-3 p-3 rounded-md border ${overdue ? "border-red-500/60" : ""}`}>
      <button
        type="button"
        aria-label="completar"
        className={`h-6 w-6 rounded-full border flex items-center justify-center ${task.status === "completada" ? "bg-emerald-500 text-white" : ""}`}
        onClick={async () => {
          await toggleTaskAction(task.id, task.status === "completada" ? "pendiente" : "completada");
          router.refresh();
        }}
      >
        {task.status === "completada" && <Check className="h-4 w-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`truncate ${task.status === "completada" ? "line-through text-muted-foreground" : ""}`}>{task.title}</div>
        {task.detail && <div className="text-xs text-muted-foreground truncate">{task.detail}</div>}
        {task.due_at && <div className="text-xs text-muted-foreground">vence {fmtDateTime(task.due_at)}</div>}
      </div>
    </div>
  );
}
