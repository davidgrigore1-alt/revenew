import { Button } from "@/components/ui/Button";
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
      <Button href="/signup" className="mt-5 min-h-11">
        Reîncearcă
      </Button>
    </div>
  );
}

export default async function SignupPage(props: { searchParams?: Promise<{ intent?: string; reason?: string }> }) {
  const searchParams = await props.searchParams;
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
      description="Acesta este primul pas. După confirmarea emailului vei configura firma, contextul comercial și primul flux de lucru."
      accent="gold"
      variant="signup"
      trustLine="Crearea contului nu configurează automat firma și nu pornește acțiuni comerciale în numele tău."
      footerPrompt="Ai deja cont?"
      footerHref={authPath("/login", "login")}
      footerLabel="Intră aici"
    >
      {content}
    </AuthCardShell>
  );
}
