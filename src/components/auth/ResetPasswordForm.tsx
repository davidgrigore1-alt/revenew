"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { PasswordField } from "@/components/auth/PasswordField";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const supabase = createSupabaseBrowserClient();
      const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      if (mounted) {
        setReady(Boolean(data.session));
      }
    }

    if (isSupabaseConfigured) {
      checkSession();
    }

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Parolele nu coincid.");
      setLoading(false);
      return;
    }

    const supabase = isSupabaseConfigured ? createSupabaseBrowserClient() : null;
    if (supabase) {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.status === 429 ? "Au fost prea multe încercări. Așteaptă puțin și încearcă din nou." : "Linkul de resetare nu mai este valid.");
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();
    }

    window.location.href = "/login?reason=password_updated";
  }

  if (!ready) {
    return <AuthNotice tone="warning" title="Linkul de resetare nu mai este valid" message="Cere un link nou pentru a continua în siguranță." />;
  }

  return (
    <>
      {error ? <AuthNotice tone="error" title="Nu am putut actualiza parola" message={error} /> : null}
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <PasswordField name="password" label="Parolă nouă" autoComplete="new-password" />
        <PasswordField name="confirmPassword" label="Confirmă parola nouă" autoComplete="new-password" placeholder="Repetă parola" />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Se actualizează..." : "Actualizează parola"}
        </Button>
      </form>
    </>
  );
}
