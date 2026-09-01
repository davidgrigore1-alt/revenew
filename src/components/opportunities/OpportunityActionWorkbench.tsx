import { lifecycleForOpportunity } from "@/lib/opportunity-domain";
import type { Opportunity } from "@/lib/types";

type WorkbenchAction = {
  href: string;
  title: string;
  status: string;
  reason: string;
  cta: string;
  recommended?: boolean;
};

export function OpportunityActionWorkbench({
  opportunity,
  recommendation,
  compact = false
}: {
  opportunity: Opportunity;
  recommendation: { action: string; reason: string; missingInformation: string[] };
  compact?: boolean;
}) {
  const open = lifecycleForOpportunity(opportunity) === "open";
  const primaryContact = opportunity.contacts?.find((contact) => contact.isPrimary) ?? opportunity.contacts?.[0] ?? null;
  const nextAction = opportunity.actions.find((action) => action.status !== "done" && action.status !== "cancelled") ?? null;
  const preparedDocuments = opportunity.documents.filter((document) => !["sent", "archived"].includes(document.status)).length;
  const actions: WorkbenchAction[] = [
    {
      href: nextAction ? `/opportunities/${opportunity.id}?tab=workflow#workflow-actions-list` : `/opportunities/${opportunity.id}?tab=schedule`,
      title: recommendation.action,
      status: nextAction ? "Acțiune existentă" : "Acțiune lipsă",
      reason: `${recommendation.reason}${recommendation.missingInformation.length ? ` De confirmat: ${recommendation.missingInformation.join(", ")}.` : ""}`,
      cta: nextAction ? "Revizuiește acțiunea" : "Completează următoarea acțiune",
      recommended: open
    },
    {
      href: `/opportunities/${opportunity.id}?tab=responsibility`,
      title: "Schimbă responsabilul",
      status: opportunity.ownerProfileId ? "Responsabil atribuit" : "Responsabil lipsă",
      reason: opportunity.ownerProfileId ? "Actualizează responsabilul numai dacă atribuirea s-a schimbat." : "Oportunitatea are nevoie de un responsabil explicit.",
      cta: opportunity.ownerProfileId ? "Actualizează responsabilul" : "Atribuie responsabil"
    },
    {
      href: `/opportunities/${opportunity.id}?tab=response`,
      title: "Adaugă răspuns comercial",
      status: opportunity.responses?.length ? `${opportunity.responses.length} răspunsuri` : "Niciun răspuns",
      reason: "Înregistrează numai răspunsul confirmat de echipă și următorul pas rezultat.",
      cta: "Înregistrează răspunsul"
    },
    {
      href: `/opportunities/${opportunity.id}?tab=responsibility`,
      title: "Înregistrează rezultatul",
      status: open ? "Rezultat deschis" : "Rezultat înregistrat",
      reason: open ? "Rezultatul necesită declarație și confirmare umană explicită." : "Redeschiderea păstrează istoricul auditabil.",
      cta: open ? "Verifică și confirmă rezultatul" : "Revizuiește rezultatul",
      recommended: !open
    },
    {
      href: `/opportunities/${opportunity.id}?tab=workflow#workflow-actions`,
      title: "Generează document",
      status: preparedDocuments ? `${preparedDocuments} în lucru` : "Niciun draft în lucru",
      reason: "Pregătește un draft pentru revizuire; generarea nu înseamnă trimitere.",
      cta: "Pregătește documentul"
    },
    {
      href: `/opportunities/${opportunity.id}?tab=workflow#opportunity-documents`,
      title: "Revizuiește documentele",
      status: opportunity.documents.length ? `${opportunity.documents.length} documente` : "Fără documente",
      reason: "Verifică starea, conținutul și aprobarea înainte de utilizare externă.",
      cta: "Deschide documentele"
    },
    {
      href: `/opportunities/${opportunity.id}?tab=workflow#action-contacts`,
      title: "Gestionează contactele",
      status: primaryContact ? "Contact principal confirmat" : "Contact principal lipsă",
      reason: primaryContact ? `Contact principal: ${primaryContact.contact.fullName}.` : "Confirmă persoana și rolul de decizie înainte de outreach.",
      cta: primaryContact ? "Actualizează contactele" : "Adaugă contact principal"
    }
  ];
  const primaryAction = actions.find((action) => action.recommended) ?? actions[0];
  const secondaryActions = actions.filter((action) => action !== primaryAction);

  return (
    <section id="action-workbench" aria-labelledby="action-workbench-title" className={`scroll-mt-24 rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">Acțiuni de execuție</p>
        <h2 id="action-workbench-title" className={`mt-2 font-display font-semibold tracking-tight ${compact ? "text-xl" : "text-2xl"}`}>Alege intervenția sigură</h2>
        {!compact ? <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Intervenția recomandată rămâne în prim-plan. Formularele și acțiunile secundare se deschid numai când sunt necesare.</p> : null}
      </div>
      <article className={`mt-5 grid min-w-0 gap-4 rounded-card border border-[rgb(var(--border-strong))] border-l-2 border-l-[rgb(var(--primary))] bg-[rgb(var(--surface-subtle))] p-4 sm:p-5 ${compact ? "" : "md:grid-cols-[minmax(0,1fr)_auto] md:items-center"}`}>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-pill bg-[rgb(var(--primary))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--primary-foreground))]">Recomandat acum</span>
            <span className="text-xs font-semibold text-[rgb(var(--text-muted))]">{primaryAction.status}</span>
          </div>
          <h3 className="mt-3 text-lg font-semibold">{primaryAction.title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--text-muted))]">{primaryAction.reason}</p>
        </div>
        <a href={primaryAction.href} className={`focus-ring inline-flex min-h-11 items-center justify-center rounded-button bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))] transition hover:bg-[rgb(var(--primary-hover))] ${compact ? "w-full" : ""}`}>{primaryAction.cta}</a>
      </article>
      <details className="group mt-4 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
        <summary className="focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-4 py-3 text-sm font-semibold marker:hidden">
          <span>Alte intervenții controlate <span className="font-normal text-[rgb(var(--text-muted))]">({secondaryActions.length})</span></span>
          <span aria-hidden="true" className="text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span>
        </summary>
        <div className={`grid gap-3 border-t border-[rgb(var(--border))] p-4 ${compact ? "" : "md:grid-cols-2 xl:grid-cols-3"}`}>
          {secondaryActions.map((action) => (
            <article key={`${action.href}:${action.title}`} className="flex min-w-0 flex-col rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
              <span className="text-xs font-semibold text-[rgb(var(--text-muted))]">{action.status}</span>
              <h3 className="mt-2 text-base font-semibold">{action.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-[rgb(var(--text-muted))]">{action.reason}</p>
              <a href={action.href} className="focus-ring mt-4 inline-flex min-h-10 items-center justify-center rounded-button border border-[rgb(var(--border))] px-3 text-sm font-semibold transition hover:border-[rgb(var(--primary)/0.5)] hover:text-[rgb(var(--primary))]">{action.cta}</a>
            </article>
          ))}
        </div>
      </details>
      <p className="mt-4 text-xs leading-5 text-[rgb(var(--text-muted))]">Nicio comunicare externă nu este trimisă automat. Aprobarea și confirmarea umană rămân obligatorii.</p>
    </section>
  );
}
