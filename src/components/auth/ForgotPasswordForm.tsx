"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { authConfirmationRedirectUrl } from "@/lib/auth/confirmation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const supabase = isSupabaseConfigured ? createSupabaseBrowserClient() : null;

    if (supabase) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authConfirmationRedirectUrl(window.location.origin, "/reset-password")
      });

      if (resetError && resetError.status === 429) {
        setError("Au fost prea multe încercări. Așteaptă puțin și încearcă din nou.");
        setLoading(false);
        return;
      }
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <>
      {sent ? <AuthNotice tone="success" title="Verifică emailul" message="Dacă există un cont pentru această adresă, vei primi instrucțiunile prin email." /> : null}
      {error ? <AuthNotice tone="error" title="Nu am putut trimite linkul" message={error} /> : null}
      <form method="post" onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-[rgb(var(--foreground))]">Email</span>
          <Input
            required
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nume@firma.ro"
            className="mt-2 h-12 px-4"
          />
        </label>
        <Button type="submit" className="w-full" disabled={loading} loading={loading}>
          {loading ? "Se trimite..." : "Trimite linkul de resetare"}
        </Button>
      </form>
    </>
  );
}
