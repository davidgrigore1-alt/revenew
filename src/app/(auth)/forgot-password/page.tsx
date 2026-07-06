import { AuthCardShell } from "@/components/auth/AuthCardShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthCardShell
      eyebrow="RESETARE"
      title="Recuperează accesul"
      description="Trimitem un link securizat pentru schimbarea parolei."
      footerPrompt="Ți-ai amintit parola?"
      footerHref="/login"
      footerLabel="Înapoi la autentificare"
    >
      <ForgotPasswordForm />
    </AuthCardShell>
  );
}
