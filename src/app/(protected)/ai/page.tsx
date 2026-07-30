import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";
import { PageShell } from "@/components/dashboard/PageShell";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { aiCapabilities, type AiCapabilityDefinition, type AiCapabilityStatus } from "@/lib/ai-capabilities";
import {
  buildOperationalIntelligenceCenter,
  unavailableOperationalIntelligence,
  type OperationalIntelligenceRecommendation
} from "@/lib/operational-intelligence";
import { getRecoverySummary } from "@/lib/recovery";
import { buildWorkspaceDecisionQueue } from "@/lib/workspace-decision-queue";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type RegistryGroup = {
  status: AiCapabilityStatus;
  title: string;
  description: string;
};

const statusCopy: Record<AiCapabilityStatus, { label: string; tone: BadgeTone; icon: typeof CheckCircleIcon }> = {
  available_internal: { label: "Capabilitate disponibilă intern", tone: "success", icon: CheckCircleIcon },
  sandbox_only: { label: "Mediu demonstrativ", tone: "info", icon: ClockIcon },
  planned: { label: "Planificat", tone: "neutral", icon: ClockIcon },
  blocked_until_security_review: { label: "Blocat până la revizuire de securitate", tone: "warning", icon: LockClosedIcon }
};

const registryGroups: RegistryGroup[] = [
  {
    status: "available_internal",
    title: "Inteligență operațională activă",
    description: "Explicații, recomandări și pregătire internă bazate pe dovezi existente."
  },
  {
    status: "sandbox_only",
    title: "Mediu demonstrativ",
    description: "Scenarii locale controlate, fără conexiuni sau efecte externe reale."
  },
  {
    status: "planned",
    title: "Planificat",
    description: "Direcții documentate care nu sunt activate în versiunea curentă."
  },
  {
    status: "blocked_until_security_review",
    title: "Blocat până la revizuire",
    description: "Capabilități externe inactive până la controale complete de securitate, audit și aprobare."
  }
];

function routeFor(capability: AiCapabilityDefinition) {
  if (capability.status === "blocked_until_security_review" || capability.status === "planned") return null;
  if (capability.id === "ai.businessAnalystExplain") return { href: "/dashboard", label: "Deschide analiza" };
  if (capability.id.startsWith("opportunity.")) return { href: "/opportunities", label: "Deschide oportunitățile" };
  if (capability.id === "audit.generateFromEvidence") return { href: "/reports/revenue-recovery-audit", label: "Deschide auditul" };
  if (capability.id === "pilot.proofOfValueExplain") return { href: "/reports/pilot-proof-of-value", label: "Deschide validarea" };
  if (capability.category === "calendar" || capability.category === "voice") return { href: "/demo/appointment-control", label: "Deschide mediul demonstrativ" };
  if (capability.category === "gmail") return { href: "/inbox", label: "Deschide Inbox Comercial" };
  return null;
}

function riskLabel(capability: AiCapabilityDefinition) {
  return ({ low: "Risc redus", medium: "Risc moderat", high: "Risc ridicat", critical: "Risc critic" } as const)[capability.riskLevel];
}

function recommendationTone(recommendation: OperationalIntelligenceRecommendation): BadgeTone {
  if (recommendation.severity === "critical") return "danger";
  if (recommendation.severity === "attention") return "warning";
  return "neutral";
}

