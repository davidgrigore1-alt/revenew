import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { Logo } from "@/components/ui/Logo";
import { getCurrentAuthUser } from "@/lib/auth/profile";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";

export default async function LoginPage() {
  const authUser = await getCurrentAuthUser();

  if (authUser) {
    const currentBusiness = await getCurrentBusinessForUser({ redirectIfMissing: false });
    redirect(currentBusiness?.source === "supabase" ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900/90 p-6 shadow-premium backdrop-blur">
        <Logo />
        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mint-400">Intrare</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Bine ai revenit</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Conectează-te pentru a vedea oportunitățile și pipeline-ul firmei tale.
          </p>
        </div>
        <AuthForm mode="login" />
        <p className="mt-6 text-center text-sm text-zinc-400">
          Nu ai cont?{" "}
          <Link href="/signup" className="font-semibold text-mint-400 hover:text-mint-300">
            Creează unul
          </Link>
        </p>
      </section>
    </main>
  );
}
