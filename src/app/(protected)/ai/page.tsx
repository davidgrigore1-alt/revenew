import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  LockClosedIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";
import { PageShell } from "@/components/dashboard/PageShell";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { aiCapabilities, type AiCapabilityDefinition, type AiCapabilityStatus } from "@/lib/ai-capabilities";

type CapabilityGroup = {
  id: string;
  title: string;
  description: string;
  capabilityIds: readonly string[];
};

const statusCopy: Record<AiCapabilityStatus, { label: string; tone: BadgeTone; icon: typeof CheckCircleIcon }> = {
  available_internal: { label: "Activ intern", tone: "success", icon: CheckCircleIcon },
  sandbox_only: { label: "Mediu controlat", tone: "info", icon: ClockIcon },
  planned: { label: "Planificat", tone: "neutral", icon: ClockIcon },
  blocked_until_security_review: { label: "Blocat până la revizuirea de securitate", tone: "warning", icon: LockClosedIcon }
};

const groups: CapabilityGroup[] = [
  {
    id: "commercial",
    title: "Inteligență comercială",
    description: "Explicații și recomandări interne bazate pe dovezile disponibile.",
    capabilityIds: ["ai.businessAnalystExplain", "opportunity.suggestNextAction", "opportunity.prepareFollowUpDraft"]
  },
  {
    id: "audit",
    title: "Audit și validarea valorii",
    description: "Livrabile prudente pentru management, fără a confunda estimările cu venitul confirmat.",
    capabilityIds: ["audit.generateFromEvidence", "pilot.proofOfValueExplain"]
  },
  {
    id: "appointment",
    title: "Programări în mediu controlat",
    description: "Scenarii locale demonstrative, fără calendar, telefonie sau rezervări reale.",
    capabilityIds: ["calendar.readDemoAvailability", "calendar.proposeAppointment", "voice.simulatedReceptionist", "voice.extractAppointmentIntent", "voice.proposeBooking", "voice.handoffToHuman"]
  },
  {
    id: "message-sandbox",
    title: "Mesaje introduse manual",
    description: "Clasificare și drafturi locale pentru text furnizat explicit, fără acces la Gmail sau la inboxul utilizatorului.",
    capabilityIds: ["gmail.classifyImportedMessage", "gmail.prepareDraft"]
  },
  {
    id: "future",
    title: "Integrări viitoare controlate",
    description: "Capabilități inactive care necesită politici, OAuth minim, stocare sigură și revizuire de securitate.",
    capabilityIds: ["calendar.googleFreeBusyPlanned", "calendar.createEventAfterApproval", "gmail.createDraftAfterApproval", "gmail.sendAfterApproval", "voice.realPhoneReceptionistPlanned"]
  }
];

function routeFor(capability: AiCapabilityDefinition) {
  if (capability.status === "blocked_until_security_review" || capability.status === "planned") return null;
  if (capability.id === "ai.businessAnalystExplain") return { href: "/dashboard", label: "Deschide analiza" };
  if (capability.id.startsWith("opportunity.")) return { href: "/opportunities", label: "Deschide oportunitățile" };
  if (capability.id === "audit.generateFromEvidence") return { href: "/reports/revenue-recovery-audit", label: "Deschide auditul" };
  if (capability.id === "pilot.proofOfValueExplain") return { href: "/reports/pilot-proof-of-value", label: "Deschide validarea" };
  if (capability.category === "calendar" || capability.category === "voice") return { href: "/demo/appointment-control", label: "Deschide mediul controlat" };
  if (capability.category === "gmail") return { href: "/inbox", label: "Deschide Inbox Comercial" };
  return null;
}

function riskLabel(capability: AiCapabilityDefinition) {
  return ({ low: "Risc redus", medium: "Risc moderat", high: "Risc ridicat", critical: "Risc critic" } as const)[capability.riskLevel];
}

