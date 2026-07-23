import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthenticatedAccountChoice } from "@/components/auth/AuthenticatedAccountChoice";
import { AuthCardShell } from "@/components/auth/AuthCardShell";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { authPath, sanitizeAuthIntent } from "@/lib/auth/redirects";
import { resolveAuthPageState } from "@/lib/auth/auth-state";

const loginReasons = {
  session_expired: {
    tone: "warning",
    title: "Sesiunea a expirat",
    message: "Intră din nou în cont pentru a continua."
  },
  signed_out: {
    tone: "success",
    title: "Ai ieșit din cont în siguranță.",
    message: ""
  },
  email_confirmed: {
    tone: "success",
    title: "Emailul a fost confirmat. Acum te poți autentifica.",
    message: ""
  },
  email_confirmation_sent: {
    tone: "success",
    title: "Verifică adresa de email",
    message: "Dacă nu găsești mesajul, verifică și folderul Spam."
  },
  password_updated: {
    tone: "success",
    title: "Parola a fost actualizată",
    message: "Intră în cont cu noua parolă."
  },
  account_switched: {
    tone: "success",
    title: "Poți folosi alt cont",
    message: "Sesiunea anterioară a fost închisă."
  },
  invalid_link: {
    tone: "warning",
    title: "Linkul nu mai este valid",
    message: "Deschide cel mai recent email sau cere un link nou."
  }
} as const;

function LoginReasonNotice({ reason }: { reason?: string }) {
  const safeReason = reason && reason in loginReasons ? loginReasons[reason as keyof typeof loginReasons] : null;
  if (!safeReason) {
    return null;
  }

  return <AuthNotice tone={safeReason.tone} title={safeReason.title} message={safeReason.message} />;
}

function RetryAuthState() {
  return (
    <div className="mt-6">
      <AuthNotice tone="warning" title="Autentificarea nu este disponibilă momentan" message="Încearcă din nou în câteva momente." />
      <Link href="/login" className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-mint-400 px-4 text-sm font-semibold text-ink-950 transition hover:bg-mint-300">
        Reîncearcă
      </Link>
    </div>
  );
}

export default async function LoginPage({ searchParams }: { searchParams?: { intent?: string; reason?: string } }) {
  const intent = sanitizeAuthIntent(searchParams?.intent, "login");
  const state = await resolveAuthPageState();

  if (state.status === "stale_session") {
    redirect("/auth/recover-session?next=/login?reason=session_expired");
  }

  let content: React.ReactNode;

  if (state.status === "authenticated") {
    content = <AuthenticatedAccountChoice email={state.email} intent={intent} mode="login" />;
  } else if (state.status === "temporary_auth_failure" || state.status === "unexpected_auth_failure") {
    content = <RetryAuthState />;
  } else if (state.status === "authenticated_unconfirmed") {
    content = <AuthNotice tone="warning" title="Verifică adresa de email" message="Confirmă emailul înainte de a continua în ReveNew." />;
  } else {
    content = (
      <>
        <LoginReasonNotice reason={searchParams?.reason} />
        <AuthForm mode="login" intent={intent} />
      </>
    );
  }

  return (
    <AuthCardShell
      eyebrow="AUTENTIFICARE"
      title="Intră în ReveNew"
      description="Continuă lucrul în spațiul firmei: priorități, responsabilitate și următoarele acțiuni comerciale."
      trustLine="Acces protejat. Datele fiecărei firme rămân izolate în propriul spațiu de lucru."
      footerPrompt="Nu ai cont?"
      footerHref={authPath("/signup", "create_account")}
      footerLabel="Creează unul"
    >
      {content}
    </AuthCardShell>
  );
}
