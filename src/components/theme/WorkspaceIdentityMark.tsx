"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { workspaceInitials } from "@/lib/workspace-logo";

export function WorkspaceIdentityMark({ displayName, initials, compact = false }: { displayName: string; initials?: string; compact?: boolean }) {
  const { workspaceLogo } = useTheme();
  const label = workspaceInitials(displayName, initials);
  const sizeClass = compact ? "h-8 w-8 rounded-md text-[0.625rem]" : "h-11 w-11 rounded-control text-xs";

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden border border-[rgb(var(--border-strong)/0.72)] bg-[rgb(var(--surface-muted))] font-bold tracking-[0.06em] text-[rgb(var(--primary))] shadow-[inset_0_0_0_1px_rgb(var(--surface)/0.2)] ${sizeClass}`}>
      {workspaceLogo ? (
        // User-provided data URLs stay local and intentionally bypass remote image optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={workspaceLogo.dataUrl} alt="Logo spațiu de lucru" className="h-auto w-auto max-h-[78%] max-w-[78%] object-contain" />
      ) : <span aria-label={`Inițiale spațiu de lucru: ${label}`}>{label}</span>}
    </span>
  );
}
