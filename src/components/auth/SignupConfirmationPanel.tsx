"use client";

import Link from "next/link";
import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { useCallback, useEffect, useState } from "react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { Button } from "@/components/ui/Button";
import { authConfirmationRedirectUrl } from "@/lib/auth/confirmation";
import { authIntentQuery, type AuthIntent } from "@/lib/auth/redirects";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const resendCooldownSeconds = 30;

type ConfirmationNotice = { tone: "success" | "warning" | "error" | "info"; title: string; message?: string };

export function SignupConfirmationPanel({ email, intent, onChangeEmail }: { email: string; intent: AuthIntent; onChangeEmail: () => void }) {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState<ConfirmationNotice | null>(null);

  const continueIfConfirmed = useCallback(async (showPendingMessage = false) => {
    if (checking) return;
    setChecking(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setNotice({ tone: "error", title: "Nu am putut verifica sesiunea", message: "Reîncearcă în câteva momente." });
      setChecking(false);
      return;
    }

    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user?.email_confirmed_at) {
      window.location.assign(`/auth/bootstrap?${authIntentQuery(intent)}`);
      return;
    }

    if (showPendingMessage) {
      setNotice({ tone: "info", title: "Confirmarea nu este vizibilă încă", message: "Deschide cel mai recent email, confirmă adresa, apoi revino aici." });
    }
    setChecking(false);
  }, [checking, intent]);

  useEffect(() => {
    const onFocus = () => void continueIfConfirmed(false);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void continueIfConfirmed(false);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [continueIfConfirmed]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function resend() {
    if (resending || cooldown > 0) return;
    setResending(true);
    setNotice(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setNotice({ tone: "error", title: "Emailul nu a putut fi retrimis", message: "Reîncearcă în câteva momente." });
      setResending(false);
      return;
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: authConfirmationRedirectUrl(window.location.origin) }
    });
    if (error) {
      setNotice(error.status === 429
        ? { tone: "warning", title: "Ai solicitat prea multe mesaje", message: "Așteaptă puțin, apoi retrimite confirmarea." }
        : { tone: "error", title: "Emailul nu a putut fi retrimis", message: "Verifică adresa sau încearcă din nou mai târziu." });
      setResending(false);
      return;
    }

    setCooldown(resendCooldownSeconds);
    setNotice({ tone: "success", title: "Emailul de confirmare a fost retrimis", message: "Folosește cel mai recent link primit." });
    setResending(false);
  }

  return (
    <section className="mt-8" aria-labelledby="confirmation-heading">
      <div className="rounded-card border border-[rgb(var(--primary)/0.3)] bg-[linear-gradient(145deg,rgb(var(--primary)/0.1),rgb(var(--surface-subtle)))] p-5 sm:p-6">
        <div className="grid size-11 place-items-center rounded-full border border-[rgb(var(--primary)/0.35)] bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]">
          <EnvelopeIcon className="size-5" aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Confirmare email</p>
        <h2 id="confirmation-heading" className="mt-2 font-display text-2xl font-semibold tracking-tight text-[rgb(var(--foreground))]">Verifică adresa de email</h2>
        <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-muted))]">
          Am trimis linkul de confirmare la <strong className="break-all text-[rgb(var(--foreground))]">{email}</strong>. După confirmare vei reveni automat în ReveNew pentru configurarea firmei.
        </p>
        <ol className="mt-5 grid gap-2 text-sm text-[rgb(var(--text-muted))]">
          <li className="flex gap-3"><span className="font-semibold text-[rgb(var(--primary))]">01</span><span>Deschide cel mai recent mesaj primit de la ReveNew.</span></li>
          <li className="flex gap-3"><span className="font-semibold text-[rgb(var(--primary))]">02</span><span>Confirmă adresa; sesiunea va fi pregătită în siguranță.</span></li>
          <li className="flex gap-3"><span className="font-semibold text-[rgb(var(--primary))]">03</span><span>Continuă direct cu configurarea firmei, fără o nouă autentificare.</span></li>
        </ol>
      </div>

      {notice ? <div className="mt-4"><AuthNotice {...notice} /></div> : null}

      <div className="mt-5 grid gap-3">
        <Button type="button" onClick={() => void continueIfConfirmed(true)} disabled={checking}>
          {checking ? "Verificăm confirmarea..." : "Am confirmat — continuă"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void resend()} disabled={resending || cooldown > 0}>
          {resending ? "Retrimitem..." : cooldown > 0 ? `Poți retrimite în ${cooldown}s` : "Retrimite emailul"}
        </Button>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <button type="button" onClick={onChangeEmail} className="focus-ring rounded-sm font-semibold text-[rgb(var(--primary))] hover:underline">Corectează adresa</button>
        <Link href="/login" className="focus-ring rounded-sm font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))] hover:underline">Înapoi la autentificare</Link>
      </div>
    </section>
  );
}
