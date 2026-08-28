"use client";

import {
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  ShieldCheckIcon,
  UserIcon
} from "@heroicons/react/24/outline";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ApplicationLogo } from "@/components/apps/ApplicationLogo";
import { CapabilityStatus } from "@/components/apps/CapabilityStatus";
import { GoogleCapabilities } from "@/components/apps/GoogleCapabilities";
import { activityResultLabels, googleProviderPresentation, workspaceSyncFeedback } from "@/lib/integrations/presentation";
import type { GoogleWorkspacePublicState, WorkspaceSyncResult } from "@/lib/google-workspace/types";
import { formatProductDateTime } from "@/lib/ui/presentation";

type Props = { state: GoogleWorkspacePublicState; notice?: string | null };

function ProviderMark({ connected = false }: { connected?: boolean }) {
  return <ApplicationLogo item={{ id: "google-workspace", name: "Google Workspace" }} variant={connected ? "provider" : "symbol"} />;
}

const primaryActionClass =
  "focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-button bg-[rgb(var(--primary))] px-3.5 text-xs font-semibold text-[rgb(var(--primary-foreground))] transition-[background-color,transform] duration-fast hover:-translate-y-px hover:bg-[rgb(var(--primary-hover))] active:translate-y-0 active:scale-[0.985] disabled:transform-none motion-reduce:transform-none";

const secondaryActionClass =
  "focus-ring inline-flex min-h-9 items-center justify-center rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3.5 text-xs font-semibold text-[rgb(var(--foreground))] transition-colors hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-subtle))]";

