import { AuthCardShell } from "@/components/auth/AuthCardShell";
import { EmailVerificationPanel } from "@/components/auth/EmailVerificationPanel";

export default function VerifyEmailPage({ searchParams }: { searchParams?: { reason?: string } }) {
  return (
    <AuthCardShell
      eyebrow="CONFIRMARE"
      title="Verifică adresa de email"
      description={searchParams?.reason === "invalid_link" ? "Linkul este expirat, a fost deja folosit sau nu este complet." : "Confirmarea emailului protejează accesul la spațiul firmei."}
      footerPrompt="Ai revenit din formularul de înregistrare?"
      footerHref="/signup?intent=create_account"
      footerLabel="Reia confirmarea"
    >
      <EmailVerificationPanel invalidLink={searchParams?.reason === "invalid_link"} />
    </AuthCardShell>
  );
}
