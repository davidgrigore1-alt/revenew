import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";

const chapters = [
  ["Introducere", "/ghid"],
  ["Cum funcționează", "/ghid/cum-functioneaza"],
  ["Oportunități", "/ghid/oportunitati"],
  ["Documente și follow-up", "/ghid/documente-follow-up"],
  ["Planuri și utilizare", "/ghid/planuri-utilizare"],
  ["Integrări și date", "/ghid/integrari-date"]
] as const;

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <MarketingNav />
      <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <nav aria-label="Ghid ReveNew" className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Ghid produs</p>
            <div className="mt-4 grid gap-1">
              {chapters.map(([label, href]) => (
                <Link key={href} href={href} className="focus-ring rounded-lg px-3 py-2 text-sm font-semibold text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]">
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        </aside>
        <div>{children}</div>
      </div>
    </main>
  );
}
