"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { PasswordField } from "@/components/auth/PasswordField";
import { authIntentQuery, sanitizeAuthIntent, type AuthIntent } from "@/lib/auth/redirects";
import { countryOptions, validateEmail, validateInternationalPhone, validatePersonName, type FieldErrors } from "@/lib/forms/validation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/status";

type AuthFormProps = {
  mode: "login" | "signup";
  intent?: AuthIntent;
};

type SignupField = "fullName" | "phoneCountry" | "phone" | "email" | "password" | "confirmPassword" | "acceptedTerms";

type NoticeState = {
  tone: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
  email?: string;
};

function isRateLimitError(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && error.status === 429;
}

function authErrorMessage(error: unknown, fallback: string) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message).toLowerCase() : "";

  if (isRateLimitError(error)) return "Au fost prea multe încercări. Așteaptă puțin și încearcă din nou.";
  if (message.includes("already registered") || message.includes("already exists") || message.includes("user already")) return "Acest email este deja folosit. Intră în cont sau folosește alt email.";
  if (message.includes("password")) return "Parola nu respectă cerințele minime. Folosește cel puțin 8 caractere.";
  if (message.includes("email not confirmed")) return "Trebuie să confirmi emailul înainte de a continua.";
  if (message.includes("invalid login")) return "Emailul sau parola nu sunt corecte.";
  return fallback;
}

