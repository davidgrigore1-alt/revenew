"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { workspaceInitials } from "@/lib/workspace-logo";

export function WorkspaceIdentityMark({ displayName, initials, compact = false }: { displayName: string; initials?: string; compact?: boolean }) {
  const { workspaceLogo } = useTheme();
  const label = workspaceInitials(displayName, initials);
  const sizeClass = compact ? "h-7 w-7 rounded-md text-[0.6rem]" : "h-10 w-10 rounded-control text-xs";

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--surface))] font-bold tracking-[0.06em] text-[rgb(var(--primary))] shadow-sm ${sizeClass}`}>
      {workspaceLogo ? (
        // User-provided data URLs stay local and intentionally bypass remote image optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={workspaceLogo.dataUrl} alt="Logo spațiu de lucru" className="h-full w-full object-contain p-0.5" />
      ) : <span aria-label={`Inițiale spațiu de lucru: ${label}`}>{label}</span>}
    </span>
  );
}
