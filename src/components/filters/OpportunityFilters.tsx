import Link from "next/link";

export type OpportunityFilterState = {
  q?: string; status?: string; lifecycle?: string; commercialType?: string; attention?: string; due?: string; contact?: string; decisionMaker?: string; sort?: string;
};

export function OpportunityFilters({ filters }: { filters: OpportunityFilterState }) {
  const activeCount = Object.entries(filters).filter(([key, value]) => key !== "sort" && Boolean(value)).length;
  return <form method="get" className="grid gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 lg:grid-cols-4">
    <label className="text-sm font-semibold lg:col-span-2">Caută
      <input name="q" defaultValue={filters.q} placeholder="Titlu, context sau acțiune" className="mt-2 h-11 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 font-normal" />
    </label>
    <FilterSelect name="status" label="Etapă" value={filters.status} options={[["", "Toate etapele"], ["reviewed", "Lead"], ["contacted", "Calificare"], ["follow_up_needed", "Propunere"]]} />
    <FilterSelect name="lifecycle" label="Ciclu de viață" value={filters.lifecycle} options={[["", "Toate"], ["open", "Deschisă"], ["won", "Câștigată"], ["lost", "Pierdută"], ["disqualified", "Descalificată"]]} />
    <FilterSelect name="attention" label="Atenție" value={filters.attention} options={[["", "Orice stare"], ["needs_attention", "Necesită atenție"], ["at_risk", "În risc"], ["on_track", "În grafic"]]} />
    <FilterSelect name="due" label="Termen" value={filters.due} options={[["", "Orice termen"], ["overdue", "Restant"], ["today", "Astăzi"], ["missing", "Fără acțiune"]]} />
    <FilterSelect name="contact" label="Contact principal" value={filters.contact} options={[["", "Orice stare"], ["present", "Prezent"], ["missing", "Lipsește"]]} />
    <FilterSelect name="decisionMaker" label="Decident" value={filters.decisionMaker} options={[["", "Orice stare"], ["present", "Confirmat"], ["missing", "Neconfirmat"]]} />
    <FilterSelect name="sort" label="Ordonare" value={filters.sort} options={[["updated", "Actualizate recent"], ["value", "Valoare estimată"], ["attention", "Prioritate operațională"]]} />
    <div className="flex items-end gap-2 lg:col-span-3 lg:justify-end">
      {activeCount ? <span className="mr-auto self-center text-sm font-semibold text-[rgb(var(--primary))]">{activeCount} filtre active</span> : null}
      <Link href="/opportunities" className="focus-ring inline-flex h-11 items-center rounded-lg border border-[rgb(var(--border))] px-4 text-sm font-semibold">Resetează</Link>
      <button type="submit" className="focus-ring h-11 rounded-lg bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))]">Aplică filtrele</button>
    </div>
  </form>;
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value?: string; options: string[][] }) {
  return <label className="text-sm font-semibold">{label}<select name={name} defaultValue={value ?? ""} className="mt-2 h-11 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 font-normal">{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>;
}
