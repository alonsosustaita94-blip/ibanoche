import { Badge } from "@/components/ui/badge";

export function StatusBadge({
  value,
  map,
}: {
  value: string;
  map: Record<string, { label: string; tone: "blue" | "turquoise" | "coral" | "green" | "amber" | "gray" | "solid" }>;
}) {
  const entry = map[value] ?? { label: value, tone: "gray" as const };
  return (
    <Badge tone={entry.tone} dot>
      {entry.label}
    </Badge>
  );
}
