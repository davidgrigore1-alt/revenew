import Link from "next/link";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";

export function EmailVerificationPanel({ invalidLink = false }: { invalidLink?: boolean }) {
  return (
    <div className="mt-8 grid gap-5">
      <div className="rounded-card border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] p-5 text-sm leading-6 text-[rgb(var(--warning-text))]">
        <ExclamationTriangleIcon className="size-6" aria-hidden="true" />
        <p className="mt-3 font-semibold">{invalidLink ? "Linkul de confirmare nu mai poate fi folosit." : "Confirmă adresa din emailul primit."}</p>
        <p className="mt-2 opacity-90">{invalidLink ? "Revino la înregistrare pentru a retrimite mesajul sau autentifică-te dacă adresa a fost deja confirmată." : "După confirmare, ReveNew va pregăti automat următorul pas al contului."}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button href="/signup?intent=create_account">Reia înregistrarea</Button>
        <Link href="/login" className="focus-ring inline-flex min-h-11 items-center justify-center rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-sm font-semibold text-[rgb(var(--foreground))] hover:border-[rgb(var(--border-strong))]">Intră în cont</Link>
      </div>
    </div>
  );
}
