"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { PasswordField } from "@/components/auth/PasswordField";
import { SignupConfirmationPanel } from "@/components/auth/SignupConfirmationPanel";
import { authConfirmationRedirectUrl } from "@/lib/auth/confirmation";
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
  if (message.includes("already registered") || message.includes("already exists") || message.includes("user already")) return "Nu am putut finaliza crearea contului. Verifică datele sau intră în cont dacă ai deja acces.";
  if (message.includes("password")) return "Parola nu respectă cerințele minime. Folosește cel puțin 8 caractere.";
  if (message.includes("email not confirmed")) return "Trebuie să confirmi emailul înainte de a continua.";
  if (message.includes("invalid login")) return "Emailul sau parola nu sunt corecte.";
  return fallback;
}

function ErrorSummary({ errors }: { errors: FieldErrors<SignupField> }) {
  const entries = Object.entries(errors).filter((entry): entry is [SignupField, string] => Boolean(entry[1]));
  if (!entries.length) return null;

  return (
    <div className="mt-5 rounded-control border border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] p-4 text-sm text-[rgb(var(--danger-text))]" role="alert" tabIndex={-1}>
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
  return message ? <p id={id} className="mt-2 text-sm text-[rgb(var(--danger-text))]">{message}</p> : null;
}

const signupSteps = [
  { label: "Identitate", detail: "Date de contact" },
  { label: "Acces", detail: "Email și parolă" },
  { label: "Control", detail: "Termeni și limite" },
  { label: "Confirmare", detail: "Revizuire finală" }
] as const;
export function AuthForm({ mode, intent: rawIntent }: AuthFormProps) {
  const isSignup = mode === "signup";
  const intent = sanitizeAuthIntent(rawIntent, isSignup ? "create_account" : "login");
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<SignupField>>({});
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [passwordLength, setPasswordLength] = useState(0);
  const [signupStep, setSignupStep] = useState(0);
  const signupFormRef = useRef<HTMLFormElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
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

  function validateTouchedField(field: SignupField, form: HTMLFormElement | null) {
    if (!form) return;
    let message: string | undefined;
    if (isSignup) {
      const result = validateSignup(new FormData(form));
      message = result.ok ? undefined : result.errors[field];
    } else if (field === "email") {
      const result = validateEmail(new FormData(form).get("email"));
      message = result.ok ? undefined : result.error;
    }
    setErrors((current) => {
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }
  function moveToSignupStep(nextStep: number) {
    setSignupStep(nextStep);
    window.requestAnimationFrame(() => stepHeadingRef.current?.focus());
  }

  function advanceSignup(form: HTMLFormElement | null) {
    if (!form) return;
    const fieldsByStep: SignupField[][] = [
      ["fullName", "phone"],
      ["email", "password", "confirmPassword"],
      ["acceptedTerms"],
      []
    ];
    const validation = validateSignup(new FormData(form));
    const stepErrors: FieldErrors<SignupField> = {};
    if (!validation.ok) {
      for (const field of fieldsByStep[signupStep]) {
        const message = validation.errors[field];
        if (message) stepErrors[field] = message;
      }
    }
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length) {
      focusFirstError(stepErrors);
      return;
    }
    moveToSignupStep(Math.min(signupStep + 1, signupSteps.length - 1));
  }

  function reviewValue(name: SignupField) {
    return String(signupFormRef.current ? new FormData(signupFormRef.current).get(name) ?? "" : "");
  }
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSignup && signupStep < signupSteps.length - 1) {
      advanceSignup(event.currentTarget);
      return;
    }

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
          emailRedirectTo: authConfirmationRedirectUrl(window.location.origin)
        }
      });

      if (signUpError || !data.user) {
        console.error("Supabase signup error", { name: signUpError?.name, status: signUpError?.status });
        setNotice({ tone: "error", title: "Nu am putut crea contul", message: authErrorMessage(signUpError, "Contul nu a putut fi creat momentan. Încearcă din nou.") });
        setLoading(false);
        return;
      }

      if (data.session) {
        window.location.assign(`/auth/bootstrap?${authIntentQuery(intent)}`);
        return;
      }

      setConfirmationEmail(validated.email);
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
      {confirmationEmail ? (
        <SignupConfirmationPanel
          email={confirmationEmail}
          intent={intent}
          onChangeEmail={() => {
            setConfirmationEmail("");
            setNotice(null);
          }}
        />
      ) : null}

      {!confirmationEmail ? (
        <>
      {notice ? <AuthNotice tone={notice.tone} title={notice.title} message={notice.email ? `${notice.message} ${notice.email}` : notice.message} /> : null}

      <div ref={errorSummaryRef}>
        <ErrorSummary errors={errors} />
      </div>

      <form ref={signupFormRef} onSubmit={handleSubmit} className={isSignup ? "signup-step-form mt-7" : "mt-6 space-y-4 rounded-panel border border-[rgb(var(--border-strong)/0.82)] bg-[rgb(var(--surface))] p-5 shadow-card sm:p-6"} noValidate>
        {isSignup ? (
          <ol className="signup-stepper" aria-label="Progres creare cont">
            {signupSteps.map((step, index) => {
              const isCurrent = index === signupStep;
              const isComplete = index < signupStep;
              return (
                <li key={step.label} className={isCurrent ? "is-current" : isComplete ? "is-complete" : ""}>
                  <button type="button" onClick={() => isComplete && moveToSignupStep(index)} disabled={!isComplete} aria-current={isCurrent ? "step" : undefined}>
                    <span className="signup-step-number">{isComplete ? "✓" : index + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[0.7rem] font-semibold">{step.label}</span>
                      <span className="mt-0.5 hidden truncate text-[0.62rem] text-[rgb(var(--text-faint))] sm:block">{step.detail}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : null}
        <div className={isSignup ? "signup-step-card" : "contents"}>
          {isSignup ? (
            <header className="border-b border-[rgb(var(--border))] pb-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Pasul {signupStep + 1} din {signupSteps.length}</p>
              <h2 ref={stepHeadingRef} tabIndex={-1} className="mt-2 font-display text-2xl font-semibold tracking-[-0.025em] outline-none">{signupSteps[signupStep].label}</h2>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">
                {signupStep === 0 ? "Datele persoanei care va administra accesul inițial." : signupStep === 1 ? "Credențiale sigure pentru confirmarea contului." : signupStep === 2 ? "Limite clare înainte de activarea spațiului de lucru." : "Verifică datele înainte de trimiterea emailului de confirmare."}
              </p>
            </header>
          ) : null}
        {isSignup ? (
          <>
            <section hidden={signupStep !== 0} className="signup-step-fields" aria-label="Date de identitate">
            <label className="block">
              <span className="text-sm font-medium text-[rgb(var(--foreground))]">Nume complet</span>
              <Input
                id="fullName"
                required
                name="fullName"
                type="text"
                autoComplete="name"
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
                placeholder="Nume Prenume"
                invalid={Boolean(errors.fullName)}
                className="mt-2 min-h-11"
                onBlur={(event) => validateTouchedField("fullName", event.currentTarget.form)}
              />
              <FieldError id="fullName-error" message={errors.fullName} />
            </label>
            <div className="grid gap-3 sm:grid-cols-[0.95fr_1.05fr]">
              <label className="block">
                <span className="text-sm font-medium text-[rgb(var(--foreground))]">Țara numărului</span>
                <Select id="phoneCountry" name="phoneCountry" defaultValue="RO" autoComplete="country" className="mt-2 min-h-11">
                  {countryOptions.map((country) => <option key={country.code} value={country.code}>{country.label} {country.callingCode}</option>)}
                </Select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[rgb(var(--foreground))]">Telefon de contact</span>
                <Input
                  id="phone"
                  required
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "phone-error" : "phone-help"}
                  placeholder="+40 721 000 000"
                  invalid={Boolean(errors.phone)}
                  className="mt-2 min-h-11"
                  onBlur={(event) => validateTouchedField("phone", event.currentTarget.form)}
                />
                <p id="phone-help" className="mt-2 text-xs text-[rgb(var(--text-muted))]">Validăm formatul numărului, nu proprietarul lui.</p>
                <FieldError id="phone-error" message={errors.phone} />
              </label>
            </div>
            </section>
          </>
        ) : null}

        <section hidden={isSignup && signupStep !== 1} className={isSignup ? "signup-step-fields" : "contents"} aria-label={isSignup ? "Date de acces" : undefined}>
        <label className="block">
          <span className="text-sm font-medium text-[rgb(var(--foreground))]">Email</span>
          <Input
            id="email"
            required
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            placeholder="nume@firma.ro"
            invalid={Boolean(errors.email)}
            className="mt-2 min-h-11"
            onBlur={(event) => validateTouchedField("email", event.currentTarget.form)}
          />
          <FieldError id="email-error" message={errors.email} />
        </label>

        <PasswordField name="password" label="Parolă" autoComplete={isSignup ? "new-password" : "current-password"} invalid={Boolean(errors.password)} describedBy={errors.password ? "password-error" : isSignup ? "password-requirement" : undefined} onChange={(event) => setPasswordLength(event.currentTarget.value.length)} onBlur={(event) => validateTouchedField("password", event.currentTarget.form)} />
        {errors.password ? <p id="password-error" className="text-sm text-[rgb(var(--danger-text))]">{errors.password}</p> : null}

        {isSignup ? (
          <>
            <p id="password-requirement" className={`text-xs leading-5 ${passwordLength > 0 && passwordLength < 8 ? "text-[rgb(var(--danger-text))]" : "text-[rgb(var(--text-muted))]"}`} aria-live="polite">{passwordLength > 0 && passwordLength < 8 ? `Mai sunt necesare ${8 - passwordLength} caractere.` : "Folosește cel puțin 8 caractere și evită parolele utilizate în alte servicii."}</p>
            <PasswordField name="confirmPassword" label="Confirmă parola" autoComplete="new-password" placeholder="Repetă parola" invalid={Boolean(errors.confirmPassword)} describedBy={errors.confirmPassword ? "confirmPassword-error" : undefined} onBlur={(event) => validateTouchedField("confirmPassword", event.currentTarget.form)} />
            {errors.confirmPassword ? <p id="confirmPassword-error" className="text-sm text-[rgb(var(--danger-text))]">{errors.confirmPassword}</p> : null}
          </>
        ) : null}
        </section>

        {isSignup ? (
          <section hidden={signupStep !== 2} className="signup-step-fields" aria-label="Control și termeni">
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] p-4">
              <p className="text-sm font-semibold text-[rgb(var(--foreground))]">Controlul rămâne la echipa ta</p>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-[rgb(var(--text-muted))]">
                <li>• Nicio acțiune comercială nu pornește automat.</li>
                <li>• Firma și contextul comercial se configurează după confirmarea emailului.</li>
                <li>• Recomandările rămân verificabile și auditabile.</li>
              </ul>
            </div>
            <label className="flex items-start gap-3 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 text-sm leading-6 text-[rgb(var(--text-muted))]">
              <input id="acceptedTerms" required name="acceptedTerms" type="checkbox" aria-invalid={Boolean(errors.acceptedTerms)} aria-describedby={errors.acceptedTerms ? "acceptedTerms-error" : undefined} className="mt-1 h-4 w-4 rounded border-[rgb(var(--border-strong))] bg-transparent accent-[rgb(var(--primary))]" />
              <span>Accept <Link href="/terms" className="font-semibold text-[rgb(var(--primary))] hover:underline">Termenii</Link> și <Link href="/privacy" className="font-semibold text-[rgb(var(--primary))] hover:underline">Politica de confidențialitate</Link>.</span>
            </label>
            <FieldError id="acceptedTerms-error" message={errors.acceptedTerms} />
          </section>
        ) : null}
        {isSignup ? (
          <section hidden={signupStep !== 3} className="signup-step-fields" aria-label="Revizuire creare cont">
            <dl className="divide-y divide-[rgb(var(--border))] rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4">
              {[["Administrator", reviewValue("fullName")], ["Email", reviewValue("email")], ["Telefon", reviewValue("phone")]].map(([label, value]) => (
                <div key={label} className="grid gap-1 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
                  <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">{label}</dt>
                  <dd className="break-words text-sm font-medium text-[rgb(var(--foreground))]">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="rounded-xl border border-[rgb(var(--primary)/0.38)] bg-[rgb(var(--primary)/0.08)] p-4 text-sm leading-6 text-[rgb(var(--text-muted))]">
              După creare, confirmi emailul și continui cu firma, contextul comercial și primul flux. ReveNew nu inițiază acțiuni în numele tău.
            </div>
          </section>
        ) : null}

        {!isSignup ? (
          <div className="flex justify-end">
            <Link href="/forgot-password" className="focus-ring rounded px-1 text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Ai uitat parola?</Link>
          </div>
        ) : null}

        {isSignup ? (
          <div className="mt-7 flex items-center gap-3 border-t border-[rgb(var(--border))] pt-5">
            {signupStep > 0 ? <Button type="button" variant="ghost" className="px-3" onClick={() => moveToSignupStep(signupStep - 1)}>Înapoi</Button> : null}
            {signupStep < signupSteps.length - 1 ? (
              <Button type="button" className="ml-auto min-w-36" onClick={() => advanceSignup(signupFormRef.current)}>Continuă</Button>
            ) : (
              <Button type="submit" className="ml-auto min-w-44" disabled={loading}>{loading ? "Se creează contul..." : "Creează contul"}</Button>
            )}
          </div>
        ) : (
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Se procesează..." : "Intră în cont"}</Button>
        )}
        </div>
      </form>
        </>
      ) : null}
    </>
  );
}
