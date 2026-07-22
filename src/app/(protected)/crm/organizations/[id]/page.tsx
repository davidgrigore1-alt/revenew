import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { getStatusLabel } from "@/components/dashboard/StatusBadge";
import { CreateOpportunityPanel } from "@/components/opportunities/CreateOpportunityPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { approvalStateForSignal } from "@/lib/approval-center";
import { getCompanyIntelligenceSnapshot, type CompanyAttentionSeverity } from "@/lib/company-intelligence";
import { safeCompanyWebsiteHref } from "@/lib/crm/website";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const relationshipLabels: Record<string, string> = {
  prospect: "Prospect",
  customer: "Client",
  partner: "Partener",
  inactive: "Inactiv"
};

const severityLabels: Record<CompanyAttentionSeverity, string> = {
  critical: "Critic",
  high: "Prioritar",
  medium: "De completat",
  low: "Informativ"
};

const severityTones: Record<CompanyAttentionSeverity, "danger" | "warning" | "info" | "neutral"> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "neutral"
};

function recoverableValue(values: Record<string, number>) {
  const entries = Object.entries(values).filter(([, value]) => value > 0);
  return entries.length > 0 ? entries.map(([currency, value]) => formatCurrency(value, currency)).join(" · ") : "Neestimată";
}

