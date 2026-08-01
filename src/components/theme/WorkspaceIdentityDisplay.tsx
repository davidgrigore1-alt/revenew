"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

export function WorkspaceIdentityDisplay({ fallbackName, compact = false }: { fallbackName: string; compact?: boolean }) {
  const { identityPreview } = useTheme();
  const displayName = identityPreview?.displayName || fallbackName;
  const initials = identityPreview?.initials;

  return (
    <span className="flex min-w-0 items-center gap-2" title={displayName}>
      {initials ? <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-control border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--primary-muted))] px-1.5 text-[0.65rem] font-bold tracking-[0.06em] text-[rgb(var(--primary))]" aria-hidden="true">{initials}</span> : null}
      <span className={`min-w-0 truncate font-semibold text-[rgb(var(--foreground))] ${compact ? "text-xs" : "text-sm"}`}>{displayName}</span>
    </span>
  );
}
