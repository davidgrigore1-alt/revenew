import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/dashboard/PageShell";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ActionPreview } from "@/components/intelligence/ActionPreview";
import { getPreparedWorkRegistry } from "@/lib/prepared-work-registry";
import { formatProductDate } from "@/lib/ui/presentation";

export const dynamic = "force-dynamic";

const groups = [
  { key: "ready_for_review", title: "Necesită revizuire", description: "Pregătit pentru control uman." },
  { key: "approved", title: "Aprobate, încă neexecutate", description: "Decizia există; execuția este separată." },
  { key: "prepared", title: "Drafturi pregătite", description: "Fără aprobare și fără execuție externă." }
] as const;

export default async function PreparedWorkPage(props: { searchParams?: Promise<{ item?: string }> }) {
  const searchParams = await props.searchParams;
  const registry = await getPreparedWorkRegistry();
  const requestedId = typeof searchParams?.item === "string" ? searchParams.item : undefined;
  const selected = registry.items.find((item) => item.id === requestedId) ?? registry.items[0];

  return (
    <PageShell
      eyebrow="Execuție controlată"
      title="Lucru pregătit"
      actions={<Button href="/outreach" variant="secondary">Studio de follow-up</Button>}
      description="Revizuiește lucru persistent și context autorizat înainte de orice decizie sau execuție"
    >
      <section aria-label="Starea lucrului pregătit" className="flex flex-wrap gap-x-6 gap-y-2 border-y border-[rgb(var(--border))] py-2.5 text-xs text-[rgb(var(--text-muted))]">
        <span><strong className="tabular-nums text-[rgb(var(--warning-text))]">{registry.counts.review}</strong> pentru revizuire</span>
        <span><strong className="tabular-nums text-[rgb(var(--success-text))]">{registry.counts.approved}</strong> aprobate, neexecutate</span>
        <span><strong className="tabular-nums text-[rgb(var(--foreground))]">{registry.counts.prepared}</strong> pregătite</span>
      </section>

      {registry.items.length && selected ? (
        <div className="mt-3 grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(17rem,21rem)_minmax(0,1fr)]">
          <nav aria-label="Coada lucrului pregătit" className={`${requestedId ? "hidden xl:block" : "block"} xl:max-h-[calc(100dvh-17rem)]`}>
            <div className="flex flex-col overflow-hidden rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] xl:max-h-[calc(100dvh-17rem)]">
              <div className="shrink-0 border-b border-[rgb(var(--border))] px-4 py-3">
                <h2 className="text-sm font-semibold">Coadă de decizie</h2>
                <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Ordine: revizuire, aprobat neexecutat, draft; apoi termen.</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {groups.map((group) => {
                  const items = registry.items.filter((item) => item.status === group.key);
                  if (!items.length) return null;
                  return (
                    <section key={group.key} aria-labelledby={`prepared-${group.key}`} className="border-b border-[rgb(var(--border))] last:border-b-0">
                      <div className="bg-[rgb(var(--surface-subtle))] px-4 py-2.5">
                        <div className="flex items-center justify-between gap-3"><h3 id={`prepared-${group.key}`} className="text-xs font-semibold">{group.title}</h3><span className="text-xs tabular-nums text-[rgb(var(--text-muted))]">{items.length}</span></div>
                        <p className="mt-0.5 text-[0.6875rem] text-[rgb(var(--text-muted))]">{group.description}</p>
                      </div>
                      <ul>{items.map((item) => {
                        const active = item.id === selected.id;
                        return <li key={item.id} className="border-t border-[rgb(var(--border))] first:border-t-0"><Link aria-current={active ? "page" : undefined} href={`/prepared?item=${encodeURIComponent(item.id)}`} scroll={false} className={`focus-ring group flex min-h-[3.75rem] min-w-0 items-center gap-3 border-l-2 px-3.5 py-2.5 transition-colors hover:bg-[rgb(var(--surface-subtle))] ${active ? "border-[rgb(var(--interaction))] bg-[rgb(var(--interaction)/0.08)]" : "border-transparent"}`}><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{item.title}</p><p className="mt-1 truncate text-[0.6875rem] text-[rgb(var(--text-muted))]">{item.target.label}{item.deadline ? ` · termen ${formatProductDate(item.deadline, { year: false })}` : ""}</p></div><ChevronRightIcon className={`h-4 w-4 shrink-0 ${active ? "text-[rgb(var(--interaction))]" : "text-[rgb(var(--text-faint))] group-hover:text-[rgb(var(--primary))]"}`} aria-hidden="true" /></Link></li>;
                      })}</ul>
                    </section>
                  );
                })}
              </div>
            </div>
          </nav>

          <section aria-label="Detaliul lucrului selectat" className={`${requestedId ? "block" : "hidden xl:block"} xl:max-h-[calc(100dvh-17rem)]`}>
            <Link href="/prepared" className="focus-ring mb-3 inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-[rgb(var(--primary))] hover:underline xl:hidden"><ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />Înapoi la coadă</Link>
            <ActionPreview item={selected} />
          </section>
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState title="Nu există lucru pregătit" description="Când ReveNew salvează un email, un document sau o actualizare controlată, aceasta apare aici pentru revizuire. Nimic nu este executat automat." actions={<Button href="/outreach" size="small">Pregătește un follow-up</Button>} />
        </div>
      )}
    </PageShell>
  );
}
