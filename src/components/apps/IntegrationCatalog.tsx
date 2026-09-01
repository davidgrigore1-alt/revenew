"use client";

import { useMemo, useState } from "react";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  ChatBubbleLeftRightIcon,
  CircleStackIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";
import { IntegrationLogo } from "@/components/apps/IntegrationLogo";
import { ApplicationStatus as StatusPill } from "@/components/apps/ApplicationStatus";
import { CapabilityStatus } from "@/components/apps/CapabilityStatus";
import type { GoogleWorkspacePublicState } from "@/lib/google-workspace/types";
import { googleProviderPresentation } from "@/lib/integrations/presentation";
import {
  integrationCatalog,
  integrationStageLabels,
  type IntegrationCatalogItem,
  type IntegrationCategory
} from "@/lib/integrations/catalog";
import { cn } from "@/lib/utils";

const categoryIcons = {
  Comunicare: ChatBubbleLeftRightIcon,
  CRM: BuildingOffice2Icon,
  Documente: DocumentTextIcon,
  Contracte: ShieldCheckIcon,
  Platformă: CircleStackIcon
} as const;

const categories: Array<"Toate" | IntegrationCategory> = [
  "Toate",
  "Comunicare",
  "CRM",
  "Documente",
  "Contracte",
  "Platformă"
];

function IntegrationCard({
  item,
  state,
  onSelect
}: {
  item: IntegrationCatalogItem;
  state: GoogleWorkspacePublicState;
  onSelect: (item: IntegrationCatalogItem) => void;
}) {
  const CategoryIcon = categoryIcons[item.category];
  const provider = item.id === "google-workspace" ? googleProviderPresentation(state) : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      aria-haspopup="dialog"
      className="focus-ring group grid min-w-0 w-full gap-x-5 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 py-4 text-left transition-colors duration-fast last:border-b-0 hover:bg-[rgb(var(--surface-elevated))] active:bg-[rgb(var(--surface-muted))] sm:grid-cols-[minmax(12rem,0.8fr)_minmax(16rem,1.4fr)_auto] sm:items-center"
    >
      <div className="flex items-start justify-between gap-4 sm:justify-start">
        <IntegrationLogo item={item} />
        {provider ? <CapabilityStatus status={provider.status} label={provider.label} /> : <StatusPill tone={item.stage === "next" ? "gold" : "neutral"}>
          {integrationStageLabels[item.stage]}
        </StatusPill>}
      </div>

      <div className="mt-3 sm:mt-0">
        <h3 className="text-[15px] font-semibold tracking-[-0.015em] text-[rgb(var(--foreground))]">{item.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[rgb(var(--text-muted))]">
          <CategoryIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {item.category}
        </p>
      </div>
      <p className="mt-2 text-[13px] leading-5 text-[rgb(var(--text-muted))] sm:col-start-2">{item.description}</p>

      <div className="mt-3 flex min-h-[22px] items-start gap-2 overflow-hidden sm:col-start-2" aria-label={provider ? "Servicii Google; Drive necesită autorizare și selecție explicită; Meet este planificat" : "Capabilități planificate"}>
        {item.capabilities.slice(0, 3).map((capability) => (
          <span key={capability} title={provider && capability === "Drive" ? "Drive · documente selectate" : capability} className="inline-flex h-[22px] min-w-0 items-center text-[11px] text-[rgb(var(--text-secondary))]">
            <span className="truncate">{capability}{provider && capability === "Drive" ? " · selecție explicită" : ""}</span>
          </span>
        ))}
        {item.capabilities.length > 3 ? (
          <span className="shrink-0 px-1 text-[11px] leading-[22px] text-[rgb(var(--text-muted))]" title={item.capabilities.slice(3).join(", ")}>+{item.capabilities.length - 3}</span>
        ) : null}
      </div>

      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--text-secondary))] transition-colors group-hover:text-[rgb(var(--foreground))] sm:col-start-3 sm:row-start-1 sm:mt-0">
        {provider ? "Vezi conexiunea și permisiunile" : "Vezi integrarea planificată"}
        <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-fast group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
      </span>
    </button>
  );
}

export function IntegrationCatalog({
  state,
  onSelect
}: {
  state: GoogleWorkspacePublicState;
  onSelect: (item: IntegrationCatalogItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"Toate" | IntegrationCategory>("Toate");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return integrationCatalog.filter((item) => {
      const categoryMatch = category === "Toate" || item.category === category;
      const searchMatch = !normalized || [
        item.name,
        item.category,
        item.description,
        ...item.capabilities
      ].join(" ").toLowerCase().includes(normalized);
      return categoryMatch && searchMatch;
    });
  }, [category, query]);

  const recommended = filtered.filter((item) => item.stage !== "planned");
  const more = filtered.filter((item) => item.stage === "planned");

  return (
    <div className="grid gap-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--text-faint))]" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută Microsoft, HubSpot, Slack..."
            className="focus-ring h-10 w-full rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] pl-9 pr-3 text-sm text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--text-faint))] hover:border-[rgb(var(--border-strong))]"
            aria-label="Caută aplicații"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={cn(
                "focus-ring min-h-8 rounded-full border px-3 text-xs font-semibold transition-colors",
                category === item
                  ? "border-[rgb(var(--primary-border))] bg-[rgb(var(--primary-soft))] text-[rgb(var(--foreground))]"
                  : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text-muted))] hover:border-[rgb(var(--border-strong))] hover:text-[rgb(var(--foreground))]"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {recommended.length ? (
        <section aria-labelledby="recommended-integrations-title">
          <div className="mb-4">
            <p className="micro-label">Surse comerciale</p>
            <h2 id="recommended-integrations-title" className="mt-1 text-lg font-semibold tracking-[-0.015em] text-[rgb(var(--foreground))]">
              Furnizori și capabilități
            </h2>
          </div>
          <div className="border-y border-[rgb(var(--border))]">
            {recommended.map((item) => <IntegrationCard key={item.id} item={item} state={state} onSelect={onSelect} />)}
          </div>
        </section>
      ) : null}

      {more.length ? (
        <section aria-labelledby="more-integrations-title">
          <div className="mb-4 border-t border-[rgb(var(--border))] pt-6">
            <p className="micro-label">Mai multe integrări</p>
            <h2 id="more-integrations-title" className="mt-1 text-base font-semibold text-[rgb(var(--foreground))]">
              Documente, contracte și infrastructură enterprise
            </h2>
          </div>
          <div className="border-y border-[rgb(var(--border))]">
            {more.map((item) => <IntegrationCard key={item.id} item={item} state={state} onSelect={onSelect} />)}
          </div>
        </section>
      ) : null}

      {!filtered.length ? (
        <div className="rounded-[14px] border border-dashed border-[rgb(var(--border-strong))] p-8 text-center">
          <p className="text-sm font-semibold text-[rgb(var(--foreground))]">Nicio integrare nu corespunde filtrului.</p>
          <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Schimbă termenul de căutare sau categoria.</p>
        </div>
      ) : null}
    </div>
  );
}
