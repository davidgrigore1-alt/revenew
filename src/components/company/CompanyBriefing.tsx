import Link from "next/link";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { Breadcrumbs } from "@/components/dashboard/Breadcrumbs";
import { CreateOpportunityPanel } from "@/components/opportunities/CreateOpportunityPanel";
import { getStatusLabel } from "@/components/dashboard/StatusBadge";
import { StatusPill } from "@/components/ui/StatusPill";
import { CompanyEvidenceLine } from "./CompanyBusinessMemory";
import { companyBriefing, companySourceHref } from "@/lib/company-briefing";
import type { CompanyIntelligenceSnapshot } from "@/lib/company-intelligence";
import { safeCompanyWebsiteHref } from "@/lib/crm/website";
import { isOpenOpportunity } from "@/lib/opportunity-domain";
import { formatCurrency, formatDate } from "@/lib/utils";
import styles from "./CompanyBriefing.module.css";

const roleLabels: Record<string, string> = { decision_maker: "Decident", champion: "Campion", influencer: "Influencer", procurement: "Achiziții", finance: "Financiar", legal: "Legal", technical: "Tehnic", operational: "Operațional", other: "Alt rol" };
const documentLabels: Record<string, string> = { placeholder: "De pregătit", draft: "Draft", edited: "Editat", copied: "Copiat", ready_to_send: "Pregătit", sent: "Marcat ca trimis", approved: "Aprobat", archived: "Arhivat" };

