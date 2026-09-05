import Link from "next/link";
import { CompanyIssueRow } from "./CompanyBusinessMemory";
import { CompanyOpportunityList } from "./CompanyBriefing";
import { companyBriefing } from "@/lib/company-briefing";
import type { CompanyIntelligenceSnapshot } from "@/lib/company-intelligence";
import { formatDate } from "@/lib/utils";
import styles from "./CompanyBriefing.module.css";

type ExternalEmail = { id: string; sent_at: string; direction: "inbound" | "outbound"; sender_name: string | null; sender_email: string | null; subject: string | null; excerpt: string | null };
type ExternalEvent = { id: string; title: string | null; starts_at: string; ends_at: string; event_status: string | null };

export function CompanyExecutionWorkspace({ snapshot, emails, events, hasConnection }: { snapshot: CompanyIntelligenceSnapshot; emails: ExternalEmail[]; events: ExternalEvent[]; hasConnection: boolean }) {
  const model = companyBriefing(snapshot);
  const tasks = model.active.filter(item => item.nextActionTitle);
  return <section aria-label="Execuția comercială a companiei" className={styles.execution}>
    <header className={styles.sectionHeader}><div><p className="product-eyebrow">Execuție curentă</p><h2>Decizii de închis</h2></div><span className={styles.muted}>{model.issues.length} situații în datele încărcate</span></header>
    {model.issues.map(item => <CompanyIssueRow key={item.id} item={item} memory={snapshot.memory} />)}
    {!model.issues.length ? <p className={styles.quiet}>Nicio intervenție identificată în datele disponibile. Pașii programați rămân mai jos.</p> : null}
    <section className="mt-6" aria-labelledby="company-tasks-title"><header className={styles.sectionHeader}><h2 id="company-tasks-title">Pași programați în oportunități active</h2></header>{tasks.length ? <CompanyOpportunityList opportunities={tasks} /> : <p className={styles.quiet}>Niciun pas următor explicit în oportunitățile active încărcate.</p>}</section>
    <details className={styles.private}><summary className="focus-ring">Context conectat privat</summary><p>Vizibil numai utilizatorului care a autorizat conexiunea Google. Sunt afișate doar relațiile explicite disponibile.</p>
      <ul>{emails.slice(0, 3).map(email => <li key={email.id}><Link href={`/inbox?email=${email.id}`} className="focus-ring">{email.subject || "Fără subiect"}</Link><p>{email.direction === "inbound" ? "Primit" : "Trimis"} · {email.sender_name || email.sender_email || "Identitate neconfirmată"} · {Number.isFinite(Date.parse(email.sent_at)) ? formatDate(email.sent_at) : "Dată neconfirmată"}</p></li>)}{events.slice(0, 2).map(event => <li key={event.id}>{event.title || "Întâlnire"}<p>{Number.isFinite(Date.parse(event.starts_at)) ? formatDate(event.starts_at) : "Dată neconfirmată"}</p></li>)}</ul>
      {!emails.length && !events.length ? <p className={styles.quiet}>{hasConnection ? "Niciun email sau eveniment disponibil aici; sincronizarea și asocierea pot limita contextul." : "Context privat neconectat sau indisponibil pentru utilizatorul curent."}</p> : null}
      <Link href="/apps" className="focus-ring text-xs underline">Verifică sursele și conexiunea</Link>
    </details>
  </section>;
}
