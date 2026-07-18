import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export type OpportunityFilterState = {
  q?: string; status?: string; lifecycle?: string; commercialType?: string; attention?: string; due?: string; contact?: string; decisionMaker?: string; sort?: string;
};

export function OpportunityFilters({ filters }: { filters: OpportunityFilterState }) {
  const activeCount = Object.entries(filters).filter(([key, value]) => key !== "sort" && Boolean(value)).length;
  return <form method="get" className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-card">
    <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_13rem_13rem_12rem]">
      <label className="text-sm font-semibold">Caută
        <Input name="q" defaultValue={filters.q} placeholder="Titlu, context sau acțiune" className="mt-2 min-h-11 bg-[rgb(var(--background))] font-normal" />
      </label>
      <FilterSelect name="status" label="Etapă" value={filters.status} options={[["", "Toate etapele"], ["reviewed", "Lead"], ["contacted", "Calificare"], ["follow_up_needed", "Propunere"]]} />
      <FilterSelect name="attention" label="Atenție" value={filters.attention} options={[["", "Orice stare"], ["needs_attention", "Necesită atenție"], ["at_risk", "În risc"], ["on_track", "În grafic"]]} />
      <FilterSelect name="sort" label="Ordonare" value={filters.sort} options={[["updated", "Actualizate recent"], ["value", "Valoare estimată"], ["attention", "Prioritate operațională"]]} />
    </div>
    <details className="group mt-3 border-t border-[rgb(var(--border))] pt-3" open={Boolean(filters.lifecycle || filters.due || filters.contact || filters.decisionMaker)}>
      <summary className="focus-ring inline-flex min-h-10 cursor-pointer list-none items-center rounded-button px-2 text-sm font-semibold text-[rgb(var(--text-secondary))] marker:hidden">
        Filtre avansate <span className="ml-2 rounded-full bg-[rgb(var(--surface-muted))] px-2 py-0.5 text-xs text-[rgb(var(--text-muted))]">ciclu, termen, contact, decident</span>
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect name="lifecycle" label="Ciclu de viață" value={filters.lifecycle} options={[["", "Toate"], ["open", "Deschisă"], ["won", "Câștigată"], ["lost", "Pierdută"], ["disqualified", "Descalificată"]]} />
        <FilterSelect name="due" label="Termen" value={filters.due} options={[["", "Orice termen"], ["overdue", "Restant"], ["today", "Astăzi"], ["missing", "Fără acțiune"]]} />
        <FilterSelect name="contact" label="Contact principal" value={filters.contact} options={[["", "Orice stare"], ["present", "Prezent"], ["missing", "Lipsește"]]} />
        <FilterSelect name="decisionMaker" label="Decident" value={filters.decisionMaker} options={[["", "Orice stare"], ["present", "Confirmat"], ["missing", "Neconfirmat"]]} />
      </div>
    </details>
    <div className="mt-3 flex items-end gap-2 border-t border-[rgb(var(--border))] pt-3 lg:justify-end">
      {activeCount ? <span className="mr-auto self-center text-sm font-semibold text-[rgb(var(--primary))]">{activeCount} filtre active</span> : null}
      <Link href="/opportunities" className="focus-ring inline-flex h-11 items-center rounded-button border border-[rgb(var(--border))] px-4 text-sm font-semibold">Resetează</Link>
      <Button type="submit" className="min-h-11">Aplică filtrele</Button>
    </div>
  </form>;
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value?: string; options: string[][] }) {
  return <label className="text-sm font-semibold">{label}<Select name={name} defaultValue={value ?? ""} className="mt-2 min-h-11 bg-[rgb(var(--background))] font-normal">{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</Select></label>;
}