function ErrorSummary({ errors }: { errors: FieldErrors<SignupField> }) {
  const entries = Object.entries(errors).filter((entry): entry is [SignupField, string] => Boolean(entry[1]));
  if (!entries.length) return null;

  return (
    <div className="mt-5 rounded-lg border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-100" role="alert" tabIndex={-1}>
      <p className="font-semibold">Verifică aceste câmpuri:</p>
      <ul className="mt-2 grid gap-1">
        {entries.map(([field, message]) => (
          <li key={field}>
            <a href={`#${field}`} className="underline underline-offset-4">{message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="mt-2 text-sm text-red-300">{message}</p> : null;
}

export function AuthForm({ mode, intent: rawIntent }: AuthFormProps) {
  const isSignup = mode === "signup";
  const intent = sanitizeAuthIntent(rawIntent, isSignup ? "create_account" : "login");
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<SignupField>>({});
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  function focusFirstError(nextErrors: FieldErrors<SignupField>) {
    const first = Object.keys(nextErrors)[0];
    if (!first) return;
    window.requestAnimationFrame(() => {
      document.getElementById(first)?.focus();
      errorSummaryRef.current?.scrollIntoView({ block: "nearest" });
    });
  }

  function validateSignup(form: FormData) {
    const nextErrors: FieldErrors<SignupField> = {};
    const fullName = validatePersonName(form.get("fullName"));
    const email = validateEmail(form.get("email"));
    const phoneCountry = String(form.get("phoneCountry") ?? "RO");
    const phone = validateInternationalPhone(form.get("phone"), phoneCountry, "Telefonul de contact");
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (!fullName.ok) nextErrors.fullName = fullName.error;
    if (!email.ok) nextErrors.email = email.error;
    if (!phone.ok) nextErrors.phone = phone.error;
    if (!password || password.length < 8) nextErrors.password = "Folosește o parolă de cel puțin 8 caractere.";
    if (password !== confirmPassword) nextErrors.confirmPassword = "Parolele nu coincid.";
    if (form.get("acceptedTerms") !== "on") nextErrors.acceptedTerms = "Acceptă termenii pentru a continua.";

    if (Object.keys(nextErrors).length) {
      return { ok: false as const, errors: nextErrors };
    }

    return { ok: true as const, fullName: fullName.value ?? "", email: email.value ?? "", phone: phone.value ?? "" };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setNotice(null);
    setErrors({});
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const emailResult = validateEmail(form.get("email"));
    const email = emailResult.ok ? emailResult.value : String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    if (isSignup) {
      const validated = validateSignup(form);
      if (!validated.ok) {
        setErrors(validated.errors);
        focusFirstError(validated.errors);
        setLoading(false);
        return;
      }
    } else if (!emailResult.ok) {
      const nextErrors = { email: emailResult.error };
      setErrors(nextErrors);
      focusFirstError(nextErrors);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      window.setTimeout(() => {
        window.location.href = `/auth/bootstrap?${authIntentQuery(intent)}`;
      }, 250);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setNotice({ tone: "error", title: "Autentificarea nu este disponibilă momentan", message: "Încearcă din nou în câteva momente." });
      setLoading(false);
      return;
    }

    if (isSignup) {
      const validated = validateSignup(form);
      if (!validated.ok) {
        setErrors(validated.errors);
        focusFirstError(validated.errors);
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: validated.email,
        password,
        options: {
          data: {
            full_name: validated.fullName,
            phone: validated.phone
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/bootstrap`
        }
      });

      if (signUpError || !data.user) {
        console.error("Supabase signup error", { name: signUpError?.name, status: signUpError?.status });
        setNotice({ tone: "error", title: "Nu am putut crea contul", message: authErrorMessage(signUpError, "Contul nu a putut fi creat momentan. Încearcă din nou.") });
        setLoading(false);
        return;
      }

      setNotice({
        tone: "success",
        title: "Verifică adresa de email",
        message: "Ți-am trimis un email de confirmare. După verificare, revino în ReveNew pentru a configura firma.",
        email: validated.email
      });
      setLoading(false);
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      console.error("Supabase login error", { name: loginError.name, status: loginError.status });
      setNotice({ tone: "error", title: "Nu am putut intra în cont", message: authErrorMessage(loginError, "Emailul sau parola nu sunt corecte.") });
      setLoading(false);
      return;
    }

    window.location.href = `/auth/bootstrap?${authIntentQuery(intent)}`;
  }

  return (
    <>
      {notice ? <AuthNotice tone={notice.tone} title={notice.title} message={notice.email ? `${notice.message} ${notice.email}` : notice.message} /> : null}

      {notice?.tone === "success" && isSignup ? (
        <div className="mt-5 grid gap-3">
          <Button type="button" onClick={() => (window.location.href = "/login?reason=email_confirmation_sent")} variant="secondary">
            Înapoi la autentificare
          </Button>
        </div>
      ) : null}

      <div ref={errorSummaryRef}>
        <ErrorSummary errors={errors} />
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        {isSignup ? (
          <>
            <label className="block">
              <span className="text-sm font-medium text-zinc-300">Nume complet</span>
              <input
                id="fullName"
                required
                name="fullName"
                type="text"
                autoComplete="name"
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
                placeholder="Nume Prenume"
                className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-mint-400/60"
              />
              <FieldError id="fullName-error" message={errors.fullName} />
            </label>
            <div className="grid gap-3 sm:grid-cols-[0.95fr_1.05fr]">
              <label className="block">
                <span className="text-sm font-medium text-zinc-300">Țara numărului</span>
                <select id="phoneCountry" name="phoneCountry" defaultValue="RO" autoComplete="country" className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-900 px-3 text-white outline-none transition focus:border-mint-400/60">
                  {countryOptions.map((country) => <option key={country.code} value={country.code}>{country.label} {country.callingCode}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-zinc-300">Telefon de contact</span>
                <input
                  id="phone"
                  required
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "phone-error" : "phone-help"}
                  placeholder="+40 721 000 000"
                  className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-mint-400/60"
                />
                <p id="phone-help" className="mt-2 text-xs text-zinc-500">Validăm formatul numărului, nu proprietarul lui.</p>
                <FieldError id="phone-error" message={errors.phone} />
              </label>
            </div>
          </>
        ) : null}

        <label className="block">
          <span className="text-sm font-medium text-zinc-300">Email</span>
          <input
            id="email"
            required
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            placeholder="nume@firma.ro"
            className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-mint-400/60"
          />
          <FieldError id="email-error" message={errors.email} />
        </label>

        <PasswordField name="password" label="Parolă" autoComplete={isSignup ? "new-password" : "current-password"} />
        {errors.password ? <p id="password-error" className="text-sm text-red-300">{errors.password}</p> : null}

        {isSignup ? (
          <>
            <p className="text-xs leading-5 text-zinc-500">Parola trebuie să respecte politica Supabase configurată pentru proiect. Folosește cel puțin 8 caractere.</p>
            <PasswordField name="confirmPassword" label="Confirmă parola" autoComplete="new-password" placeholder="Repetă parola" />
            {errors.confirmPassword ? <p id="confirmPassword-error" className="text-sm text-red-300">{errors.confirmPassword}</p> : null}
            <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-zinc-300">
              <input id="acceptedTerms" required name="acceptedTerms" type="checkbox" aria-invalid={Boolean(errors.acceptedTerms)} aria-describedby={errors.acceptedTerms ? "acceptedTerms-error" : undefined} className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent accent-mint-400" />
              <span>
                Accept{" "}
                <Link href="/terms" className="font-semibold text-mint-300 hover:text-mint-200">Termenii</Link>{" "}
                și{" "}
                <Link href="/privacy" className="font-semibold text-mint-300 hover:text-mint-200">Politica de confidențialitate</Link>
              </span>
            </label>
            <FieldError id="acceptedTerms-error" message={errors.acceptedTerms} />
          </>
        ) : null}

        {!isSignup ? (
          <div className="flex justify-end">
            <Link href="/forgot-password" className="focus-ring rounded px-1 text-sm font-semibold text-mint-300 hover:text-mint-200">Ai uitat parola?</Link>
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Se procesează..." : isSignup ? "Creează contul" : "Intră în cont"}
        </Button>
      </form>
    </>
  );
}
