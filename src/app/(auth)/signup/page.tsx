import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthenticatedAccountChoice } from "@/components/auth/AuthenticatedAccountChoice";
import { AuthCardShell } from "@/components/auth/AuthCardShell";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { authPath, sanitizeAuthIntent } from "@/lib/auth/redirects";
import { resolveAuthPageState } from "@/lib/auth/auth-state";

function RetryAuthState() {
  return (
    <div className="mt-6">
      <AuthNotice tone="warning" title="Autentificarea nu este disponibilă momentan" message="Încearcă din nou în câteva momente." />
      <Link href="/signup" className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-mint-400 px-4 text-sm font-semibold text-ink-950 transition hover:bg-mint-300">
        Reîncearcă
      </Link>
    </div>
  );
}

export default async function SignupPage({ searchParams }: { searchParams?: { intent?: string; reason?: string } }) {
  const intent = sanitizeAuthIntent(searchParams?.intent, "create_account");
  const state = await resolveAuthPageState();

  if (state.status === "stale_session") {
    redirect("/auth/recover-session?next=/login?reason=session_expired");
  }

  let content: React.ReactNode;

  if (state.status === "authenticated") {
    content = <AuthenticatedAccountChoice email={state.email} intent={intent} mode="signup" />;
  } else if (state.status === "temporary_auth_failure" || state.status === "unexpected_auth_failure") {
    content = <RetryAuthState />;
  } else if (state.status === "authenticated_unconfirmed") {
    content = <AuthNotice tone="warning" title="Verifică adresa de email" message="Confirmă emailul înainte de a continua în ReveNew." />;
  } else {
    content = <AuthForm mode="signup" intent={intent} />;
  }

  return (
    <AuthCardShell
      eyebrow="CONT NOU"
      title="Creează contul ReveNew"
      description="Începi cu datele tale de contact. După confirmarea emailului, configurăm firma și contextul comercial."
      accent="gold"
      trustLine="Contul personal nu creează automat o firmă și nu acordă roluri de administrare."
      footerPrompt="Ai deja cont?"
      footerHref={authPath("/login", "login")}
      footerLabel="Intră aici"
    >
      {content}
    </AuthCardShell>
  );
}
