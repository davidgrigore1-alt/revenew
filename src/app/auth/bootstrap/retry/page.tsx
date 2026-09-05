import { AuthTheme } from "@/components/auth/AuthTheme";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default function BootstrapRetryPage() {
  return (
    <AuthTheme>
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-lg items-center">
          <section className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-2xl shadow-black/30">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Sesiune activă</p>
            <h1 className="mt-3 text-2xl font-semibold">Nu am putut deschide spațiul firmei</h1>
            <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-muted))]">
              Sesiunea este activă, dar nu am putut finaliza încărcarea contului. Reîncearcă.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button href="/auth/bootstrap" className="min-h-11 px-5">
                Reîncearcă
              </Button>
              <Button href="/auth/switch-account?mode=login&intent=login&next=%2Flogin%3Fintent%3Dlogin" variant="secondary" className="min-h-11 px-5">
                Folosește alt cont
              </Button>
            </div>
          </section>
        </div>
      </main>
    </AuthTheme>
  );
}
