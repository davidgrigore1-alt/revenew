import { Badge } from "@/components/ui/Badge";
import { sourceLabel } from "@/lib/recovery";

export function SourceBadge({ source }: { source: string }) {
  return <Badge tone="neutral">Sursă: {sourceLabel(source)}</Badge>;
}
