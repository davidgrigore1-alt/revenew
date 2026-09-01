"use client";

import {
  ArrowRightIcon,
  BoltIcon,
  BuildingOffice2Icon,
  ChatBubbleLeftRightIcon,
  CircleStackIcon,
  DocumentTextIcon,
  LinkIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  integrationCatalog,
  integrationStageLabels,
  type IntegrationCatalogItem
} from "@/lib/integrations/catalog";

const categoryIcons = {
  Comunicare: ChatBubbleLeftRightIcon,
  CRM: BuildingOffice2Icon,
  Documente: DocumentTextIcon,
  Contracte: ShieldCheckIcon,
  Platformă: CircleStackIcon
} as const;

function ProviderMark({ item }: { item: IntegrationCatalogItem }) {
  return (
    <span
      className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-black/5 text-[0.6875rem] font-black tracking-[-0.03em] shadow-sm"
      style={{ backgroundColor: item.brandColor, color: item.brandForeground }}
      aria-hidden="true"
    >
      {item.mark}
    </span>
  );
}

function IntegrationCard({ item }: { item: IntegrationCatalogItem }) {
  const CategoryIcon = categoryIcons[item.category];
  const tone = item.stage === "next" ? "gold" : "neutral";

  return (
    <article className="group flex min-h-full flex-col border-t border-[rgb(var(--border))] py-5 transition-colors duration-fast hover:border-[rgb(var(--border-strong))]">
      <div className="flex items-start gap-3">
        <ProviderMark item={item} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold tracking-[-0.01em] text-[rgb(var(--foreground))]">{item.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-[0.6875rem] font-medium text-[rgb(var(--text-faint))]">
                <CategoryIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {item.category}
              </p>
            </div>
            <StatusPill tone={tone}>{integrationStageLabels[item.stage]}</StatusPill>
          </div>
          <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]">{item.description}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {item.capabilities.map((capability) => (
          <span key={capability} className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-2 py-1 text-[0.6875rem] font-medium text-[rgb(var(--text-secondary))]">
            {capability}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <details className="group/details">
          <summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-1.5 rounded-button text-xs font-semibold text-[rgb(var(--text-secondary))] marker:hidden hover:text-[rgb(var(--foreground))]">
            Cum va fi folosită
            <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-fast group-open/details:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
          </summary>
          <div className="mt-3 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-3 text-xs leading-5 text-[rgb(var(--text-muted))]">
            <p>Conexiunea va adăuga numai context autorizat în stratul comercial ReveNew. Acțiunile externe rămân separate de analiză și cer control explicit.</p>
            {item.note ? <p className="mt-2 font-medium text-[rgb(var(--text-secondary))]">{item.note}</p> : null}
          </div>
        </details>
      </div>
    </article>
  );
}

export function IntegrationCatalog() {
  const next = integrationCatalog.filter((item) => item.stage === "next");
  const planned = integrationCatalog.filter((item) => item.stage === "planned");

  return (
    <div className="grid gap-8">
      <section aria-labelledby="recommended-integrations">
        <div className="flex flex-col gap-3 border-b border-[rgb(var(--border))] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="micro-label">Roadmap de conectare</p>
            <h2 id="recommended-integrations" className="mt-1 text-lg font-semibold tracking-[-0.015em] text-[rgb(var(--foreground))]">Conectorii cu cel mai mare impact</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[rgb(var(--text-muted))]">Ordinea este gândită pentru companii B2B: comunicare, CRM și colaborare înainte de extensii mai specializate.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]">
            <BoltIcon className="h-4 w-4 text-[rgb(var(--primary))]" aria-hidden="true" />
            4 priorități
          </div>
        </div>
        <div className="grid gap-x-6 md:grid-cols-2 xl:grid-cols-4">
          {next.map((item) => <IntegrationCard key={item.id} item={item} />)}
        </div>
      </section>

      <section aria-labelledby="planned-integrations">
        <div className="flex items-center justify-between gap-4 border-b border-[rgb(var(--border))] pb-3">
          <div>
            <p className="micro-label">Catalog extins</p>
            <h2 id="planned-integrations" className="mt-1 text-base font-semibold text-[rgb(var(--foreground))]">Surse pentru documente, contracte și enterprise</h2>
          </div>
          <LinkIcon className="h-4 w-4 text-[rgb(var(--text-faint))]" aria-hidden="true" />
        </div>
        <div className="grid gap-x-6 md:grid-cols-2 xl:grid-cols-4">
          {planned.map((item) => <IntegrationCard key={item.id} item={item} />)}
        </div>
      </section>
    </div>
  );
}
