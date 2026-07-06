import Link from "next/link";

export const dynamic = "force-dynamic";

export default function BootstrapRetryPage() {
  return (
    <main className="min-h-screen bg-ink-950 px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-lg items-center">
        <section className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-mint-300">Sesiune activă</p>
          <h1 className="mt-3 text-2xl font-semibold">Nu am putut deschide spațiul firmei</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Sesiunea este activă, dar nu am putut finaliza încărcarea contului. Reîncearcă.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="/auth/bootstrap" className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg bg-mint-400 px-5 text-sm font-semibold text-ink-950 transition hover:bg-mint-300">
              Reîncearcă
            </Link>
            <Link href="/auth/switch-account?mode=login&intent=login&next=%2Flogin%3Fintent%3Dlogin" className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white transition hover:bg-white/10">
              Folosește alt cont
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
