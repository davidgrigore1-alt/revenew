import {
  ArrowPathIcon,
  CheckIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/20/solid";
import {
  capabilityLabels,
  type CapabilityStatus as State,
} from "@/lib/integrations/presentation";
import { cn } from "@/lib/utils";

const tones: Record<State, string> = {
  connected:
    "border-emerald-700/[0.16] bg-emerald-700/[0.06] text-emerald-800 dark:border-emerald-300/[0.16] dark:bg-emerald-300/[0.07] dark:text-emerald-200",
  active:
    "border-emerald-700/[0.16] bg-emerald-700/[0.06] text-emerald-800 dark:border-emerald-300/[0.16] dark:bg-emerald-300/[0.07] dark:text-emerald-200",
  controlled:
    "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] text-[rgb(var(--text-secondary))]",
  requires_authorization:
    "border-[rgb(var(--interaction-border))] bg-[rgb(var(--interaction-tint))] text-[rgb(var(--interaction))]",
  unavailable:
    "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] text-[rgb(var(--text-muted))]",
  planned:
    "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] text-[rgb(var(--text-muted))]",
  error:
    "border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] text-[rgb(var(--danger-text))]",
  syncing:
    "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] text-[rgb(var(--text-secondary))]",
};

/**
 * Compact integration capability state.
 * Success and controlled states use explicit checks;
 * informational and planned states remain quiet.
 */
export function CapabilityStatus({
  status,
  label,
  className,
}: {
  status: State;
  label?: string;
  className?: string;
}) {
  const Icon =
    status === "syncing"
      ? ArrowPathIcon
      : status === "connected" ||
          status === "active" ||
          status === "controlled"
        ? CheckIcon
        : status === "error"
          ? ExclamationCircleIcon
          : null;

  return (
    <span
      className={cn(
        "inline-flex min-h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[11px] font-semibold leading-none",
        tones[status],
        className,
      )}
    >
      {Icon ? (
        <Icon
          aria-hidden="true"
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            status === "syncing" &&
              "animate-spin motion-reduce:animate-none",
          )}
        />
      ) : (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-65"
        />
      )}

      {label ?? capabilityLabels[status]}
    </span>
  );
}