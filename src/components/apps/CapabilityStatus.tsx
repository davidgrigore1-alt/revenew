import { ArrowPathIcon, CheckIcon, ExclamationCircleIcon } from "@heroicons/react/20/solid";
import { capabilityLabels, type CapabilityStatus as State } from "@/lib/integrations/presentation";
import { cn } from "@/lib/utils";

const tones: Record<State, string> = {
  connected: "text-emerald-800 dark:text-emerald-200/80",
  active: "text-emerald-800 dark:text-emerald-200/80",
  controlled: "text-[rgb(var(--text-secondary))]",
  requires_authorization: "text-[rgb(var(--primary))]",
  unavailable: "text-[rgb(var(--text-muted))]",
  planned: "text-[rgb(var(--text-muted))]",
  error: "text-[rgb(var(--danger-text))]",
  syncing: "text-[rgb(var(--text-secondary))]"
};

/** Inline capability state; deliberately quieter than a provider badge. */
export function CapabilityStatus({ status, label, className }: { status: State; label?: string; className?: string }) {
  const Icon = status === "syncing" ? ArrowPathIcon : status === "controlled" ? CheckIcon : status === "error" ? ExclamationCircleIcon : null;
  return <span className={cn("inline-flex min-h-[22px] items-center gap-1.5 text-xs font-medium", tones[status], className)}>
    {Icon ? <Icon aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0", status === "syncing" && "animate-spin motion-reduce:animate-none")} />
      : <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />}
    {label ?? capabilityLabels[status]}
  </span>;
}
