import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/dashboard/PageShell";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ActionPreview } from "@/components/intelligence/ActionPreview";
import { getPreparedWorkRegistry } from "@/lib/prepared-work-registry";

export const dynamic = "force-dynamic";

export default async function PreparedWorkPage() {
  const registry = await getPreparedWorkRegistry();
  const groups = [
    { key: "ready_for_review", title: "Necesită revizuire", description: "Verifică propunerea, contextul și dovezile înainte de orice pas următor." },
    { key: "prepared", title: "Drafturi pregătite", description: "Conținut editabil, fără aprobare și fără execuție externă." },
    { key: "approved", title: "Aprobate, încă neexecutate", description: "Decizia este înregistrată, dar trimiterea sau aplicarea rămâne un pas separat." }
  ] as const;
  return (
    <PageShell
      eyebrow="Execuție controlată"
      title="Lucru pregătit"
      actions={<Button href="/outreach" variant="secondary">Studio de follow-up</Button>}
      description="Drafturi și actualizări pregătite din context autorizat, înainte de orice decizie sau execuție"
    >
      <div className="grid gap-5">
        <section aria-label="Starea lucrului pregătit" className="flex flex-wrap gap-x-6 gap-y-2 border-y border-[rgb(var(--border))] py-3 text-xs text-[rgb(var(--text-muted))]">
          <span><strong className="tabular-nums text-[rgb(var(--warning-text))]">{registry.counts.review}</strong> pentru revizuire</span>
          <span><strong className="tabular-nums text-[rgb(var(--foreground))]">{registry.counts.prepared}</strong> pregătite</span>
          <span><strong className="tabular-nums text-[rgb(var(--success-text))]">{registry.counts.approved}</strong> aprobate</span>
        </section>
        {registry.items.length ? <div className="grid gap-7">{groups.map((group) => {
          const items = registry.items.filter((item) => item.status === group.key);
          if (!items.length) return null;
          return <section key={group.key} aria-labelledby={`prepared-${group.key}`}><div className="flex items-end justify-between gap-4 border-b border-[rgb(var(--border))] pb-3"><div><h2 id={`prepared-${group.key}`} className="text-sm font-semibold">{group.title}</h2><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{group.description}</p></div><span className="text-xs tabular-nums text-[rgb(var(--text-muted))]">{items.length}</span></div><div className="mt-4 grid gap-4">{items.map((item) => <ActionPreview key={item.id} item={item} />)}</div></section>;
        })}</div> : <EmptyState title="Nu există lucru pregătit" description="Când ReveNew pregătește un email, un document sau o actualizare controlată, aceasta apare aici pentru revizuire. Nimic nu este executat automat." actions={<Button href="/outreach" size="small">Pregătește un follow-up</Button>} />}
      </div>
    </PageShell>
  );
}