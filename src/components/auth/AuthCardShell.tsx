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
  variant?: "default" | "signup";
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
  trustLine,
  variant = "default"
}: AuthCardShellProps) {
  const accentClass = accent === "gold" ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--primary))]";
  const isSignup = variant === "signup";

  return (
    <main className={`${isSignup ? "signup-premium-theme signup-premium-shell" : ""} min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))] lg:grid lg:grid-cols-[minmax(19rem,0.72fr)_minmax(32rem,1.28fr)]`}>
      <aside className={`relative hidden min-h-screen overflow-hidden border-r border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-9 lg:flex lg:flex-col lg:justify-between xl:p-12 ${isSignup ? "signup-premium-aside" : ""}`}>
          {isSignup ? <div className="pointer-events-none absolute inset-0 subtle-grid opacity-30" /> : null}
          <div className="relative">
            <Logo />
            <p className="mt-16 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">{isSignup ? "Configurare ghidată · 01" : "Acces controlat · 01"}</p>
            <p className="mt-4 max-w-md font-display text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-[rgb(var(--foreground))] xl:text-5xl">{isSignup ? "Un început clar pentru fiecare decizie comercială." : "Revii la firul comercial, nu la un dashboard generic."}</p>
            <p className="mt-5 max-w-md text-base leading-7 text-[rgb(var(--text-muted))]">{isSignup ? "Creezi accesul acum. Firma, contextul comercial și primul flux se configurează controlat după confirmarea emailului." : "Priorități, dovezi, responsabil și următoarea decizie într-un spațiu de lucru izolat."}</p>
          </div>
          <div className="relative grid gap-3" aria-label="Principii de încredere ReveNew">
            {["Control uman la fiecare decizie", "Date izolate pe spațiu de lucru", "Fără outreach automat"].map((item) => (
              <div key={item} className="flex items-center gap-3 border-t border-[rgb(var(--border))] py-3 text-sm text-[rgb(var(--text-muted))]">
                <span className="text-xs font-semibold tabular-nums text-[rgb(var(--primary))]" aria-hidden="true">✓</span>
                {item}
              </div>
            ))}
          </div>
      </aside>
      <section className={`flex min-h-screen min-w-0 items-center px-5 py-10 sm:px-10 lg:px-16 xl:px-24 ${isSignup ? "" : "sm:py-12"}`}>
          <div className={`mx-auto w-full ${isSignup ? "max-w-[620px]" : "max-w-[520px]"}`}>
            <div className="lg:hidden"><Logo /></div>
            <div className={`mt-10 lg:mt-0 ${isSignup ? "" : "border-b border-[rgb(var(--border))] pb-6"}`}>
              <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${accentClass}`}>{eyebrow}</p>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-[rgb(var(--foreground))] sm:text-4xl">{title}</h1>
              <p className={`mt-3 text-[0.9375rem] leading-6 text-[rgb(var(--text-muted))] ${isSignup ? "" : "max-w-[48ch]"}`}>{description}</p>
            </div>
            {children}
            {trustLine ? <p className={isSignup ? "mt-5 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-3 py-2.5 text-[0.8125rem] leading-5 text-[rgb(var(--text-muted))]" : "mt-5 border-l-2 border-[rgb(var(--primary))] px-3 py-1 text-[0.8125rem] leading-5 text-[rgb(var(--text-muted))]"}>{trustLine}</p> : null}
            <p className="mt-6 border-t border-[rgb(var(--border))] pt-5 text-center text-sm text-[rgb(var(--text-muted))]">
              {footerPrompt}{" "}
              <Link href={footerHref} className="focus-ring rounded-sm font-semibold text-[rgb(var(--primary))] hover:underline hover:underline-offset-4">{footerLabel}</Link>
            </p>
          </div>
      </section>
    </main>
  );
}
