import { Badge } from "@/components/ui/Badge";
import { domainStatePresentation, type PresentationPriority } from "@/lib/ui/domain-state-presentation";

export function PriorityBadge({ priority }: { priority?: PresentationPriority }) {
  const presentation = domainStatePresentation.priority[priority ?? "medium"];

  return <Badge tone={presentation.tone}>Prioritate {presentation.label}</Badge>;
}
