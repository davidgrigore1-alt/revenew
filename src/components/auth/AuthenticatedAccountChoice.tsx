"use client";

import { useState } from "react";
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
    <div className="mt-8 rounded-card border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--primary)/0.08)] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Sesiune activă</p>
      <h2 className="mt-3 font-display text-2xl font-semibold text-[rgb(var(--foreground))]">Ești deja autentificat</h2>
      <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-muted))]">
        În prezent ești conectat ca <span className="break-all font-semibold text-[rgb(var(--foreground))]">{email}</span>.
      </p>

      <div className="mt-6 grid gap-3">
        <Button href="/auth/bootstrap" className={loading ? "pointer-events-none opacity-60" : undefined}>
          Continuă cu acest cont
        </Button>
        <Button type="button" variant="secondary" onClick={useAnotherAccount} disabled={Boolean(loading)}>
          {loading === "switch" ? "Se schimbă contul..." : "Folosește alt cont"}
        </Button>
      </div>
    </div>
  );
}
