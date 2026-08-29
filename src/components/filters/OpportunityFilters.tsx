import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export type OpportunityFilterState = {
  q?: string; status?: string; lifecycle?: string; commercialType?: string; attention?: string; due?: string; contact?: string; decisionMaker?: string; sort?: string;
};

const filterLabels: Record<string, Record<string, string>> = {
  status: { reviewed: "Lead", contacted: "Calificare", follow_up_needed: "Propunere" },
  attention: { needs_attention: "Necesită atenție", at_risk: "În risc", on_track: "În grafic" },
  lifecycle: { open: "Deschisă", won: "Câștigată", lost: "Pierdută", disqualified: "Descalificată" },
  due: { overdue: "Restant", today: "Astăzi", missing: "Fără acțiune" },
  contact: { present: "Contact prezent", missing: "Fără contact" },
  decisionMaker: { present: "Decident confirmat", missing: "Fără decident" }
};

function queryWithout(filters: OpportunityFilterState, omitted: string) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (key !== omitted && key !== "page" && value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `/opportunities?${serialized}` : "/opportunities";
}

export function OpportunityFilters({ filters }: { filters: OpportunityFilterState }) {
  const activeCount = Object.entries(filters).filter(([key, value]) => key !== "sort" && key !== "page" && Boolean(value)).length;
  const activeFilters = Object.entries(filters).flatMap(([key, value]) => {
    if (!value || key === "sort" || key === "page") return [];
    const label = key === "q" ? `Căutare: ${value}` : filterLabels[key]?.[value];
    return label ? [[key, label] as const] : [];
  });

  return <form method="get" className="grid gap-3">
    <div className="flex snap-x items-end gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-[minmax(16rem,1fr)_11rem_11rem_12rem_auto]">
      <label className="min-w-[15rem] snap-start text-xs font-semibold text-[rgb(var(--text-secondary))] md:min-w-0">Caută
        <Input name="q" defaultValue={filters.q} placeholder="Titlu, context sau acțiune" className="mt-1.5 min-h-9 bg-[rgb(var(--surface-elevated))] font-normal" />
      </label>
      <FilterSelect compact name="status" label="Etapă" value={filters.status} options={[["", "Toate etapele"], ["reviewed", "Lead"], ["contacted", "Calificare"], ["follow_up_needed", "Propunere"]]} />
      <FilterSelect compact name="attention" label="Atenție" value={filters.attention} options={[["", "Orice stare"], ["needs_attention", "Necesită atenție"], ["at_risk", "În risc"], ["on_track", "În grafic"]]} />
      <FilterSelect compact name="sort" label="Ordonare" value={filters.sort} options={[["updated", "Actualizate recent"], ["value", "Valoare estimată"], ["attention", "Prioritate operațională"]]} />
      <div className="flex min-h-9 shrink-0 snap-start items-center justify-end gap-1.5 md:min-w-0">
        {activeCount ? <Link href="/opportunities" className="focus-ring inline-flex min-h-9 items-center rounded-button px-3 text-xs font-semibold text-[rgb(var(--text-muted))] transition-colors hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]">Resetează filtrele</Link> : null}
        <Button type="submit" size="small" className="min-h-9">Aplică</Button>
      </div>
    </div>
    {activeFilters.length ? <div className="flex flex-wrap items-center gap-1.5" aria-label="Filtre active">
      <span className="mr-1 text-xs text-[rgb(var(--text-muted))]">Active:</span>
      {activeFilters.map(([key, label]) => <Link key={key} href={queryWithout(filters, key)} className="focus-ring inline-flex min-h-7 items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-2 text-xs font-medium text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--border-strong))] hover:text-[rgb(var(--foreground))]" aria-label={`Elimină filtrul ${label}`}>
        {label}<span aria-hidden="true" className="text-[rgb(var(--primary))]">×</span>
      </Link>)}
    </div> : null}
    <details className="group border-t border-[rgb(var(--border))] pt-2" open={Boolean(filters.lifecycle || filters.due || filters.contact || filters.decisionMaker)}>
      <summary className="focus-ring inline-flex min-h-9 cursor-pointer list-none items-center rounded-button px-2 text-xs font-semibold text-[rgb(var(--text-secondary))] marker:hidden hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]">
        Filtre avansate
        <span className="ml-2 text-[rgb(var(--text-faint))]">ciclu, termen, contact, decident</span>
        {activeCount ? <span className="ml-2 rounded-full bg-[rgb(var(--primary-muted))] px-2 py-0.5 text-[0.6875rem] text-[rgb(var(--primary))]">{activeCount} active</span> : null}
        <span aria-hidden="true" className="ml-2 text-[rgb(var(--primary))] group-open:hidden">+</span><span aria-hidden="true" className="ml-2 hidden text-[rgb(var(--primary))] group-open:inline">−</span>
      </summary>
      <div className="mt-2 grid gap-2 border-l-2 border-[rgb(var(--primary)/0.28)] pl-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect name="lifecycle" label="Ciclu de viață" value={filters.lifecycle} options={[["", "Toate"], ["open", "Deschisă"], ["won", "Câștigată"], ["lost", "Pierdută"], ["disqualified", "Descalificată"]]} />
        <FilterSelect name="due" label="Termen" value={filters.due} options={[["", "Orice termen"], ["overdue", "Restant"], ["today", "Astăzi"], ["missing", "Fără acțiune"]]} />
        <FilterSelect name="contact" label="Contact principal" value={filters.contact} options={[["", "Orice stare"], ["present", "Prezent"], ["missing", "Lipsește"]]} />
        <FilterSelect name="decisionMaker" label="Decident" value={filters.decisionMaker} options={[["", "Orice stare"], ["present", "Confirmat"], ["missing", "Neconfirmat"]]} />
      </div>
    </details>
  </form>;
}

function FilterSelect({ name, label, value, options, compact = false }: { name: string; label: string; value?: string; options: string[][]; compact?: boolean }) {
  return <label className={`${compact ? "min-w-[10.5rem] snap-start md:min-w-0" : ""} text-xs font-semibold text-[rgb(var(--text-secondary))]`}>{label}<Select name={name} defaultValue={value ?? ""} className="mt-1.5 min-h-9 bg-[rgb(var(--surface-elevated))] font-normal">{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</Select></label>;
}