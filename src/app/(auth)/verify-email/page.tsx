import { AuthCardShell } from "@/components/auth/AuthCardShell";
import { EmailVerificationPanel } from "@/components/auth/EmailVerificationPanel";

export default function VerifyEmailPage() {
  return (
    <AuthCardShell
      eyebrow="CONFIRMARE"
      title="Verifică adresa de email"
      description="Confirmarea emailului protejează accesul la spațiul firmei."
      footerPrompt="Ai confirmat deja?"
      footerHref="/login?reason=email_confirmed"
      footerLabel="Intră în cont"
    >
      <EmailVerificationPanel />
    </AuthCardShell>
  );
}
