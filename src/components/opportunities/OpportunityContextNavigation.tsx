"use client";

import type { MouseEvent } from "react";

type OpportunityContextDestination = {
  href: string;
  label: string;
};

export function OpportunityContextNavigation({
  showEvidence
}: {
  showEvidence: boolean;
}) {
  const destinations: OpportunityContextDestination[] = [
    { href: "#opportunity-commercial-facts", label: "Rezumat" },
    { href: "#action-workbench", label: "Acțiune" },
    { href: "#opportunity-timeline", label: "Istoric" },
    ...(showEvidence ? [{ href: "#opportunity-evidence", label: "Dovezi" }] : []),
    { href: "#opportunity-documents", label: "Documente" },
    { href: "#action-contacts", label: "Contacte" }
  ];

  function navigateToSection(event: MouseEvent<HTMLAnchorElement>, href: string) {
    const target = document.querySelector<HTMLElement>(href);
    if (!target) return;
    event.preventDefault();
    window.history.replaceState(null, "", href);
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  return (
    <nav
      aria-label="Navigare în oportunitate"
      className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
    >
      {destinations.map((destination) => (
        <a
          key={destination.href}
          href={destination.href}
          onClick={(event) => navigateToSection(event, destination.href)}
          className="focus-ring inline-flex min-h-9 shrink-0 items-center rounded-button border border-transparent px-3 text-xs font-semibold text-[rgb(var(--text-muted))] transition-colors hover:border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-subtle))] hover:text-[rgb(var(--foreground))]"
        >
          {destination.label}
        </a>
      ))}
    </nav>
  );
}