function CapabilityCard({ capability }: { capability: AiCapabilityDefinition }) {
  const status = statusCopy[capability.status];
  const StatusIcon = status.icon;
  const route = routeFor(capability);

  return (
    <article className="flex min-w-0 flex-col rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Badge tone={status.tone} size="small"><StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />{status.label}</Badge>
        <span className="text-xs font-medium text-[rgb(var(--text-muted))]">{riskLabel(capability)}</span>
      </div>
      <h4 className="mt-4 font-semibold tracking-[-0.01em]">{capability.label}</h4>
      <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{capability.description}</p>
      <p className="mt-4 text-xs leading-5 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">Limită actuală:</strong> {capability.currentLimitations[0]}</p>

      <details className="group mt-4 border-t border-[rgb(var(--border))] pt-3">
        <summary className="focus-ring flex min-h-9 cursor-pointer list-none items-center justify-between rounded-button text-xs font-semibold marker:hidden">
          Cerințe de control
          <span className="text-[rgb(var(--text-muted))] group-open:hidden">+</span>
        </summary>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <div><dt className="text-[rgb(var(--text-faint))]">Dovezi</dt><dd className="mt-0.5 font-semibold">{capability.requiresEvidence ? "Obligatorii" : "Nu sunt cerute"}</dd></div>
          <div><dt className="text-[rgb(var(--text-faint))]">Control uman</dt><dd className="mt-0.5 font-semibold">{capability.requiresHumanApproval ? "Aprobare necesară" : "Doar explicare"}</dd></div>
          <div><dt className="text-[rgb(var(--text-faint))]">Audit</dt><dd className="mt-0.5 font-semibold">{capability.requiresAuditLog ? "Obligatoriu" : "Nu este cerut"}</dd></div>
          <div><dt className="text-[rgb(var(--text-faint))]">Efect extern</dt><dd className="mt-0.5 font-semibold">{capability.externalSideEffect ? "Blocat în prezent" : "Niciunul"}</dd></div>
        </dl>
      </details>

      <div className="mt-auto pt-4">
        {route ? (
          <Button href={route.href} variant="secondary" size="small">{route.label}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
        ) : (
          <span className="inline-flex min-h-9 items-center rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-3 text-xs font-semibold text-[rgb(var(--text-muted))]">Indisponibil în versiunea curentă</span>
        )}
      </div>
    </article>
  );
}

function RecommendationCard({
  recommendation,
  position
}: {
  recommendation: OperationalIntelligenceRecommendation;
  position: number;
}) {
  return (
    <article className="flex min-w-0 flex-col rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge tone={recommendationTone(recommendation)} size="small">{recommendation.typeLabel}</Badge>
        <span className="text-xs font-semibold text-[rgb(var(--text-faint))]">Prioritatea {position}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">{recommendation.title}</h3>
      {(recommendation.companyName || recommendation.opportunityTitle) ? (
        <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{[recommendation.companyName, recommendation.opportunityTitle].filter(Boolean).join(" · ")}</p>
      ) : null}
      <p className="mt-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">{recommendation.whyItMatters}</p>

      {recommendation.estimatedValue && recommendation.currency ? (
        <div className="mt-4 rounded-control border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--warning-text))]">Valoare estimată, neconfirmată</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-[rgb(var(--foreground))]">{formatCurrency(recommendation.estimatedValue, recommendation.currency)}</p>
          <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Nu reprezintă venit confirmat.</p>
        </div>
      ) : null}

      <div className="mt-4 border-t border-[rgb(var(--border))] pt-4">
        <p className="flex items-start gap-2 text-xs leading-5 text-[rgb(var(--text-muted))]"><DocumentMagnifyingGlassIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" /><span><strong className="text-[rgb(var(--foreground))]">Bazat pe:</strong> {recommendation.evidenceLabel}</span></p>
        <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{recommendation.uncertainty}</p>
        <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{recommendation.controlNote}</p>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <Button href={recommendation.actionHref} size="small">{recommendation.actionLabel}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
        <Button href={recommendation.evidenceHref} variant="ghost" size="small">Verifică dovada</Button>
      </div>
    </article>
  );
}

