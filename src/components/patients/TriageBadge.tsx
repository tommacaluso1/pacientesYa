import { Badge } from "@/components/ui/badge";
import type { TriageColor } from "@/types/database";

const labels: Record<TriageColor, string> = { rojo: "Rojo", amarillo: "Amarillo", verde: "Verde" };

export function TriageBadge({ value }: { value: TriageColor }) {
  return <Badge variant={value}>{labels[value]}</Badge>;
}