function CapabilityCard({ capability }: { capability: AiCapabilityDefinition }) {
  const status = statusCopy[capability.status];
  const StatusIcon = status.icon;
  const route = routeFor(capability);

  return (
    <article className="flex min-w-0 flex-col rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Badge tone={status.tone} size="small"><StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />{status.label}</Badge>
        <span className="text-xs font-medium text-[rgb(var(--text-muted))]">{riskLabel(capability)}</span>
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-[-0.01em]">{capability.label}</h3>
      <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{capability.description}</p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[rgb(var(--border))] pt-4 text-xs">
        <div><dt className="text-[rgb(var(--text-faint))]">Dovezi</dt><dd className="mt-0.5 font-semibold">{capability.requiresEvidence ? "Obligatorii" : "Nu sunt cerute"}</dd></div>
        <div><dt className="text-[rgb(var(--text-faint))]">Control uman</dt><dd className="mt-0.5 font-semibold">{capability.requiresHumanApproval ? "Aprobare necesară" : "Doar explicare"}</dd></div>
        <div><dt className="text-[rgb(var(--text-faint))]">Audit</dt><dd className="mt-0.5 font-semibold">{capability.requiresAuditLog ? "Obligatoriu" : "Nu este cerut"}</dd></div>
        <div><dt className="text-[rgb(var(--text-faint))]">Efect extern</dt><dd className="mt-0.5 font-semibold">{capability.externalSideEffect ? "Posibil, dar blocat" : "Niciunul"}</dd></div>
      </dl>

      <p className="mt-4 text-xs leading-5 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">Limită actuală:</strong> {capability.currentLimitations[0]}</p>
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

export default function AiControlCenterPage() {
  const activeCount = aiCapabilities.filter((capability) => capability.status === "available_internal").length;
  const sandboxCount = aiCapabilities.filter((capability) => capability.status === "sandbox_only").length;
  const blockedCount = aiCapabilities.filter((capability) => capability.status === "blocked_until_security_review").length;

  return (
    <PageShell
      eyebrow="Inteligență controlată"
      title="Controlul inteligenței operaționale"
      description="Vezi exact ce poate face ReveNew, pe ce dovezi se bazează și unde aprobarea umană rămâne obligatorie."
      breadcrumbs={[{ label: "Control Center", href: "/dashboard" }, { label: "Inteligență operațională" }]}
    >
      <section className="ai-command-grid relative overflow-hidden rounded-panel border border-[rgb(var(--brand-500)/0.24)] bg-[rgb(var(--surface))] p-5 shadow-card sm:p-6 lg:p-8" aria-labelledby="ai-control-summary">
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.5fr)] lg:items-end">
          <div className="max-w-3xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-card border border-[rgb(var(--brand-500)/0.34)] bg-[rgb(var(--brand-500)/0.08)] text-[rgb(var(--primary))]"><CpuChipIcon className="h-6 w-6" aria-hidden="true" /></div>
            <h2 id="ai-control-summary" className="mt-5 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Inteligență utilă, cu limite vizibile.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[rgb(var(--text-secondary))] sm:text-base">ReveNew explică, prioritizează și pregătește pași interni. Nu trimite mesaje, nu creează evenimente și nu execută acțiuni comerciale riscante fără aprobarea explicită a unei persoane.</p>
          </div>
          <dl className="grid grid-cols-3 overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.88)]">
            <div className="p-3 sm:p-4"><dt className="text-[0.6875rem] text-[rgb(var(--text-muted))]">Active intern</dt><dd className="mt-1 text-xl font-semibold">{activeCount}</dd></div>
            <div className="border-x border-[rgb(var(--border))] p-3 sm:p-4"><dt className="text-[0.6875rem] text-[rgb(var(--text-muted))]">Mediu controlat</dt><dd className="mt-1 text-xl font-semibold">{sandboxCount}</dd></div>
            <div className="p-3 sm:p-4"><dt className="text-[0.6875rem] text-[rgb(var(--text-muted))]">Blocate</dt><dd className="mt-1 text-xl font-semibold">{blockedCount}</dd></div>
          </dl>
        </div>
      </section>

      <div className="grid gap-8">
        {groups.map((group) => {
          const capabilities = group.capabilityIds.flatMap((id) => {
            const capability = aiCapabilities.find((item) => item.id === id);
            return capability ? [capability] : [];
          });
          return (
            <section key={group.id} aria-labelledby={`ai-group-${group.id}`}>
              <div className="mb-4 max-w-3xl">
                <h2 id={`ai-group-${group.id}`} className="text-xl font-semibold tracking-[-0.02em]">{group.title}</h2>
                <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">{group.description}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {capabilities.map((capability) => <CapabilityCard key={capability.id} capability={capability} />)}
              </div>
            </section>
          );
        })}
      </div>

      <section className="rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-5 sm:p-6" aria-labelledby="ai-governance-title">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="mt-0.5 h-6 w-6 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />
          <div>
            <h2 id="ai-governance-title" className="font-semibold">Limita operațională este parte din produs</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[rgb(var(--text-muted))]">Capabilitățile viitoare cu acces extern rămân blocate până când au autorizare minimă, stocare sigură, revocare, jurnal de audit și aprobare umană verificabilă. Statutul afișat aici descrie registrul implementat, nu activitate live și nu promite disponibilitate viitoare.</p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
