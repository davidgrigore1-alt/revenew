import { AuthCardShell } from "@/components/auth/AuthCardShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <AuthCardShell
      eyebrow="PAROLĂ NOUĂ"
      title="Setează o parolă nouă"
      description="Alege o parolă sigură pentru contul tău ReveNew."
      footerPrompt="Nu ai cerut resetarea?"
      footerHref="/login"
      footerLabel="Înapoi la autentificare"
    >
      <ResetPasswordForm />
    </AuthCardShell>
  );
}
