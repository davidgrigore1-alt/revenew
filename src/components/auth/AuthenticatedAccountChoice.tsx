"use client";

import { useState } from "react";
import { ShieldCheckIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { authIntentQuery, authPath, type AuthIntent } from "@/lib/auth/redirects";

type AuthenticatedAccountChoiceProps = {
  email: string;
  intent: AuthIntent;
  mode: "login" | "signup";
};

const staleWorkspaceKeys = ["revenew_current_business", "revenew_selected_business", "moneyhunter_current_business", "moneyhunter_selected_business"];

function clearStaleWorkspaceHints() {
  for (const key of staleWorkspaceKeys) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
}

export function AuthenticatedAccountChoice({ email, intent, mode }: AuthenticatedAccountChoiceProps) {
  const [loading, setLoading] = useState<"switch" | null>(null);

  function useAnotherAccount() {
    setLoading("switch");
    clearStaleWorkspaceHints();
    const next = authPath(mode === "login" ? "/login" : "/signup", intent);
    window.location.href = `/auth/switch-account?mode=${mode}&${authIntentQuery(intent)}&next=${encodeURIComponent(next)}`;
  }

  return (
    <div className="mt-8 overflow-hidden rounded-panel border border-[rgb(var(--primary)/0.24)] bg-[linear-gradient(145deg,rgb(var(--surface)),rgb(var(--primary-muted)))] p-1 shadow-card">
      <div className="rounded-[calc(var(--radius-panel)-0.25rem)] bg-[rgb(var(--surface)/0.84)] p-5 sm:p-6">
      <div className="flex items-center gap-2 text-[rgb(var(--primary))]"><UserCircleIcon className="h-5 w-5" aria-hidden="true" /><p className="text-xs font-semibold uppercase tracking-[0.16em]">Sesiune activă</p></div>
      <h2 className="mt-3 font-display text-2xl font-semibold text-[rgb(var(--foreground))]">Ești deja autentificat</h2>
      <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Poți continua în spațiul de lucru sau poți schimba în siguranță contul folosit.</p>
      <div className="mt-4 min-w-0 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-3 py-2.5">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Cont conectat</p>
        <p className="mt-1 block max-w-full truncate text-sm font-semibold text-[rgb(var(--foreground))]" title={email} aria-label={`Cont conectat: ${email}`}>{email}</p>
      </div>

      <div className="mt-5 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Button href="/auth/bootstrap" className={loading ? "pointer-events-none opacity-60" : undefined}>
          Continuă cu acest cont
        </Button>
        <Button type="button" variant="secondary" onClick={useAnotherAccount} disabled={Boolean(loading)}>
          {loading === "switch" ? "Se schimbă contul..." : "Folosește alt cont"}
        </Button>
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[rgb(var(--text-muted))]"><ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" /><span>Sesiunea rămâne protejată; schimbarea contului nu ocolește autentificarea.</span></p>
      </div>
    </div>
  );
}
