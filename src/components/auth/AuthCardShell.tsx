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
  const accentClass = accent === "gold" ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--primary))]";

  return (
    <main className="min-h-screen bg-[rgb(var(--background))] px-4 py-4 text-[rgb(var(--foreground))] sm:px-6 sm:py-6 lg:grid lg:place-items-center lg:px-10">
      <section className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-premium lg:min-h-[720px] lg:grid-cols-[minmax(0,0.92fr)_minmax(440px,0.78fr)]">
        <aside className="relative hidden overflow-hidden border-r border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgb(var(--primary)/0.16),transparent_34%),linear-gradient(145deg,transparent_45%,rgb(var(--primary)/0.06))]" />
          <div className="relative">
            <Logo />
            <p className="mt-16 max-w-md font-display text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-[rgb(var(--foreground))] xl:text-5xl">Claritate comercială, înainte de orice acțiune.</p>
            <p className="mt-6 max-w-md text-base leading-7 text-[rgb(var(--text-muted))]">ReveNew transformă semnalele comerciale în oportunități urmărite, cu responsabil, termen și decizie umană.</p>
          </div>
          <div className="relative grid gap-3" aria-label="Principii de încredere ReveNew">
            {["Control uman la fiecare decizie", "Date izolate pe spațiu de lucru", "Fără outreach automat"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.72)] px-4 py-3 text-sm text-[rgb(var(--text-muted))] backdrop-blur">
                <span className="grid size-6 place-items-center rounded-full bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]" aria-hidden="true">✓</span>
                {item}
              </div>
            ))}
          </div>
        </aside>
        <div className="flex min-w-0 items-center px-5 py-8 sm:px-10 lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-[500px]">
            <div className="lg:hidden"><Logo /></div>
            <div className="mt-10 lg:mt-0">
              <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${accentClass}`}>{eyebrow}</p>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] text-[rgb(var(--foreground))] sm:text-4xl">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-muted))]">{description}</p>
            </div>
            {children}
            {trustLine ? <p className="mt-5 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] px-3 py-2.5 text-xs leading-5 text-[rgb(var(--text-muted))]">{trustLine}</p> : null}
            <p className="mt-6 border-t border-[rgb(var(--border))] pt-5 text-center text-sm text-[rgb(var(--text-muted))]">
              {footerPrompt}{" "}
              <Link href={footerHref} className="focus-ring rounded-sm font-semibold text-[rgb(var(--primary))] hover:underline hover:underline-offset-4">{footerLabel}</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