type Props = { snapshot: CompanyIntelligenceSnapshot };
export function CompanyIdentity({ snapshot }: Props) {
  const { organization, identity, commercial } = snapshot;
  const model = companyBriefing(snapshot);
  const website = safeCompanyWebsiteHref(identity.website);
  const initials = organization.name.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join("").toLocaleUpperCase("ro");
  return <>
    <Breadcrumbs items={[{ label: "Companii", href: "/companies" }, { label: organization.name }]} />
    <header className={styles.identity}>
      <span className={styles.monogram} aria-hidden="true">{initials}</span>
      <div className={styles.identityText}><p className="product-eyebrow">Company 360</p><h1>{organization.name}</h1><p>{[identity.industry, identity.location].filter(Boolean).join(" · ") || "Profil comercial în curs de completare"}<span>Relație · {model.relationship}</span>{website ? <a className="focus-ring" href={website} target="_blank" rel="noopener noreferrer">Website<ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" /></a> : null}</p></div>
      <CreateOpportunityPanel organizations={[organization]} />
    </header>
    <section className={styles.summary} aria-label="Situația comercială">
      <p><strong>{model.active.length}</strong> {model.active.length === 1 ? "oportunitate activă" : "oportunități active"}<span> · {commercial.closedOpportunities} închise{commercial.archivedOpportunities ? ` · ${commercial.archivedOpportunities} arhivate` : ""}</span></p>
      <p>{commercial.latestActivity ? <>Ultima activitate · <time dateTime={commercial.latestActivity.occurredAt}>{formatDate(commercial.latestActivity.occurredAt)}</time></> : "Activitate comercială datată neconfirmată"}</p>
    </section>
    {snapshot.coverage?.atLimit ? <p className={styles.coverage} role="status">Imagine parțială: una dintre liste a atins limita de încărcare. Numerele și prioritățile reflectă înregistrările încărcate.</p> : null}
  </>;
}

export function CompanyOpportunityList({ opportunities }: { opportunities: CompanyIntelligenceSnapshot["opportunities"] }) {
  return <ul className={styles.opportunities}>{opportunities.map(item => <li key={item.id}>
    <div className={styles.opportunityTitle}><Link href={item.href} className="focus-ring">{item.title}</Link><StatusPill tone="neutral">{getStatusLabel(item.status)}</StatusPill></div>
    <div className={styles.opportunityMeta}><p><span>Responsabil</span>{item.ownerProfileId ? item.ownerName || "Identitate neconfirmată" : "Neatribuit"}</p><p><span>{isOpenOpportunity(item) ? "Următorul pas" : "Acțiune înregistrată"}</span>{item.nextActionTitle || "Neconfirmat"}{item.nextActionDueAt ? <small> · {formatDate(item.nextActionDueAt)}</small> : null}</p><p className={styles.amount}><span>Valoare estimată</span>{formatCurrency(item.estimatedValue, item.currency)}</p></div>
  </li>)}</ul>;
}

export function CompanyPeople({ snapshot, compact = false }: Props & { compact?: boolean }) {
  const model = companyBriefing(snapshot);
  const contacts = compact ? model.contacts.slice(0, 3) : model.contacts;
  return <section className={styles.people} aria-labelledby="company-people-title">
    <header className={styles.sectionHeader}><h2 id="company-people-title">Oamenii relației</h2>{compact ? <Link href="?tab=contacts" className="focus-ring">Toate contactele · {model.contacts.length}</Link> : null}</header>
    <ul>{contacts.map(contact => <li key={contact.id}><span className={styles.personInitial} aria-hidden="true">{Array.from(contact.fullName)[0]}</span><div><Link href={`/crm/contacts/${contact.id}`} className="focus-ring">{contact.fullName}</Link>{contact.isPrimary ? <span className={styles.primaryLabel}>Contact principal</span> : null}<p>{[contact.jobTitle, ...contact.opportunityRoles.map(role => roleLabels[role] ?? "Rol asociat neclasificat")].filter(Boolean).join(" · ") || "Rol neconfirmat"}</p>{!compact ? <small>{contact.opportunityCount} oportunități conectate explicit</small> : null}</div></li>)}</ul>
    {!contacts.length ? <p className={styles.quiet}>Nicio persoană asociată în datele disponibile.</p> : null}
    <div className={styles.responsibility}><p className="product-eyebrow">Responsabilitate din oportunități active</p><p>{model.responsibility}</p>{model.owners.length > 1 ? <ul>{model.owners.map(owner => <li key={owner.id}><Link href={owner.href} className="focus-ring">{owner.name || "Identitate neconfirmată"}</Link></li>)}</ul> : null}{model.unassigned ? <small>{model.unassigned} {model.unassigned === 1 ? "oportunitate fără responsabil atribuit" : "oportunități fără responsabil atribuit"}</small> : null}{!model.active.length ? <small>Nu există oportunități active din care să rezulte responsabilitatea.</small> : null}</div>
  </section>;
}

export function CompanyActiveWork({ snapshot }: Props) {
  const active = companyBriefing(snapshot).active;
  return <div className={styles.workGrid}><section aria-labelledby="company-active-title"><header className={styles.sectionHeader}><h2 id="company-active-title">Lucrul comercial activ <span>{active.length}</span></h2><Link href="?tab=opportunities" className="focus-ring">Toate oportunitățile</Link></header>
    {active.length ? <CompanyOpportunityList opportunities={active.slice(0, 4)} /> : <div className={styles.quiet}><h3>Nicio oportunitate activă</h3><p>Relația poate continua fără un proiect deschis. Istoricul rămâne disponibil în Oportunități.</p></div>}
    {active.length > 4 ? <Link className="focus-ring" href="?tab=opportunities">Vezi toate cele {active.length} oportunități active</Link> : null}
  </section><CompanyPeople snapshot={snapshot} compact /></div>;
}

const sourceLabels: Record<string, string> = { opportunity: "Oportunitate", opportunity_action: "Acțiune", opportunity_document: "Document", opportunity_event: "Eveniment", commercial_signal: "Semnal", commercial_signal_event: "Eveniment de semnal" };
export function CompanyRecentContext({ snapshot }: Props) {
  return <section className={styles.recent} id="company-evidence" aria-labelledby="company-evidence-title"><header className={styles.sectionHeader}><div><p className="product-eyebrow">Context pentru verificare</p><h2 id="company-evidence-title">Dovezi recente</h2></div><span className={styles.muted}>Înregistrări interne · cele mai recente disponibile</span></header>
    <div className={styles.evidenceGrid}><div>{snapshot.timeline.length ? <ol className={styles.timeline}>{snapshot.timeline.slice(0, 3).map(item => <li key={item.id}><span>{sourceLabels[item.evidence.sourceType] || "Înregistrare"}</span><div><h3>{item.label}</h3><p>{item.description}</p><CompanyEvidenceLine label={item.evidence.label} timestamp={item.occurredAt} href={item.href} /></div></li>)}</ol> : <p className={styles.quiet}>Nu există istoric comercial datat în datele disponibile.</p>}
      {snapshot.timeline.length > 3 ? <details className={styles.disclosure}><summary className="focus-ring">Mai mult istoric · {snapshot.timeline.length - 3}</summary>{snapshot.timeline.slice(3).map(item => <CompanyEvidenceLine key={item.id} label={`${item.label} · ${item.description}`} timestamp={item.occurredAt} href={item.href} />)}</details> : null}</div>
      <div><h3>Documente asociate</h3>{snapshot.documents.length ? <ul className={styles.documents}>{snapshot.documents.slice(0, 3).map(doc => <li key={doc.id}><Link href={companySourceHref(doc.href)!} className="focus-ring">{doc.title}</Link><p>{doc.opportunityTitle}</p><small>{documentLabels[doc.status] ?? "Stare neconfirmată"} · {doc.occurredAt ? formatDate(doc.occurredAt) : "Dată neconfirmată"}</small></li>)}</ul> : <p className={styles.quiet}>Niciun document asociat încărcat.</p>}{snapshot.documents.length > 3 ? <details className={styles.disclosure}><summary className="focus-ring">Alte documente · {snapshot.documents.length - 3}</summary>{snapshot.documents.slice(3).map(doc => <CompanyEvidenceLine key={doc.id} label={doc.title} href={doc.href} timestamp={doc.occurredAt} />)}</details> : null}<small className={styles.muted}>Starea documentului nu confirmă trimiterea sau rezultatul comercial.</small></div></div>
    {snapshot.organization.notes ? <details className={styles.disclosure}><summary className="focus-ring">Contextul înregistrat al relației</summary><p className="whitespace-pre-wrap">{snapshot.organization.notes}</p></details> : null}
    <p className={styles.coverage}>Briefing bazat pe relații explicite și date autorizate încărcate. Istoricul este limitat la 12 evenimente; absența unei informații nu dovedește absența ei în toate sursele.</p>
  </section>;
}
