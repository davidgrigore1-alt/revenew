import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { Logo } from "@/components/ui/Logo";

export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900/90 p-6 shadow-premium backdrop-blur">
        <Logo />
        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold-400">Start</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Creează workspace</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Pregătește MoneyHunter AI pentru firma ta. Autentificarea reală vine într-o etapă următoare.
          </p>
        </div>
        <AuthForm mode="signup" />
        <p className="mt-6 text-center text-sm text-zinc-400">
          Ai deja cont?{" "}
          <Link href="/login" className="font-semibold text-mint-400 hover:text-mint-300">
            Intră aici
          </Link>
        </p>
      </section>
    </main>
  );
}