export function GoogleWorkspaceCard({ state, notice }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [details, setDetails] = useState(false);
  const [message, setMessage] = useState<string | null>(
    notice === "drive-enabled"
      ? "Google Drive este autorizat. Selectează documentele, apoi confirmă contextul comercial."
      : notice === "drive-denied" || notice === "consent-denied"
        ? "Permisiunea suplimentară nu a fost acordată. Accesul existent Gmail și Calendar nu a fost modificat."
        : notice === "wrong-account"
          ? "Selectează contul Google deja conectat la acest profil."
          : notice === "send-enabled"
      ? "Permisiunea de trimitere Gmail este activă. Fiecare mesaj necesită confirmare finală."
      : notice === "connected"
        ? "Conexiunea securizată este pregătită. Pornește prima sincronizare."
        : notice === "invalid-state"
          ? "Conexiunea a fost oprită deoarece verificarea de securitate a expirat."
          : notice && notice !== "consent-denied"
            ? "Conexiunea Google nu a putut fi finalizată."
            : null
  );
  const connection = state.connection;
  const provider = googleProviderPresentation(state);

  function mutate(path: string, success: string) {
    setMessage(null);
    startTransition(async () => {
      try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}"
      });
      const body = await response.json().catch(() => ({})) as Partial<WorkspaceSyncResult> & { error?: string };
      setMessage(response.ok ? body.gmail && body.calendar && body.drive && body.status ? workspaceSyncFeedback(body as WorkspaceSyncResult) : success : body.error ?? "Operațiunea nu a putut fi finalizată.");
      router.refresh();
      } catch { setMessage("Conexiunea a fost întreruptă. Verifică starea înainte să reîncerci."); }
    });
  }

  if (!state.configured) {
    return (
      <section className="overflow-hidden rounded-[14px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div className="flex items-start gap-4 p-5 sm:p-6">
          <ProviderMark />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[rgb(var(--foreground))]">Google Workspace</p>
              <CapabilityStatus status={provider.status} label={provider.label} />
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--text-muted))]">Administratorul trebuie să configureze conexiunea securizată înainte de conectarea conturilor Google.</p>
          </div>
        </div>
      </section>
    );
  }

  if (!connection || connection.status === "disconnected") {
    return (
      <section className="overflow-hidden rounded-[14px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex items-start gap-4">
            <ProviderMark />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-[rgb(var(--foreground))]">Google Workspace</h3>
                <CapabilityStatus status={provider.status} label={provider.label} />
              </div>
              <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">Gmail și Calendar pentru context comercial privat și controlat.</p>
            </div>
          </div>
          <a href="/api/integrations/google/connect" className={primaryActionClass}>Conectează</a>
        </div>
        <GoogleCapabilities state={state} />
      </section>
    );
  }

  const requiresReconnect =
    connection.status === "action_required" ||
    (connection.gmailStatus === "action_required" && connection.calendarStatus === "action_required");

  return (
    <section className="overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="flex min-w-0 items-start gap-4">
          <ProviderMark connected />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[rgb(var(--foreground))]">Google Workspace</h3>
              <CapabilityStatus status={provider.status} label={provider.label} className="rounded-full border border-[rgb(var(--border))] px-2" />
            </div>
            <p title={connection.email} className="mt-1 truncate text-sm font-medium text-[rgb(var(--text-secondary))]">{connection.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[rgb(var(--text-muted))]">
              <span className="text-[rgb(var(--text-faint))]">Folosit de</span>
              {["Ask ReveNew", "Inbox", "Control Center", "Meeting Briefs"].map((item) => (
                <span key={item} className="border-l border-[rgb(var(--border))] pl-2">{item}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {requiresReconnect ? (
            <a href="/api/integrations/google/connect" className={primaryActionClass}>Reconectează</a>
          ) : (
            <button
              type="button"
              disabled={pending || connection.syncing}
              onClick={() => mutate("/api/integrations/google/sync", "Sincronizarea s-a încheiat. Starea surselor a fost actualizată.")}
              className={`${primaryActionClass} disabled:cursor-wait disabled:opacity-60`}
            >
              {pending || connection.syncing ? "Se sincronizează…" : "Sincronizează"}
            </button>
          )}
          {!connection.capabilities.emailSend ? (
            <a href="/api/integrations/google/connect?capability=email_send" className={secondaryActionClass}>Activează trimiterea</a>
          ) : null}
          <button type="button" aria-expanded={details} onClick={() => setDetails((value) => !value)} className={secondaryActionClass}>
            {details ? "Închide" : "Gestionează"}
          </button>
        </div>
      </div>

      {requiresReconnect ? (
        <div role="alert" className="mx-5 mb-4 rounded-control border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] px-3 py-2 text-xs leading-5 text-[rgb(var(--warning-text))] sm:mx-6">
          Google a revocat sau a invalidat accesul. Reconectează contul pentru a relua sincronizarea.
        </div>
      ) : null}

      {message ? (
        <div role="status" className="mx-5 mb-4 flex items-start gap-2 border-t border-[rgb(var(--border))] pt-3 text-xs leading-5 text-[rgb(var(--text-secondary))] sm:mx-6">
          <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[rgb(var(--text-muted))]" />
          <span>{message}</span>
        </div>
      ) : null}

      <GoogleCapabilities state={state} />

      <div className="grid border-t border-[rgb(var(--border))] sm:grid-cols-3 sm:divide-x sm:divide-[rgb(var(--border))]">
        <div className="p-4">
          <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]"><ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />Ultima sincronizare</p>
          <p className="mt-2 text-xs font-medium text-[rgb(var(--text-secondary))]">{connection.lastSuccessfulSyncAt ? formatProductDateTime(connection.lastSuccessfulSyncAt) : "Nicio sincronizare"}</p>
        </div>
        <div className="border-t border-[rgb(var(--border))] p-4 sm:border-t-0">
          <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]"><UserIcon className="h-3.5 w-3.5" aria-hidden="true" />Acces</p>
          <p className="mt-2 text-xs font-medium text-[rgb(var(--text-secondary))]">Gmail și Calendar private · documente partajate</p>
        </div>
        <div className="border-t border-[rgb(var(--border))] p-4 sm:border-t-0">
          <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]"><ShieldCheckIcon className="h-3.5 w-3.5" aria-hidden="true" />Control extern</p>
          <p className="mt-2 text-xs font-medium text-[rgb(var(--text-secondary))]">{connection.capabilities.emailSend ? "Trimitere cu confirmare obligatorie" : "Fără permisiune de trimitere"}</p>
        </div>
      </div>

      {details ? (
        <div className="grid gap-5 border-t border-[rgb(var(--border))] p-5 sm:p-6">
          <div>
            <p className="micro-label">Permisiuni și control</p>
            <div className="mt-3 grid gap-2 text-sm leading-6 text-[rgb(var(--text-muted))]">
              <p><strong className="font-semibold text-[rgb(var(--foreground))]">Gmail:</strong> {connection.capabilities.emailRead ? "permisiune de citire acordată pentru context comercial; disponibilitatea curentă este indicată mai sus." : "permisiunea de citire nu este acordată."}</p>
              <p><strong className="font-semibold text-[rgb(var(--foreground))]">Calendar:</strong> {connection.capabilities.calendarRead ? "permisiune de citire acordată pentru întâlniri și participanți." : "permisiunea de citire nu este acordată."}</p>
              <p><strong className="font-semibold text-[rgb(var(--foreground))]">Execuție:</strong> {connection.capabilities.emailSend ? "trimiterea necesită confirmare finală pentru fiecare mesaj; evenimentele Calendar nu sunt modificate." : "trimiterea nu este autorizată; evenimentele Calendar nu sunt modificate."}</p>
            </div>
          </div>

          {connection.latestRun ? (
            <div className="border-t border-[rgb(var(--border))] pt-4">
              <p className="micro-label">Ultima activitate</p>
              <div className="mt-3 flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-[rgb(var(--foreground))]">{connection.latestRun.source === "gmail" ? "Gmail" : connection.latestRun.source === "calendar" ? "Calendar" : "Google Workspace"}</p>
                  <p className="mt-1 text-[rgb(var(--text-faint))]">{formatProductDateTime(connection.latestRun.startedAt)}</p>
                </div>
                <p className="text-[rgb(var(--text-secondary))]">{activityResultLabels[connection.latestRun.status]} · {connection.latestRun.processedCount} elemente procesate</p>
              </div>
            </div>
          ) : null}

          <details className="text-xs text-[rgb(var(--text-muted))]">
            <summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-1.5 rounded-button font-semibold text-[rgb(var(--text-secondary))] marker:hidden">
              Detalii tehnice
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </summary>
            <p className="mt-2 max-w-3xl leading-5">Identitatea Google, Gmail read și Calendar read-only sunt separate de permisiunea Gmail send. Refresh tokenurile și secretele rămân pe server. Picker folosește temporar în memoria browserului un access token restrâns la fișierele autorizate.</p>
          </details>

          <div className="flex flex-col gap-4 border-t border-[rgb(var(--border))] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-xs leading-5 text-[rgb(var(--text-faint))]">Deconectarea invalidează credentialul local și elimină contextul Gmail și Calendar și conținutul Drive sincronizat pentru acest cont.</p>
            <button
              type="button"
              disabled={pending}
              onClick={() => mutate("/api/integrations/google/disconnect", "Contul Google a fost deconectat, iar contextul sincronizat a fost eliminat.")}
              className="focus-ring min-h-9 shrink-0 rounded-button border border-[rgb(var(--danger-border))] px-3 text-xs font-semibold text-[rgb(var(--danger-text))] hover:bg-[rgb(var(--danger-background))] disabled:opacity-60"
            >
              Deconectează
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
