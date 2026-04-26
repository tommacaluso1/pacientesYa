import { listTasksForEncounter } from "@/lib/domain/tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskRow } from "./TaskRow";
import { TaskCreateForm } from "./TaskCreateForm";

export async function TareasTab({ encounterId }: { encounterId: string }) {
  const tasks = await listTasksForEncounter(encounterId);
  const open = tasks.filter((t) => t.status === "pendiente" || t.status === "en_curso");
  const done = tasks.filter((t) => t.status === "completada");
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Nueva tarea</CardTitle></CardHeader>
        <CardContent><TaskCreateForm encounterId={encounterId} /></CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">Pendientes ({open.length})</h3>
        {open.length === 0
          ? <p className="text-sm text-muted-foreground">Nada pendiente.</p>
          : <ul className="space-y-1">{open.map((t) => <li key={t.id}><TaskRow task={t} /></li>)}</ul>}
      </div>

      {done.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 text-muted-foreground">Completadas ({done.length})</h3>
          <ul className="space-y-1">{done.map((t) => <li key={t.id}><TaskRow task={t} /></li>)}</ul>
        </div>
      )}
    </div>
  );
}
