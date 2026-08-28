import { DriveWorkspace } from "@/components/apps/DriveWorkspace";
import { ApplicationLogo } from "@/components/apps/ApplicationLogo";
import { CapabilityStatus } from "@/components/apps/CapabilityStatus";
import type { GoogleWorkspacePublicState } from "@/lib/google-workspace/types";
import { googleCapabilities, integrationErrorMessage } from "@/lib/integrations/presentation";

export function GoogleCapabilities({ state, onManageDrive }: { state: GoogleWorkspacePublicState; onManageDrive?: () => void }) {
  const c = state.connection;
  return <div className="divide-y divide-[rgb(var(--border))] border-t border-[rgb(var(--border))]">
    {googleCapabilities(state).map((capability) => {
      const error = capability.id === "gmail" ? c?.gmailError : capability.id === "google-calendar" ? c?.calendarError : null;
      return <div key={capability.id} className="grid gap-3 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(240px,0.85fr)] sm:items-start sm:gap-8">
        <div className="flex min-w-0 items-start gap-3">
          <ApplicationLogo item={capability} size="compact" />
          <div className="min-w-0 pt-0.5">
            <p className="text-[13px] font-semibold text-[rgb(var(--foreground))]">{capability.name}</p>
            <p className="mt-0.5 max-w-md text-xs leading-5 text-[rgb(var(--text-muted))]">{capability.description}</p>
          </div>
        </div>
        <div className="min-w-0 space-y-2 pt-0.5">
          {capability.operations.map((operation) => <div key={operation.label}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <span className="text-xs text-[rgb(var(--text-muted))]">{operation.label}</span>
              {!["google-docs","google-sheets"].includes(capability.id) || operation.status === "requires_authorization" ? <CapabilityStatus status={operation.status} /> : null}
            </div>
            {operation.detail ? <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">{operation.detail}</p> : null}
          </div>)}
          {capability.id === "google-drive" && c ? onManageDrive ? <button type="button" onClick={onManageDrive} className="focus-ring rounded-button border border-[rgb(var(--border))] px-3 py-2 text-xs font-medium">Gestionează documentele</button> : <DriveWorkspace key={c.latestRun?.completedAt??c.lastSuccessfulSyncAt??c.id} compact authorized={!!c.capabilities.drive} /> : null}
          {error ? <p className="mt-1 text-xs leading-5 text-[rgb(var(--danger-text))]">{integrationErrorMessage(error)}</p> : null}
        </div>
      </div>;
    })}
  </div>;
}
