import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { ExplanationDisclosure } from "@/components/intelligence/ExplanationDisclosure";
import { StatusPill } from "@/components/ui/StatusPill";
import type { CompanyAttentionItem, CompanyBusinessMemory as BusinessMemory, CompanyMemoryItem } from "@/lib/company-intelligence";
import type { ExecutiveDecisionSnapshot } from "@/lib/opportunity-discovery";
import { explanationForCompanyMemory } from "@/lib/revenew-explanation-adapters";
import { formatCurrency, formatDate } from "@/lib/utils";
import { companySourceHref } from "@/lib/company-briefing";
import styles from "./CompanyBriefing.module.css";

export function CompanyEvidenceLine({ label, timestamp, href }: { label: string; timestamp: string | null; href?: string }) {
  const valid = timestamp && Number.isFinite(Date.parse(timestamp));
  href = companySourceHref(href);
  return <p className={styles.evidenceLine}>Sursă: {href ? <Link href={href} className="focus-ring hover:underline">{label}</Link> : label} · {valid ? <time dateTime={timestamp}>{formatDate(timestamp)}</time> : "Dată neconfirmată"}</p>;
}

function memoryFor(item: CompanyAttentionItem, memory: BusinessMemory): CompanyMemoryItem {
  const original = [...memory.mustRemember, ...memory.openLoops].find(entry => entry.id === `memory:${item.id}` || entry.id === `loop:${item.id}`);
  return { ...item, href: companySourceHref(item.href), evidence: { ...item.evidence, href: companySourceHref(item.evidence.href) }, type: "open_loop", whyItMatters: original?.whyItMatters };
}

export function CompanyIssueRow({ item, memory }: { item: CompanyAttentionItem; memory: BusinessMemory }) {
  const href = companySourceHref(item.href ?? item.evidence.href);
  return <article className={styles.issueRow} data-issue={item.id}>
    <div><h3>{item.title}</h3><p>{item.description}</p><CompanyEvidenceLine label={item.evidence.label} timestamp={item.evidence.sourceTimestamp} href={item.evidence.href} /><ExplanationDisclosure explanation={explanationForCompanyMemory(memoryFor(item, memory))} className="mt-2" /></div>
    {href ? <Link href={href} className="focus-ring">{item.actionLabel}<ArrowRightIcon className="h-4 w-4 shrink-0" aria-hidden="true" /></Link> : null}
  </article>;
}

export function CompanyBusinessMemory({ memory, executiveDecision, recoverableValueByCurrency, attention }: { memory: BusinessMemory; executiveDecision: ExecutiveDecisionSnapshot; recoverableValueByCurrency: Record<string, number>; attention: CompanyAttentionItem[] }) {
  const primary = attention[0];
  const remaining = attention.slice(1);
  const why = primary ? memoryFor(primary, memory).whyItMatters ?? executiveDecision.whyItMatters : null;
  return <section id="company-memory" aria-labelledby="company-memory-title" className={`${styles.decision} border-l-[rgb(var(--primary))] bg-[rgb(var(--surface-subtle))]`}>
    <header className={styles.sectionHeader}><div><p className="product-eyebrow">Decizie executivă</p><h2 id="company-memory-title">Ce contează acum</h2></div><span className={styles.muted}>{primary ? `${attention.length} ${attention.length === 1 ? "situație de revizuit" : "situații de revizuit"}` : "Pe baza datelor disponibile"}</span></header>
    {primary ? <div className={styles.decisionBody} data-issue={primary.id}>
      <div><StatusPill tone={primary.severity === "critical" ? "danger" : "warning"}>{primary.severity === "critical" ? "Prioritate critică" : "Necesită atenție"}</StatusPill><h3>{primary.title}</h3><p>{primary.description}</p><p className={styles.why}><strong>De ce contează:</strong> {why}</p>
        <CompanyEvidenceLine label={primary.evidence.label} timestamp={primary.evidence.sourceTimestamp} href={primary.evidence.href} /><ExplanationDisclosure explanation={explanationForCompanyMemory(memoryFor(primary, memory))} className="mt-2" />
      </div>
      <div className={styles.decisionAction}><p className="product-eyebrow">Următorul pas</p><Link href={companySourceHref(primary.href)!} className="focus-ring">{primary.actionLabel}<ArrowRightIcon className="h-4 w-4 shrink-0" aria-hidden="true" /></Link><small>Acțiunea rămâne sub controlul echipei.</small></div>
    </div> : <div className={styles.quiet}><h3>Nicio intervenție identificată în datele disponibile</h3><p>Continuă din oportunitățile active sau verifică istoricul relației. Lipsa unui semnal nu confirmă un rezultat comercial.</p></div>}
    {Object.keys(recoverableValueByCurrency).length ? <p className={styles.valueNote}>Valoare recuperabilă estimată · {Object.entries(recoverableValueByCurrency).map(([currency, value]) => formatCurrency(value, currency)).join(" · ")} <span>Separată de venitul confirmat.</span></p> : null}
    {remaining.length ? <details className={styles.otherIssues}><summary className="focus-ring">Alte situații de revizuit · {remaining.length}</summary>{remaining.map(item => <CompanyIssueRow key={item.id} item={item} memory={memory} />)}</details> : null}
  </section>;
}
