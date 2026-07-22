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
  recommendation
}: {
  opportunity: Opportunity;
  recommendation: { action: string; reason: string; missingInformation: string[] };
}) {
  const open = lifecycleForOpportunity(opportunity) === "open";
  const primaryContact = opportunity.contacts?.find((contact) => contact.isPrimary) ?? opportunity.contacts?.[0] ?? null;
  const nextAction = opportunity.actions.find((action) => action.status !== "done" && action.status !== "cancelled") ?? null;
  const preparedDocuments = opportunity.documents.filter((document) => !["sent", "archived"].includes(document.status)).length;
  const actions: WorkbenchAction[] = [
    {
      href: "#action-schedule",
      title: recommendation.action,
      status: nextAction ? "Acțiune existentă" : "Acțiune lipsă",
      reason: `${recommendation.reason}${recommendation.missingInformation.length ? ` De confirmat: ${recommendation.missingInformation.join(", ")}.` : ""}`,
      cta: nextAction ? "Programează o acțiune" : "Completează următoarea acțiune",
      recommended: open
    },
    {
      href: "#action-responsibility",
      title: "Schimbă responsabilul",
      status: opportunity.ownerProfileId ? "Responsabil atribuit" : "Responsabil lipsă",
      reason: opportunity.ownerProfileId ? "Actualizează ownership-ul numai dacă responsabilitatea s-a schimbat." : "Oportunitatea are nevoie de un responsabil explicit.",
      cta: opportunity.ownerProfileId ? "Actualizează responsabilul" : "Atribuie responsabil"
    },
    {
      href: "#action-response",
      title: "Adaugă răspuns comercial",
      status: opportunity.responses?.length ? `${opportunity.responses.length} răspunsuri` : "Niciun răspuns",
      reason: "Înregistrează numai răspunsul confirmat de echipă și următorul pas rezultat.",
      cta: "Înregistrează răspunsul"
    },
    {
      href: "#action-outcome",
      title: "Înregistrează rezultatul",
      status: open ? "Rezultat deschis" : "Rezultat înregistrat",
      reason: open ? "Rezultatul necesită declarație și confirmare umană explicită." : "Redeschiderea păstrează istoricul auditabil.",
      cta: open ? "Verifică și confirmă rezultatul" : "Revizuiește rezultatul",
      recommended: !open
    },
    {
      href: "#workflow-actions",
      title: "Generează document",
      status: preparedDocuments ? `${preparedDocuments} în lucru` : "Niciun draft în lucru",
      reason: "Pregătește un draft pentru revizuire; generarea nu înseamnă trimitere.",
      cta: "Pregătește documentul"
    },
    {
      href: "#opportunity-documents",
      title: "Revizuiește documentele",
      status: opportunity.documents.length ? `${opportunity.documents.length} documente` : "Fără documente",
      reason: "Verifică starea, conținutul și aprobarea înainte de utilizare externă.",
      cta: "Deschide documentele"
    },
    {
      href: "#action-contacts",
      title: "Gestionează contactele",
      status: primaryContact ? "Contact principal confirmat" : "Contact principal lipsă",
      reason: primaryContact ? `Contact principal: ${primaryContact.contact.fullName}.` : "Confirmă persoana și rolul de decizie înainte de outreach.",
      cta: primaryContact ? "Actualizează contactele" : "Adaugă contact principal"
    }
  ];

  return (
    <section id="action-workbench" aria-labelledby="action-workbench-title" className="scroll-mt-24 rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card sm:p-6">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">Acțiuni de execuție</p>
        <h2 id="action-workbench-title" className="mt-2 font-display text-2xl font-semibold tracking-tight">Alege intervenția sigură</h2>
        <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Un singur formular se deschide pentru sarcina aleasă. Contextul, dovezile și starea oportunității rămân disponibile mai jos.</p>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => (
          <article key={action.href} className={`flex min-w-0 flex-col rounded-card border p-4 ${action.recommended ? "border-[rgb(var(--primary)/0.45)] bg-[rgb(var(--primary)/0.07)]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[rgb(var(--text-muted))]">{action.status}</span>
              {action.recommended ? <span className="rounded-pill bg-[rgb(var(--primary))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--primary-foreground))]">Recomandat acum</span> : null}
            </div>
            <h3 className="mt-3 text-base font-semibold">{action.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-[rgb(var(--text-muted))]">{action.reason}</p>
            <a href={action.href} className="focus-ring mt-4 inline-flex min-h-10 items-center justify-center rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm font-semibold transition hover:border-[rgb(var(--primary)/0.5)] hover:text-[rgb(var(--primary))]">{action.cta}</a>
          </article>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-[rgb(var(--text-muted))]">Nicio comunicare externă nu este trimisă automat. Aprobarea și confirmarea umană rămân obligatorii.</p>
    </section>
  );
}