export default async function AiControlCenterPage() {
  const activeCount = aiCapabilities.filter((capability) => capability.status === "available_internal").length;
  const sandboxCount = aiCapabilities.filter((capability) => capability.status === "sandbox_only").length;
  const blockedCount = aiCapabilities.filter((capability) => capability.status === "blocked_until_security_review").length;
  let intelligence;

  try {
    const summary = await getRecoverySummary();
    const queue = buildWorkspaceDecisionQueue(
      { opportunities: summary.opportunities, signals: summary.signals },
      { limit: 3 }
    );
    intelligence = buildOperationalIntelligenceCenter(queue);
  } catch (error) {
    console.error("Operational intelligence load error", error);
    intelligence = unavailableOperationalIntelligence();
  }

  return (
    <PageShell
      eyebrow="Inteligență controlată"
      title="Controlul inteligenței operaționale"
      description="Riscuri, dovezi și acțiuni sigure derivate din datele comerciale disponibile, cu decizia finală păstrată la oameni."
      breadcrumbs={[{ label: "Control Center", href: "/dashboard" }, { label: "Inteligență operațională" }]}
    >
      <section className="ai-command-grid relative overflow-hidden rounded-panel border border-[rgb(var(--brand-500)/0.24)] bg-[rgb(var(--surface))] p-5 shadow-card sm:p-6 lg:p-8" aria-labelledby="operational-intelligence-summary">
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-card border border-[rgb(var(--brand-500)/0.34)] bg-[rgb(var(--brand-500)/0.08)] text-[rgb(var(--primary))]"><CpuChipIcon className="h-5 w-5" aria-hidden="true" /></div>
              <Badge tone={intelligence.state === "critical" ? "danger" : intelligence.state === "attention" ? "warning" : intelligence.state === "unavailable" ? "neutral" : "info"}>{intelligence.stateLabel}</Badge>
            </div>
            <h2 id="operational-intelligence-summary" className="mt-5 max-w-3xl text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{intelligence.headline}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgb(var(--text-secondary))]">{intelligence.observation}</p>

            <div className="mt-6 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Decizia care merită atenție</p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em]">{intelligence.decisionTitle}</h3>
              <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-[rgb(var(--text-muted))]"><DocumentMagnifyingGlassIcon className="mt-1 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" /><span><strong className="text-[rgb(var(--foreground))]">Dovadă:</strong> {intelligence.evidenceLabel}</span></p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button href={intelligence.safeActionHref}>{intelligence.safeActionLabel}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
                {intelligence.evidenceHref ? <Button href={intelligence.evidenceHref} variant="secondary">Verifică dovada</Button> : null}
              </div>
            </div>
          </div>

          <aside className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.88)] p-4 sm:p-5" aria-label="Starea inteligenței operaționale">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">Ce observă ReveNew acum?</p>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-3"><dt className="text-xs text-[rgb(var(--text-muted))]">Decizii identificate</dt><dd className="mt-1 text-2xl font-semibold">{intelligence.totalCandidates}</dd></div>
              <div className="rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-3"><dt className="text-xs text-[rgb(var(--text-muted))]">Dovezi în recomandări</dt><dd className="mt-1 text-2xl font-semibold">{intelligence.evidenceCount}</dd></div>
              <div className="rounded-control border border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] p-3"><dt className="text-xs text-[rgb(var(--text-muted))]">Critice</dt><dd className="mt-1 text-2xl font-semibold text-[rgb(var(--danger-text))]">{intelligence.criticalCount}</dd></div>
              <div className="rounded-control border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] p-3"><dt className="text-xs text-[rgb(var(--text-muted))]">Necesită atenție</dt><dd className="mt-1 text-2xl font-semibold text-[rgb(var(--warning-text))]">{intelligence.attentionCount}</dd></div>
            </dl>

            {intelligence.estimatedExposedValueByCurrency.length > 0 ? (
              <div className="mt-4 border-t border-[rgb(var(--border))] pt-4">
                <p className="text-xs font-semibold text-[rgb(var(--foreground))]">Valoare estimată expusă</p>
                <div className="mt-2 grid gap-1">
                  {intelligence.estimatedExposedValueByCurrency.map(({ currency, value }) => (
                    <p key={currency} className="flex items-center justify-between gap-3 text-sm"><span className="text-[rgb(var(--text-muted))]">{currency}</span><strong className="tabular-nums">{formatCurrency(value, currency)}</strong></p>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Valori deduplicate pe oportunitate și separate de venitul confirmat.</p>
              </div>
            ) : null}

            <div className="mt-4 border-t border-[rgb(var(--border))] pt-4">
              <p className="flex items-start gap-2 text-xs leading-5 text-[rgb(var(--text-muted))]"><ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />Nicio comunicare externă nu este trimisă automat. ReveNew nu execută acțiuni comerciale riscante fără aprobarea explicită a unei persoane.</p>
            </div>
          </aside>
        </div>
      </section>

      <section aria-labelledby="operational-recommendations">
        <div className="mb-4 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">Priorități din datele existente</p>
          <h2 id="operational-recommendations" className="mt-2 text-xl font-semibold tracking-[-0.02em]">Recomandări operaționale</h2>
          <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">Cel mult trei decizii ordonate determinist după severitate, termen și valoare estimată. Nu sunt acțiuni executate.</p>
        </div>
        {intelligence.recommendations.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {intelligence.recommendations.map((recommendation, index) => (
              <RecommendationCard key={recommendation.id} recommendation={recommendation} position={index + 1} />
            ))}
          </div>
        ) : (
          <div className="rounded-panel border border-dashed border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-subtle))] p-6">
            <ExclamationTriangleIcon className="h-6 w-6 text-[rgb(var(--text-muted))]" aria-hidden="true" />
            <h3 className="mt-3 font-semibold">Nu există recomandări verificabile acum</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--text-muted))]">ReveNew nu inventează riscuri sau priorități. Completează date comerciale reale ori revino după restabilirea accesului la dovezi.</p>
            <Button href={intelligence.safeActionHref} variant="secondary" size="small" className="mt-4">{intelligence.safeActionLabel}</Button>
          </div>
        )}
      </section>

      <details className="group rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card">
        <summary className="focus-ring flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-panel px-5 py-4 marker:hidden sm:px-6">
          <span>
            <span className="block font-semibold">Registrul complet de capabilități și limite</span>
            <span className="mt-1 block text-xs font-normal leading-5 text-[rgb(var(--text-muted))]">Secundar recomandărilor curente · {aiCapabilities.length} capabilități documentate</span>
          </span>
          <span className="shrink-0 rounded-pill border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-3 py-1 text-xs font-semibold text-[rgb(var(--text-muted))] group-open:hidden">Deschide registrul</span>
        </summary>
        <div className="grid gap-8 border-t border-[rgb(var(--border))] p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-control border border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] p-3"><p className="text-xs text-[rgb(var(--text-muted))]">Disponibile intern</p><p className="mt-1 text-xl font-semibold">{activeCount}</p></div>
            <div className="rounded-control border border-[rgb(var(--info-border))] bg-[rgb(var(--info-background))] p-3"><p className="text-xs text-[rgb(var(--text-muted))]">Medii demonstrative</p><p className="mt-1 text-xl font-semibold">{sandboxCount}</p></div>
            <div className="rounded-control border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] p-3"><p className="text-xs text-[rgb(var(--text-muted))]">Blocate</p><p className="mt-1 text-xl font-semibold">{blockedCount}</p></div>
          </div>

          {registryGroups.map((group) => {
            const capabilities = aiCapabilities.filter((capability) => capability.status === group.status);
            return (
              <section key={group.status} aria-labelledby={`registry-${group.status}`}>
                <div className="mb-4 max-w-3xl">
                  <h3 id={`registry-${group.status}`} className="text-lg font-semibold">{group.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">{group.description}</p>
                </div>
                {capabilities.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {capabilities.map((capability) => <CapabilityCard key={capability.id} capability={capability} />)}
                  </div>
                ) : (
                  <p className="rounded-control border border-dashed border-[rgb(var(--border))] p-4 text-sm text-[rgb(var(--text-muted))]">Nicio capabilitate nu are acest statut în versiunea curentă.</p>
                )}
              </section>
            );
          })}
        </div>
      </details>

      <section className="rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-5 sm:p-6" aria-labelledby="ai-governance-title">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="mt-0.5 h-6 w-6 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />
          <div>
            <h2 id="ai-governance-title" className="font-semibold">Limita operațională este parte din produs</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[rgb(var(--text-muted))]">Gmail nu este conectat. Google Calendar nu este conectat. Telefonia și vocea nu sunt active. Capabilitățile cu efect extern rămân blocate până la autorizare minimă, stocare sigură, revocare, audit și aprobare umană verificabilă. Statutul afișat nu promite disponibilitate viitoare.</p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