export default async function CrmOrganizationDetailPage({ params }: { params: { id: string } }) {
  const result = await getCompanyIntelligenceSnapshot(params.id);
  if (!result.ready) {
    return (
      <PageShell eyebrow="CRM" title="Datele companiei nu sunt disponibile" description={result.error ?? "Compania nu poate fi încărcată."}>
        <DataCard title="Acces indisponibil" description={result.error ?? "Verifică configurarea workspace-ului și încearcă din nou."} />
      </PageShell>
    );
  }
  if (!result.snapshot) notFound();

  const snapshot = result.snapshot;
  const { organization, identity, commercial, canonicalNextAction } = snapshot;
  const websiteHref = safeCompanyWebsiteHref(organization.website);

  return (
    <PageShell
      eyebrow="Company 360"
      title={organization.name}
      description={[organization.industry, organization.city, organization.county].filter(Boolean).join(" · ") || "Context comercial centralizat pentru această companie."}
      actions={<CreateOpportunityPanel organizations={[organization]} />}
      breadcrumbs={[{ label: "Companii", href: "/companies" }, { label: organization.name }]}
    >
      <div className="grid gap-5 sm:gap-6">
        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:p-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="brand">{relationshipLabels[organization.relationshipStatus ?? "prospect"] ?? "Relație neconfirmată"}</StatusPill>
                {organization.industry ? <span className="text-sm text-[rgb(var(--text-muted))]">{organization.industry}</span> : null}
              </div>
              <h2 className="mt-4 text-section-title font-semibold tracking-[-0.015em]">Context comercial</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--text-secondary))]">{organization.notes || "Context comun pentru ownership, follow-up și deciziile comerciale legate de companie."}</p>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div><dt className="text-[rgb(var(--text-muted))]">Contact principal</dt><dd className="mt-1 font-semibold">{identity.primaryContact?.fullName ?? "Neconfirmat"}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">Localizare</dt><dd className="mt-1 font-semibold">{identity.location ?? "Necompletată"}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">Responsabil comercial</dt><dd className="mt-1 font-semibold">{identity.owner ?? "Neatribuit"}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">Website</dt><dd className="mt-1 font-semibold">{websiteHref ? <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="focus-ring inline-flex max-w-full items-center gap-1.5 break-all text-[rgb(var(--primary))] hover:underline">{organization.website}<ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" aria-hidden="true" /></a> : "Necompletat"}</dd></div>
              </dl>
            </div>
            <div className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><BuildingOffice2Icon className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden="true" />Relație conectată</div>
              <dl className="mt-4 grid gap-3 text-sm">
                <div><dt className="text-[rgb(var(--text-muted))]">Contacte relevante</dt><dd className="mt-1 font-semibold">{identity.contactCount}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">Oportunități active</dt><dd className="mt-1 font-semibold">{commercial.activeOpportunities}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">Semnale nerezolvate</dt><dd className="mt-1 font-semibold">{commercial.unresolvedSignals}</dd></div>
                <div><dt className="text-[rgb(var(--text-muted))]">Închise / arhivate</dt><dd className="mt-1 font-semibold">{commercial.closedOpportunities} / {commercial.archivedOpportunities}</dd></div>
              </dl>
              <p className="mt-4 border-t border-[rgb(var(--border))] pt-4 text-xs leading-5 text-[rgb(var(--text-muted))]">Rezumatul folosește numai relațiile explicite din workspace. Nu completează automat informații lipsă.</p>
            </div>
          </div>
        </Card>

        <Card as="section" variant="default" padding="default">
          <SectionHeader
            eyebrow="Control operațional"
            title="Inteligență companie"
            description="Situația comercială, blocajele și următorul pas, explicate prin sursele existente."
            actions={canonicalNextAction ? <Button href={canonicalNextAction.href} size="small">Continuă acțiunea <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button> : undefined}
          />
          <dl className="mt-5 grid gap-4 border-t border-[rgb(var(--border))] pt-5 sm:grid-cols-2 xl:grid-cols-4">
            <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Valoare recuperabilă estimată</dt><dd className="mt-2 text-xl font-semibold tabular-nums">{recoverableValue(commercial.recoverableValueByCurrency)}</dd><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Separată de venitul confirmat</p></div>
            <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Necesită atenție</dt><dd className="mt-2 text-2xl font-semibold">{snapshot.attention.length}</dd><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{commercial.blockedOrOverdue} oportunități blocate sau restante</p></div>
            <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Aprobări umane</dt><dd className="mt-2 text-2xl font-semibold">{commercial.pendingApprovals}</dd><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Nicio acțiune externă automată</p></div>
            <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Ultima activitate</dt><dd className="mt-2 font-semibold">{commercial.latestActivity ? formatDate(commercial.latestActivity.occurredAt) : "Fără activitate"}</dd><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{commercial.inactivityDays === null ? "Nu există un reper datat" : `Acum ${commercial.inactivityDays} zile`}</p></div>
          </dl>

          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <div className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] p-4 sm:p-5">
              <div className="flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5 text-[rgb(var(--warning-text))]" aria-hidden="true" /><h3 className="font-semibold">Ce necesită atenție</h3></div>
              {snapshot.attention.length > 0 ? (
                <div className="mt-3 divide-y divide-[rgb(var(--border))]">
                  {snapshot.attention.slice(0, 5).map((item) => (
                    <Link key={item.id} href={item.href} className="focus-ring group grid gap-2 py-3 first:pt-1 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
                      <StatusPill tone={severityTones[item.severity]}>{severityLabels[item.severity]}</StatusPill>
                      <span className="min-w-0"><span className="block text-sm font-semibold group-hover:text-[rgb(var(--primary))]">{item.title}</span><span className="mt-1 block text-xs leading-5 text-[rgb(var(--text-muted))]">{item.description}</span><span className="mt-1 block text-[0.6875rem] text-[rgb(var(--text-faint))]">Sursă: {item.evidence.label}</span></span>
                      <ArrowRightIcon className="mt-1 hidden h-4 w-4 text-[rgb(var(--text-faint))] sm:block" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              ) : <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-muted))]">Nu există blocaje determinate din datele disponibile.</p>}
            </div>

            <div className="rounded-card border border-[rgb(var(--gold-500)/0.35)] bg-[rgb(var(--gold-50)/0.45)] p-4 dark:bg-[rgb(var(--surface-muted))] sm:p-5">
              <div className="flex items-center gap-2"><CheckCircleIcon className="h-5 w-5 text-[rgb(var(--gold-600))]" aria-hidden="true" /><h3 className="font-semibold">Acțiunea canonică următoare</h3></div>
              {canonicalNextAction ? (
                <div className="mt-4">
                  <p className="text-lg font-semibold tracking-[-0.01em]">{canonicalNextAction.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{canonicalNextAction.description}</p>
                  <dl className="mt-4 grid gap-2 text-xs text-[rgb(var(--text-muted))] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div><dt>Responsabil</dt><dd className="mt-1 font-semibold text-[rgb(var(--foreground))]">{canonicalNextAction.ownerName ?? "De confirmat"}</dd></div>
                    <div><dt>Termen</dt><dd className="mt-1 font-semibold text-[rgb(var(--foreground))]">{canonicalNextAction.dueAt ? formatDate(canonicalNextAction.dueAt) : "De confirmat"}</dd></div>
                  </dl>
                  <p className="mt-4 border-t border-[rgb(var(--border))] pt-3 text-[0.6875rem] leading-5 text-[rgb(var(--text-faint))]">Sursă: {canonicalNextAction.evidence.label}</p>
                  <Button href={canonicalNextAction.href} variant="secondary" size="small" className="mt-3 w-full">Revizuiește acțiunea</Button>
                </div>
              ) : <EmptyState title="Nu există încă o acțiune canonică" description="Leagă o oportunitate sau un semnal verificat pentru a determina următorul pas fără presupuneri." />}
            </div>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-5">
            <DataCard title="Relații comerciale" description="Persoanele și rolurile conectate explicit la companie și oportunități.">
              {snapshot.contacts.length > 0 ? <div className="divide-y divide-[rgb(var(--border))]">{snapshot.contacts.map((contact) => <article key={contact.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{contact.fullName}</h3>{contact.isPrimary ? <StatusPill tone="success">Principal</StatusPill> : null}</div><p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{[contact.jobTitle, contact.decisionRole, ...contact.opportunityRoles].filter(Boolean).join(" · ") || "Rol neconfirmat"}</p><p className="mt-2 text-xs text-[rgb(var(--text-faint))]">{contact.opportunityCount > 0 ? `${contact.opportunityCount} oportunități conectate` : "Fără oportunitate conectată"}</p></article>)}</div> : <EmptyState title="Nicio persoană asociată" description="Adaugă persoana cu care discuți pentru a păstra continuitatea relației." actions={<Button href="/contacts" variant="secondary">Adaugă contact</Button>} />}
            </DataCard>
          </div>
          <div className="xl:col-span-7">
            <DataCard title="Oportunități asociate" description="Valoare estimată, responsabil și pas următor pentru fiecare context comercial.">
              {snapshot.opportunities.length > 0 ? <div className="divide-y divide-[rgb(var(--border))]">{snapshot.opportunities.map((opportunity) => <Link key={opportunity.id} href={opportunity.href} className="focus-ring group grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-semibold group-hover:text-[rgb(var(--primary))]">{opportunity.title}</h3><StatusPill tone={opportunity.nextActionTitle && opportunity.ownerName ? "neutral" : "warning"}>{getStatusLabel(opportunity.status)}</StatusPill></div><p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{opportunity.ownerName ?? "Fără responsabil"} · {opportunity.nextActionTitle ?? "Fără acțiune următoare"}{opportunity.nextActionDueAt ? ` · ${formatDate(opportunity.nextActionDueAt)}` : ""}</p></div><p className="font-semibold tabular-nums">{formatCurrency(opportunity.estimatedValue, opportunity.currency)}</p></Link>)}</div> : <EmptyState title="Nicio oportunitate asociată" description="Creează prima oportunitate pentru a urmări valoarea, responsabilul și următorul pas." />}
            </DataCard>
          </div>
        </div>

        <Card as="section" variant="default" padding="default">
          <SectionHeader title="Informații lipsă" description="Lacune determinate din datele existente, cu traseul sigur pentru completare." />
          {snapshot.knowledgeGaps.length > 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{snapshot.knowledgeGaps.map((gap) => <Link key={gap.code} href={gap.href} className="focus-ring group flex min-w-0 items-start justify-between gap-3 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] p-4 hover:border-[rgb(var(--border-strong))]"><span className="min-w-0"><span className="block text-sm font-semibold">{gap.label}</span><span className="mt-1 block text-xs text-[rgb(var(--primary))]">{gap.actionLabel}</span><span className="mt-2 block text-[0.6875rem] text-[rgb(var(--text-faint))]">Verificat din: {gap.evidence.label}</span></span><ArrowRightIcon className="h-4 w-4 shrink-0 text-[rgb(var(--text-faint))] group-hover:text-[rgb(var(--primary))]" aria-hidden="true" /></Link>)}</div> : <div className="mt-4 flex items-center gap-2 rounded-card border border-[rgb(var(--success-border))] bg-[rgb(var(--success-bg))] p-4 text-sm text-[rgb(var(--success-text))]"><CheckCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />Datele operaționale esențiale sunt disponibile.</div>}
        </Card>

        <DataCard title="Semnale și decizii" description="Semnale legate explicit de companie și traseul lor către revizuire umană.">
          {snapshot.signals.length > 0 ? <div className="divide-y divide-[rgb(var(--border))]">{snapshot.signals.slice(0, 6).map((signal) => { const pendingApproval = approvalStateForSignal(signal) === "pending"; return <Link key={signal.id} href={pendingApproval ? `/approvals?signal=${signal.id}` : `/inbox?signal=${signal.id}`} className="focus-ring group grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-semibold group-hover:text-[rgb(var(--primary))]">{signal.title}</h3><StatusPill tone={signal.status === "converted" ? "success" : signal.status === "archived" ? "neutral" : "warning"}>{signal.status === "converted" ? "Convertit" : signal.status === "archived" ? "Arhivat" : pendingApproval ? "Aprobare necesară" : "De verificat"}</StatusPill></div><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{signal.sourceLabel ?? signal.source} · {formatDate(signal.createdAt ?? signal.occurredAt ?? undefined)}</p>{signal.recommendedAction ? <p className="mt-1 line-clamp-1 text-xs text-[rgb(var(--text-secondary))]">Acțiune recomandată: {signal.recommendedAction}</p> : null}</div><span className="text-xs font-semibold text-[rgb(var(--primary))]">{pendingApproval ? "Revizuiește aprobarea" : "Deschide în Inbox"}</span></Link>; })}</div> : <p className="text-sm text-[rgb(var(--text-muted))]">Nu există semnale legate explicit de această companie.</p>}
        </DataCard>

        <DataCard title="Activitate susținută de dovezi" description="Evenimente comerciale ordonate cronologic, fiecare cu sursa și traseul său intern.">
          {snapshot.timeline.length > 0 ? <ol className="relative ml-2 border-l border-[rgb(var(--border))] pl-6">{snapshot.timeline.map((activity) => <li key={activity.id} className="relative pb-5 last:pb-0"><span className="absolute -left-[1.78rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[rgb(var(--surface))] bg-[rgb(var(--gold-500))]" aria-hidden="true" /><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{activity.label}</p><StatusPill tone="neutral">{activity.kind}</StatusPill></div><p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{formatDate(activity.occurredAt)} · Sursă: {activity.evidence.label}</p>{activity.description ? <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-secondary))]">{activity.description}</p> : null}{activity.href ? <Link href={activity.href} className="focus-ring mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[rgb(var(--primary))] hover:underline">Deschide sursa <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" /></Link> : null}</li>)}</ol> : <EmptyState title="Fără activitate înregistrată" description="Activitatea apare numai după semnale, acțiuni, documente sau evenimente reale. ReveNew nu inventează istoric." />}
        </DataCard>
      </div>
    </PageShell>
  );
}
