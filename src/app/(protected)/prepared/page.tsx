import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/dashboard/PageShell";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ActionPreview } from "@/components/intelligence/ActionPreview";
import { getPreparedWorkRegistry } from "@/lib/prepared-work-registry";

export const dynamic = "force-dynamic";

export default async function PreparedWorkPage() {
  const registry = await getPreparedWorkRegistry();
  return (
    <PageShell
      eyebrow="Execuție controlată"
      title="Lucru pregătit"
      actions={<Button href="/outreach" variant="secondary">Studio de follow-up</Button>}
      description="Drafturi și actualizări pregătite din context autorizat, înainte de orice decizie sau execuție."
    >
      <div className="grid gap-5">
        <section aria-label="Starea lucrului pregătit" className="flex flex-wrap gap-x-6 gap-y-2 border-y border-[rgb(var(--border))] py-3 text-xs text-[rgb(var(--text-muted))]">
          <span><strong className="tabular-nums text-[rgb(var(--warning-text))]">{registry.counts.review}</strong> pentru revizuire</span>
          <span><strong className="tabular-nums text-[rgb(var(--foreground))]">{registry.counts.prepared}</strong> pregătite</span>
          <span><strong className="tabular-nums text-[rgb(var(--success-text))]">{registry.counts.approved}</strong> aprobate</span>
        </section>
        {registry.items.length ? <div className="grid gap-4 xl:grid-cols-2">{registry.items.map((item) => <ActionPreview key={item.id} item={item} />)}</div> : <EmptyState title="Nu există lucru pregătit" description="Când ReveNew pregătește un email, un document sau o actualizare controlată, aceasta apare aici pentru revizuire. Nimic nu este executat automat." />}
      </div>
    </PageShell>
  );
}