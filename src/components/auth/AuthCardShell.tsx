import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

type AuthCardShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  trustLine?: string;
  accent?: "mint" | "gold";
  children: React.ReactNode;
  footerPrompt: string;
  footerHref: string;
  footerLabel: string;
};

export function AuthCardShell({
  eyebrow,
  title,
  description,
  accent = "mint",
  children,
  footerPrompt,
  footerHref,
  footerLabel,
  trustLine
}: AuthCardShellProps) {
  const accentClass = accent === "gold" ? "text-gold-400" : "text-mint-400";

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,rgba(78,201,176,0.08),transparent_34%),rgb(var(--background))] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900/95 p-6 shadow-premium backdrop-blur">
        <Logo />
        <div className="mt-8">
          <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${accentClass}`}>{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
        </div>

        {children}

        {trustLine ? <p className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-5 text-zinc-400">{trustLine}</p> : null}

        <p className="mt-6 border-t border-white/10 pt-5 text-center text-sm text-zinc-400">
          {footerPrompt}{" "}
          <Link href={footerHref} className="font-semibold text-mint-400 hover:text-mint-300">
            {footerLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
