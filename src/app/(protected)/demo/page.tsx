import Link from "next/link";
import { ArrowRightIcon, CheckCircleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { DataCard } from "@/components/dashboard/DataCard";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/Button";
import { requirePermission } from "@/lib/authz/require-permission";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { getCommercialSignalsForCurrentBusiness } from "@/lib/commercial-inbox";
import { opportunities as demoOpportunities } from "@/lib/mock-data";
import { getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import type { Opportunity, OpportunityAction, OpportunityDocument } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { buildWorkspaceDecisionQueue } from "@/lib/workspace-decision-queue";

type WorkflowMetrics = {
  documents: OpportunityDocument[];
  actions: OpportunityAction[];
};

const presenterResponses = [
  [
    "Avem deja CRM",
    "ReveNew nu cere înlocuirea CRM-ului. Face vizibile blocajele dintre semnal, responsabil, acțiune, aprobare și rezultat."
  ],
  [
    "De ce putem avea încredere în concluzie?",
    "Fiecare prioritate importantă păstrează legătura cu oportunitatea, acțiunea, documentul, aprobarea sau semnalul care o susține."
  ],
  [
    "Ce face sistemul fără utilizator?",
    "ReveNew pregătește context și recomandări. Oamenii autorizați verifică, aprobă și decid fiecare pas comercial important."
  ],
  [
    "Valoarea afișată este venit?",
    "Nu. Valoarea oportunității rămâne estimată. Venitul apare separat numai după declararea și confirmarea explicită a rezultatului de către utilizator."
  ]
] as const;

async function loadWorkflowMetrics(opportunities: Opportunity[]): Promise<WorkflowMetrics> {
  if (!isSupabaseConfigured) {
    return {
      documents: opportunities.flatMap((opportunity) => opportunity.documents),
      actions: opportunities.flatMap((opportunity) => opportunity.actions)
    };
  }

  const opportunityIds = opportunities.map((opportunity) => opportunity.id);
  if (opportunityIds.length === 0) return { documents: [], actions: [] };

  const supabase = createSupabaseServerClient();
  if (!supabase) return { documents: [], actions: [] };

  const [{ data: documentRows, error: documentError }, { data: actionRows, error: actionError }] = await Promise.all([
    supabase.from("opportunity_documents").select("id,title,document_type,status,created_at,opportunity_id,generation_mode").in("opportunity_id", opportunityIds),
    supabase.from("opportunity_actions").select("id,title,description,status,due_at,priority,type").in("opportunity_id", opportunityIds)
  ]);

  if (documentError || actionError) return { documents: [], actions: [] };

  return {
    documents: (documentRows ?? []).map((document) => ({
      id: document.id,
      title: document.title,
      type: document.document_type,
      status: document.status,
      generationMode: document.generation_mode ?? undefined,
      createdAt: document.created_at ?? undefined
    })),
    actions: (actionRows ?? []).map((action) => ({
      id: action.id,
      type: action.type,
      title: action.title,
      description: action.description ?? "",
      status: action.status,
      dueDate: action.due_at ?? "",
      priority: action.priority ?? "medium"
    }))
  };
}

function statusBadge(isReady: boolean) {
  return (
    <span className={`inline-flex w-fit rounded-pill border px-2.5 py-1 text-xs font-semibold ${
      isReady
        ? "border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] text-[rgb(var(--success-text))]"
        : "border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] text-[rgb(var(--warning-text))]"
    }`}>
      {isReady ? "Pregătit" : "Necesită verificare"}
    </span>
  );
}

export default async function DemoPage() {
  await requirePermission("platform.internal_tools.access");

  const currentBusiness = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const opportunities = isSupabaseConfigured ? await getOpportunitiesForCurrentBusiness() : demoOpportunities;
  const inbox = await getCommercialSignalsForCurrentBusiness();
  const workflow = await loadWorkflowMetrics(opportunities);
  const decisionQueue = buildWorkspaceDecisionQueue({ opportunities, signals: inbox.signals });
  const demoDecision = decisionQueue.items.find((item) => item.relatedOpportunityId) ?? decisionQueue.items[0];
  const demoOpportunityHref = demoDecision?.relatedOpportunityId
    ? demoDecision.actionHref
    : opportunities[0]
      ? `/opportunities/${opportunities[0].id}`
      : "/opportunities";

  const activeOpportunities = opportunities.filter((opportunity) => !["won", "lost", "ignored"].includes(opportunity.status));
  const generatedDocuments = workflow.documents.filter((document) => document.status !== "placeholder");
  const reportsReady = inbox.signals.length > 0 || opportunities.length > 0 || generatedDocuments.length > 0 || workflow.actions.length > 0;

  const journey = [
    {
      time: "0:00–0:40",
      title: "Pornește din Control Center",
      description: "Executive Morning Brief arată problema principală și prima acțiune sigură. coada deciziilor prioritare explică imediat de ce cazul este prioritar.",
      href: "/dashboard",
      action: "Deschide Control Center"
    },
    {
      time: "0:40–1:40",
      title: "Revizuiește decizia critică",
      description: demoDecision
        ? `${demoDecision.title}. Explică impactul comercial și indică dovezile vizibile înainte de a deschide cazul.`
        : "Folosește prima decizie susținută de date și explică impactul ei comercial înainte de a deschide cazul.",
      href: "/dashboard",
      action: "Revizuiește prima decizie"
    },
    {
      time: "1:40–3:00",
      title: "Deschide oportunitatea susținută de dovezi",
      description: "Confirmă responsabilul, blocajul, contactul, următoarea acțiune și faptul că valoarea este estimată. Documentele sunt pregătite pentru revizuire, nu considerate trimise.",
      href: demoOpportunityHref,
      action: "Deschide oportunitatea"
    },
    {
      time: "3:00–4:00",
      title: "Prezintă auditul de recuperare venituri",
      description: "Auditul consolidează riscurile, expunerea estimată deduplicată, dovezile și primele acțiuni controlate într-un raport executiv printabil.",
      href: "/reports/revenue-recovery-audit",
      action: "Deschide auditul"
    },
    {
      time: "4:00–5:00",
      title: "Încheie cu propunerea pilot",
      description: "Pilotul validează în 14 zile dacă echipa poate închide buclele observate. Nu promite venit și păstrează prima acțiune sub control uman.",
      href: "/reports/enterprise-pilot-pack",
      action: "Deschide propunerea pilot"
    }
  ] as const;

  const checklist = [
    { label: "Există o decizie executivă prioritară", ready: Boolean(demoDecision), href: "/dashboard", action: "Verifică Control Center" },
    { label: "Decizia conduce la o oportunitate sau acțiune sigură", ready: Boolean(demoDecision?.relatedOpportunityId || opportunities[0]), href: demoOpportunityHref, action: "Verifică oportunitatea" },
    { label: "Decizia are dovezi verificabile", ready: Boolean(demoDecision?.evidence.length), href: demoOpportunityHref, action: "Verifică dovezile" },
    { label: "Valoarea estimată rămâne separată de venitul confirmat", ready: activeOpportunities.some((opportunity) => opportunity.estimatedValueHigh > 0), href: demoOpportunityHref, action: "Verifică valoarea" },
    { label: "Auditul și propunerea pilot au date disponibile", ready: reportsReady, href: "/reports", action: "Verifică rapoartele" },
    { label: "Documentele necesită revizuire și aprobare umană", ready: generatedDocuments.length > 0 && generatedDocuments.every((document) => document.status !== "sent"), href: demoOpportunityHref, action: "Verifică documentele" }
  ];

  return (
    <PageShell
      eyebrow="Ghid de prezentare"
      title="Traseu demonstrație–pilot · 5 minute"
      description="Un parcurs controlat de la risc comercial și dovezi la prima acțiune sigură, audit executiv și propunere pilot pe 14 zile."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button href="/dashboard">Deschide Control Center</Button>
          <Button href="/reports/revenue-recovery-audit" variant="secondary">Deschide auditul</Button>
        </div>
      }
    >
      <div className="grid gap-6">
        {!isSupabaseConfigured ? <DemoNotice /> : null}

        <section className="overflow-hidden rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card" aria-labelledby="demo-positioning-title">
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] lg:p-8">
            <div>
              <p className="text-label text-[rgb(var(--primary))]">Poziționare executivă</p>
              <h2 id="demo-positioning-title" className="mt-2 max-w-3xl font-display text-2xl font-semibold tracking-tight text-[rgb(var(--foreground))] sm:text-3xl">
                ReveNew arată ce risc comercial nu trebuie uitat și care este următoarea decizie sigură.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[rgb(var(--text-secondary))]">
                Produsul conectează semnalul, oportunitatea, responsabilul, termenul, dovezile și aprobarea într-un flux controlat. Interpretarea rămâne verificabilă, iar echipa decide fiecare pas important.
              </p>
            </div>
            <div className="rounded-card border border-[rgb(var(--primary)/0.24)] bg-[rgb(var(--primary-muted))] p-5">
              <div className="flex gap-3">
                <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-[rgb(var(--foreground))]">Principiul demonstrației</h3>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Valoarea rămâne estimată până la un rezultat confirmat de utilizator. Nicio comunicare externă nu este trimisă automat.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {demoDecision ? (
          <DataCard title="Decizia folosită în demonstrație" description="Aceeași prioritate deterministă este disponibilă în coada deciziilor prioritare.">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <p className="text-label text-[rgb(var(--primary))]">{demoDecision.statusLabel}</p>
                <h3 className="mt-2 text-lg font-semibold text-[rgb(var(--foreground))]">{demoDecision.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{demoDecision.whyItMatters}</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[rgb(var(--text-muted))]">
                  {demoDecision.relatedOpportunityTitle ? <span><strong className="text-[rgb(var(--foreground))]">Oportunitate:</strong> {demoDecision.relatedOpportunityTitle}</span> : null}
                  {demoDecision.estimatedValue !== undefined && demoDecision.currency ? <span><strong className="text-[rgb(var(--foreground))]">Valoare estimată:</strong> {formatCurrency(demoDecision.estimatedValue, demoDecision.currency)} · nu este venit confirmat</span> : null}
                </div>
                <p className="mt-3 text-xs text-[rgb(var(--text-faint))]">Bazat pe: {demoDecision.evidence.map((source) => source.label).join(" · ")}</p>
              </div>
              <Button href={demoDecision.actionHref} variant="secondary">{demoDecision.actionLabel}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
            </div>
          </DataCard>
        ) : null}

        <DataCard title="Traseul de prezentare" description="Urmează ordinea de mai jos. Nu este necesară prezentarea indicatorilor secundari.">
          <ol className="grid gap-3">
            {journey.map((step, index) => (
              <li key={step.title} className="grid gap-4 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--primary-muted))] text-sm font-semibold text-[rgb(var(--primary))]">{index + 1}</span>
                <div>
                  <p className="text-xs font-semibold text-[rgb(var(--primary))]">{step.time}</p>
                  <h3 className="mt-1 font-semibold text-[rgb(var(--foreground))]">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">{step.description}</p>
                </div>
                <Button href={step.href} variant="ghost" size="small">{step.action}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
              </li>
            ))}
          </ol>
        </DataCard>

        <DataCard title="Verificare înainte de prezentare" description={`Starea traseului pentru ${currentBusiness?.business?.name ?? "spațiul demonstrativ"}.`}>
          <div className="grid gap-3">
            {checklist.map((item) => (
              <div key={item.label} className="grid gap-3 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                {statusBadge(item.ready)}
                <p className="text-sm font-semibold text-[rgb(var(--foreground))]">{item.label}</p>
                <Button href={item.href} variant="ghost" size="small">{item.action}</Button>
              </div>
            ))}
          </div>
        </DataCard>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <DataCard title="Mesajul de încheiere" description="Încheiere recomandată după propunerea pilot.">
            <p className="text-sm leading-7 text-[rgb(var(--text-secondary))]">
              Auditul arată ce este blocat acum și pe ce dovezi se bazează. Pilotul de 14 zile validează dacă echipa poate clarifica responsabilitatea, următoarele acțiuni, aprobările și rezultatele fără a confunda estimările cu venitul confirmat.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/reports/revenue-recovery-audit" className="focus-ring inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Audit de recuperare venituri<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
              <Link href="/reports/enterprise-pilot-pack" className="focus-ring inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-[rgb(var(--primary))] hover:underline">Propunere pilot pe 14 zile<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          </DataCard>

          <DataCard title="Limitele afirmațiilor" description="Repere obligatorii pentru o prezentare credibilă.">
            <ul className="grid gap-3 text-sm leading-6 text-[rgb(var(--text-muted))]">
              {[
                "Valorile comerciale afișate sunt estimări bazate pe datele disponibile.",
                "Venitul confirmat este înregistrat separat, numai după confirmarea explicită a rezultatului.",
                "Recomandările indică o acțiune pentru revizuire; sistemul nu o execută în locul utilizatorului.",
                "Analistul business este opțional și limitează interpretarea la dovezile disponibile.",
                "Auditul și pilotul susțin o decizie prudentă, nu o predicție financiară."
              ].map((item) => <li key={item} className="flex gap-2"><CheckCircleIcon className="mt-1 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />{item}</li>)}
            </ul>
          </DataCard>
        </div>

        <DataCard title="Întrebări frecvente în discuția comercială" description="Răspunsuri scurte, precise și verificabile.">
          <div className="grid gap-3 md:grid-cols-2">
            {presenterResponses.map(([question, answer]) => (
              <div key={question} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
                <h3 className="font-semibold text-[rgb(var(--foreground))]">{question}</h3>
                <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">{answer}</p>
              </div>
            ))}
          </div>
        </DataCard>
      </div>
    </PageShell>
  );
}
