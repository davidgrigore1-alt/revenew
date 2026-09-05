import Link from "next/link";
import { ArrowUpRightIcon, EnvelopeIcon, PhoneIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Breadcrumbs } from "@/components/dashboard/Breadcrumbs";
import { AssistantButton } from "@/components/guidance/ContextualAssistant";
import { RecordNotes } from "@/components/workspace/RecordNotes";
import { companyInitials } from "@/lib/crm/company-registry";
import { contactRoleLabels, type ContactRegistryRow } from "@/lib/crm/contact-registry";
import { isOpenOpportunity } from "@/lib/opportunity-domain";
import type { CrmContact, Opportunity } from "@/lib/types";
import type { WorkspaceNote } from "@/lib/workspace-notes";
import styles from "./ContactDetail.module.css";

function OpportunityRows({ opportunities }: { opportunities: Opportunity[] }) {
  return <ul className={styles.opportunities}>{opportunities.map(opportunity => {
    const active = isOpenOpportunity(opportunity);
    const currency = opportunity.currency?.trim();
    const amount = Number.isFinite(opportunity.estimatedValueHigh)
      ? new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 }).format(opportunity.estimatedValueHigh)
      : "Neconfirmată";
    return <li key={opportunity.id}>
      <div className={styles.opportunityHeading}><Link className="focus-ring" href={`/opportunities/${opportunity.id}`}>{opportunity.title}<ArrowUpRightIcon aria-hidden="true" /></Link><span>{active ? "Activă" : "Închisă"}</span></div>
      <div className={styles.opportunityContext}>
        <p><span>Responsabil</span>{opportunity.ownerName || "Neconfirmat"}</p>
        <p><span>{active ? "Pas recomandat" : "Context înregistrat"}</span>{opportunity.recommendedAction || "Neconfirmat"}</p>
        <p className={styles.amount}><span>Valoare estimată</span>{amount} {currency && /^[A-Z]{3}$/.test(currency) ? currency : "· Monedă neconfirmată"}</p>
      </div>
    </li>;
  })}</ul>;
}

/** Presentation for the existing contact route; all records arrive from its authorized loaders. */
export function ContactDetail({ contact, primary, opportunities, notes }: {
  contact: CrmContact; primary?: ContactRegistryRow["primary"]; opportunities: Opportunity[]; notes: WorkspaceNote[];
}) {
  const active = opportunities.filter(isOpenOpportunity);
  const closed = opportunities.filter(opportunity => !isOpenOpportunity(opportunity));
  const primaryLabel = primary === "confirmed" ? "Contact principal" : primary === "ambiguous" ? "Principal de clarificat" : primary === "unknown" ? "Principal neconfirmat" : null;
  return <div className={styles.page}>
    <Breadcrumbs items={[{ label: "Contacte", href: "/contacts" }, { label: contact.fullName }]} />
    <header className={styles.identity}>
      <span className={styles.avatar} aria-hidden="true">{companyInitials(contact.fullName)}</span>
      <div className={styles.identityText}><p className={styles.eyebrow}>Relație comercială</p><h1>{contact.fullName}</h1>
        <p className={styles.company}>{contact.jobTitle || "Funcție necompletată"}<span aria-hidden="true">·</span>{contact.organization ? <Link className="focus-ring" href={`/crm/organizations/${contact.organization.id}`}>{contact.organization.name}<ArrowUpRightIcon aria-hidden="true" /></Link> : <span>{contact.organizationId ? "Companie indisponibilă" : "Fără companie asociată"}</span>}</p>
        <p className={styles.relationship}>{primaryLabel ? <span>{primaryLabel}</span> : null}<span>{contactRoleLabels[contact.decisionRole ?? ""] || "Rol neconfirmat"}</span></p>
      </div>
      <AssistantButton className={styles.ask} />
    </header>
    <div className={styles.summary}><p><strong>{active.length}</strong> {active.length === 1 ? "oportunitate activă" : "oportunități active"}<span> · {closed.length} {closed.length === 1 ? "închisă" : "închise"}</span></p><p>Asocieri explicite · înregistrările încărcate</p></div>
    <div className={styles.work}>
      <section aria-labelledby="contact-active-title"><header className={styles.sectionHeader}><h2 id="contact-active-title">Oportunități active</h2><span>{active.length}</span></header>
        {active.length ? <OpportunityRows opportunities={active} /> : <div className={styles.empty}><h3>Nicio oportunitate activă asociată</h3><p>{closed.length ? "Asocierile închise rămân disponibile în istoric." : "Relația comercială este păstrată. Nu există oportunități asociate în datele încărcate."}</p></div>}
      </section>
      <section className={styles.contactData} aria-labelledby="contact-data-title"><header className={styles.sectionHeader}><h2 id="contact-data-title">Date de contact</h2></header><dl>
        <div><dt><EnvelopeIcon aria-hidden="true" />Email</dt><dd className={!contact.email ? styles.missing : undefined}>{contact.email || "Necompletat"}</dd></div>
        <div><dt><PhoneIcon aria-hidden="true" />Telefon</dt><dd className={!contact.phone ? styles.missing : undefined}>{contact.phone || "Necompletat"}</dd></div>
        <div><dt>Departament</dt><dd className={!contact.department ? styles.missing : undefined}>{contact.department || "Necompletat"}</dd></div>
      </dl><p className={styles.source}>Date introduse explicit în spațiul de lucru.</p></section>
    </div>
    <div className={styles.notes}><RecordNotes targetType="contact" targetId={contact.id} notes={notes} /></div>
    <details className={styles.history}><summary className="focus-ring">Istoric comercial <span>{closed.length} {closed.length === 1 ? "oportunitate închisă" : "oportunități închise"}</span></summary>
      {closed.length ? <OpportunityRows opportunities={closed} /> : <p className={styles.empty}>Nicio oportunitate închisă asociată în datele încărcate.</p>}
    </details>
    <p className={styles.trust}><ShieldCheckIcon aria-hidden="true" /><span>Datele de contact și notele nu autorizează execuție externă. Orice acțiune rămâne pregătită și supusă controlului uman.</span></p>
  </div>;
}
