"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export function EmailVerificationPanel() {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  async function resend() {
    if (loading) return;
    setLoading(true);
    setNotice(null);

    const supabase = isSupabaseConfigured ? createSupabaseBrowserClient() : null;
    const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    const email = data.user?.email;

    if (!supabase || !email) {
      setNotice({ tone: "error", message: "Intră din nou în cont pentru a retrimite confirmarea." });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/bootstrap` }
    });

    if (error) {
      setNotice({ tone: "error", message: error.status === 429 ? "Au fost prea multe încercări. Așteaptă puțin." : "Nu am putut retrimite emailul." });
      setLoading(false);
      return;
    }

    setNotice({ tone: "success", message: "Am retrimis emailul de confirmare." });
    window.setTimeout(() => setLoading(false), 30000);
  }

  return (
    <div className="mt-8 grid gap-4">
      {notice ? <AuthNotice tone={notice.tone} title={notice.message} /> : null}
      <div className="rounded-xl border border-emerald-400/25 bg-emerald-950/25 p-5 text-sm leading-6 text-emerald-50">
        <p className="font-semibold">Ți-am trimis un email de confirmare.</p>
        <p className="mt-2 text-emerald-50/80">Dacă nu găsești mesajul, verifică și folderul Spam.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="secondary" onClick={() => (window.location.href = "/login")}>
          Înapoi la autentificare
        </Button>
        <Button type="button" onClick={resend} disabled={loading}>
          {loading ? "Așteaptă puțin..." : "Retrimite emailul"}
        </Button>
      </div>
    </div>
  );
}
