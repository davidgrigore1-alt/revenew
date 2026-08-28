import { ApplicationLogo } from "@/components/apps/ApplicationLogo";
import { CapabilityStatus } from "@/components/apps/CapabilityStatus";
import type { GoogleWorkspacePublicState } from "@/lib/google-workspace/types";
import { activityResultLabels, googleActivity, type CapabilityStatus as State } from "@/lib/integrations/presentation";
import { formatProductDateTime } from "@/lib/ui/presentation";

export function IntegrationActivity({ state }: { state: GoogleWorkspacePublicState }) {
  const events = googleActivity(state);
  if (!events.length) return <div className="border-y border-[rgb(var(--border))] py-8">
    <p className="text-sm font-semibold text-[rgb(var(--foreground))]">Nicio sincronizare înregistrată.</p>
    <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{state.connection ? "Pornește sincronizarea din Conexiuni pentru a vedea rezultatul aici." : "Conectează Google Workspace pentru a începe."}</p>
  </div>;
  return <div>
    <p className="mb-3 text-xs text-[rgb(var(--text-muted))]">Ultima rulare și ultimul context disponibil pentru fiecare sursă. Numărul din context nu reprezintă elemente noi în ultima rulare.</p>
    <ol className="divide-y divide-[rgb(var(--border))] border-y border-[rgb(var(--border))]">
      {events.map((entry) => {
        const result: State = entry.result === "running" ? "syncing" : entry.result === "failed" ? "error" : entry.result === "completed" ? "active" : "unavailable";
        const logo = entry.capability === "Gmail" ? "gmail" : entry.capability === "Google Calendar" ? "google-calendar" : "google-workspace";
        return <li key={entry.id} className="grid gap-3 py-4 sm:grid-cols-[32px_minmax(0,1fr)_auto]">
          <ApplicationLogo item={{ id: logo, name: entry.capability }} size="compact" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[rgb(var(--foreground))]">{entry.capability} · {entry.event.toLocaleLowerCase("ro-RO")}</p>
            <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{entry.provider}{entry.count !== null ? <> · <span className="tabular-nums">{entry.count.toLocaleString("ro-RO")}</span> {entry.countLabel}</> : null}</p>
            {entry.warning ? <p className="mt-2 max-w-2xl text-xs leading-5 text-[rgb(var(--text-secondary))]">{entry.warning}</p> : null}
          </div>
          <div className="sm:text-right">
            <CapabilityStatus status={result} label={activityResultLabels[entry.result]} />
            <p className="mt-1 text-xs tabular-nums text-[rgb(var(--text-muted))]"><time dateTime={entry.timestamp}>{formatProductDateTime(entry.timestamp)}</time>{entry.durationSeconds !== null ? <> · {entry.durationSeconds.toLocaleString("ro-RO")} s</> : null}</p>
          </div>
        </li>;
      })}
    </ol>
  </div>;
}
