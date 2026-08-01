"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { WorkspaceIdentityMark } from "@/components/theme/WorkspaceIdentityMark";

export function WorkspaceIdentityDisplay({ fallbackName, compact = false, showIndustry = false, fallbackIndustry = "" }: { fallbackName: string; compact?: boolean; showIndustry?: boolean; fallbackIndustry?: string }) {
  const { identityPreview } = useTheme();
  const displayName = identityPreview?.displayName || fallbackName;
  const initials = identityPreview?.initials;

  return (
    <span className="flex min-w-0 items-center gap-2" title={displayName} aria-label={`Spațiu de lucru: ${displayName}`}>
      <WorkspaceIdentityMark displayName={displayName} initials={initials} compact={compact} />
      <span className="min-w-0">
        <span className={`block min-w-0 truncate font-semibold text-[rgb(var(--foreground))] ${compact ? "text-xs" : "text-sm"}`}>{displayName}</span>
        {showIndustry && (identityPreview?.industry || fallbackIndustry) ? <span className="mt-0.5 block truncate text-[0.6875rem] text-[rgb(var(--text-muted))]">{identityPreview?.industry || fallbackIndustry}</span> : null}
      </span>
    </span>
  );
}
