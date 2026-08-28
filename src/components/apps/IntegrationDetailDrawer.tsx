"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  KeyIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { IntegrationLogo } from "@/components/apps/IntegrationLogo";
import { ApplicationStatus as StatusPill } from "@/components/apps/ApplicationStatus";
import { CapabilityStatus } from "@/components/apps/CapabilityStatus";
import { GoogleCapabilities } from "@/components/apps/GoogleCapabilities";
import type { GoogleWorkspacePublicState } from "@/lib/google-workspace/types";
import { googleProviderPresentation } from "@/lib/integrations/presentation";
import type { IntegrationCatalogItem } from "@/lib/integrations/catalog";

export function IntegrationDetailDrawer({
  item,
  state,
  onManageGoogle,
  onClose
}: {
  item: IntegrationCatalogItem | null;
  state: GoogleWorkspacePublicState;
  onManageGoogle: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!item || !dialog) return;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbarWidth}px`;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    // Native top layer isolates the entire app and contains keyboard focus.
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      document.body.style.paddingRight = previousPadding;
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    };
  }, [item]);

  if (!item) return null;
  const provider = item.id === "google-workspace" ? googleProviderPresentation(state) : null;

  return createPortal(
      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby="integration-detail-title"
        onCancel={(event) => { event.preventDefault(); onClose(); }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
        }}
        className="fixed inset-0 z-[200] m-auto max-h-[calc(100dvh-48px)] w-[min(920px,calc(100vw-48px))] max-w-none overflow-hidden rounded-[16px] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] p-0 text-[rgb(var(--foreground))] shadow-modal backdrop:bg-black/[0.65] open:flex open:flex-col"
      >
        <header className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-5">
          <div className="flex min-w-0 items-start gap-4">
            <IntegrationLogo item={item} size="large" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="micro-label">{item.category}</p>
                {provider ? <CapabilityStatus status={provider.status} label={provider.label} /> : <StatusPill tone={item.stage === "next" ? "gold" : "neutral"}>
                  {item.stage === "next" ? "În curând" : "Planificat"}
                </StatusPill>}
              </div>
              <h2 id="integration-detail-title" className="mt-2 text-xl font-semibold tracking-[-0.025em] text-[rgb(var(--foreground))]">
                {item.name}
              </h2>
              {provider && state.connection ? <p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]" title={state.connection.email}>{state.connection.email}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-button text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]"
            aria-label="Închide"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {provider ? <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <p className="p-5 text-sm leading-6 text-[rgb(var(--text-muted))]">Conversațiile Gmail și întâlnirile Calendar autorizate pot susține Ask ReveNew, Inbox și pregătirea întâlnirilor. Conectarea contului nu autorizează automat toate serviciile Google.</p>
          <GoogleCapabilities state={state} onManageDrive={onManageGoogle} />
          <div className="border-t border-[rgb(var(--border))] p-5 text-xs leading-5 text-[rgb(var(--text-muted))]">
            <p className="font-semibold text-[rgb(var(--foreground))]">Acces privat · control explicit</p>
            <p className="mt-1">Contextul Gmail și Calendar aparține utilizatorului conectat. Documentele Drive confirmate devin context comercial vizibil membrilor spațiului de lucru. Trimiterea Gmail necesită permisiune separată și confirmare; Calendarul nu este modificat.</p>
          </div>
        </div> : <div className="app-scrollbar grid min-h-0 flex-1 overflow-y-auto overscroll-contain md:grid-cols-2">
          <section className="border-b border-[rgb(var(--border))] p-5 md:col-span-2">
            <p className="text-sm leading-6 text-[rgb(var(--text-muted))]">{item.description}</p>
            {item.note ? (
              <div className="mt-4 rounded-control border border-[rgb(var(--primary-border))] bg-[rgb(var(--primary-soft))] px-3 py-2.5 text-xs leading-5 text-[rgb(var(--text-secondary))]">
                {item.note}
              </div>
            ) : null}
          </section>

          <section className="border-b border-[rgb(var(--border))] p-5 md:border-r">
            <p className="micro-label">Ce aduce în ReveNew</p>
            <div className="mt-4 grid gap-0">
              {item.useCases.map((useCase) => (
                <div key={useCase.label} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 border-t border-[rgb(var(--border))] py-3.5 first:border-t-0 first:pt-0">
                  <CheckCircleIcon className="mt-0.5 h-4 w-4 text-[rgb(var(--text-muted))]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[rgb(var(--foreground))]">{useCase.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{useCase.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border-b border-[rgb(var(--border))] p-5">
            <p className="micro-label">Capabilități planificate</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.capabilities.map((capability) => (
                <span key={capability} className="inline-flex min-h-[22px] items-center rounded-md border border-[rgb(var(--border))] px-2 text-xs text-[rgb(var(--text-secondary))]">
                  {capability}
                </span>
              ))}
            </div>
            <div className="mt-5 border-t border-[rgb(var(--border))] pt-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-[rgb(var(--foreground))]"><KeyIcon className="h-4 w-4" aria-hidden="true" />Date și autorizare proiectată</p>
              <ul className="mt-2 space-y-2 text-xs leading-5 text-[rgb(var(--text-muted))]">
                {item.permissions.map((permission) => <li key={permission}>{permission}</li>)}
              </ul>
              <p className="mt-4 text-xs leading-5 text-[rgb(var(--text-muted))]">Integrarea nu este activă. Nicio informație nu este citită și nicio acțiune externă nu este executată prin acest furnizor.</p>
            </div>
          </section>

          <section className="p-5 md:col-span-2">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex gap-3">
                <LockClosedIcon className="mt-0.5 h-4 w-4 text-[rgb(var(--text-faint))]" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-[rgb(var(--foreground))]">Acces proiectat</p>
                  <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{item.scope === "Utilizator" ? "Conexiune privată utilizatorului care o autorizează." : "Conexiune destinată contextului comun al workspace-ului, cu acces controlat."}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheckIcon className="mt-0.5 h-4 w-4 text-[rgb(var(--primary))]" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-[rgb(var(--foreground))]">Control ReveNew</p>
                  <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Datele externe sunt context, nu instrucțiuni. Orice acțiune cu efect extern rămâne separată și necesită control explicit.</p>
                </div>
              </div>
            </div>
          </section>
        </div>}

        <footer className="sticky bottom-0 flex shrink-0 justify-end border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] px-5 py-3">
          {provider ? <button type="button" onClick={onManageGoogle} className="focus-ring inline-flex h-9 items-center gap-2 rounded-button bg-[rgb(var(--primary))] px-3 text-xs font-semibold text-[rgb(var(--primary-foreground))] hover:bg-[rgb(var(--primary-hover))]">
            Gestionează conexiunea <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </button> : <button
            type="button"
            disabled
            className="inline-flex h-9 cursor-not-allowed items-center justify-center gap-2 rounded-button border border-[rgb(var(--border))] px-3 text-xs font-medium text-[rgb(var(--text-muted))]"
          >
            {item.stage === "next" ? "Disponibil în curând" : "Planificat"}
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </button>}
        </footer>
      </dialog>,
    document.body
  );
}
