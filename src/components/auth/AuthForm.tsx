"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ensureCurrentProfile, getPostLoginDestination } from "@/lib/auth/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/status";

type AuthFormProps = {
  mode: "login" | "signup";
};

function isRateLimitError(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && error.status === 429;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    if (!isSupabaseConfigured) {
      window.setTimeout(() => router.push(isSignup ? "/onboarding" : "/dashboard"), 300);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Serviciul de autentificare nu este configurat.");
      setLoading(false);
      return;
    }

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    if (isSignup) {
      const fullName = String(form.get("fullName") ?? "");
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });

      if (signUpError || !data.user) {
        console.error("Supabase signup error", signUpError ?? data);
        setError(
          isRateLimitError(signUpError)
            ? "Prea multe încercări de creare cont. Așteaptă câteva minute și încearcă din nou sau intră în cont dacă userul există deja."
            : signUpError?.message ?? "Signup eșuat. Verifică emailul și parola."
        );
        setLoading(false);
        return;
      }

      const profileResult = await ensureCurrentProfile(fullName);
      if (!profileResult.ok) {
        console.error("Supabase profile ensure error", profileResult);
        setError(profileResult.error ?? "Profilul nu a putut fi creat.");
        setLoading(false);
        return;
      }

      router.push("/onboarding");
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      console.error("Supabase login error", loginError);
      setError(loginError.message ?? "Login eșuat. Verifică emailul și parola.");
      setLoading(false);
      return;
    }

    const destination = await getPostLoginDestination();
    if (!destination.ok) {
      console.error("Supabase post-login destination error", destination);
      setError(destination.error ?? "Nu am putut verifica firma conectată.");
      setLoading(false);
      return;
    }

    router.push(destination.destination ?? "/onboarding");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      {isSignup ? (
        <label className="block">
          <span className="text-sm font-medium text-zinc-300">Nume complet</span>
          <input
            required
            name="fullName"
            type="text"
            placeholder="Nume Prenume"
            className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-mint-400/60"
          />
        </label>
      ) : null}
      <label className="block">
        <span className="text-sm font-medium text-zinc-300">Email</span>
        <input
          required
          name="email"
          type="email"
          placeholder="nume@firma.ro"
          className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-mint-400/60"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-zinc-300">Parolă</span>
        <input
          required
          name="password"
          minLength={8}
          type="password"
          placeholder="Minim 8 caractere"
          className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-mint-400/60"
        />
      </label>
      <Button type="submit" className="w-full">
        {loading ? "Se procesează..." : isSignup ? "Creează cont" : "Intră în cont"}
      </Button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </form>
  );
}
