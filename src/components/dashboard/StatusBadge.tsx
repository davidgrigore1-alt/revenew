import type { OpportunityStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const labels: Record<OpportunityStatus, string> = {
  new: "Nouă",
  reviewed: "Revizuită",
  action_generated: "Acțiune pregătită",
  contacted: "Contactată",
  follow_up_needed: "Follow-up",
  won: "Câștigată",
  lost: "Pierdută",
  ignored: "Ignorată"
};

const tones: Record<OpportunityStatus, string> = {
  new: "border-mint-400/25 bg-mint-400/10 text-mint-400",
  reviewed: "border-white/10 bg-white/[0.06] text-zinc-300",
  action_generated: "border-gold-400/25 bg-gold-400/10 text-gold-400",
  contacted: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  follow_up_needed: "border-orange-400/25 bg-orange-400/10 text-orange-300",
  won: "border-mint-400/25 bg-mint-400/10 text-mint-400",
  lost: "border-red-400/25 bg-red-400/10 text-red-300",
  ignored: "border-zinc-500/25 bg-zinc-500/10 text-zinc-400"
};

export function StatusBadge({ status }: { status: OpportunityStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold", tones[status])}>
      {labels[status]}
    </span>
  );
}

export function getStatusLabel(status: OpportunityStatus) {
  return labels[status];
}
