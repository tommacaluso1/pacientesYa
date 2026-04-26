"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/utils";
import type { DocumentRow } from "@/types/database";
import { FileText, ExternalLink } from "lucide-react";

export function DocumentList({ docs }: { docs: DocumentRow[] }) {
  if (docs.length === 0) return <p className="text-sm text-muted-foreground">Sin documentos.</p>;
  return (
    <ul className="space-y-2">
      {docs.map((d) => (
        <li key={d.id}>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{d.title || d.storage_path.split("/").pop()}</div>
                <div className="text-xs text-muted-foreground">{fmtDateTime(d.created_at)}</div>
              </div>
              <Badge variant="outline">{d.kind}</Badge>
              <button
                aria-label="Ver"
                onClick={async () => {
                  const r = await fetch(`/api/documents/signed-url?path=${encodeURIComponent(d.storage_path)}`);
                  const { url } = await r.json();
                  if (url) window.open(url, "_blank");
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
