import Link from "next/link";
import { DataCard } from "@/components/dashboard/DataCard";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageShell } from "@/components/dashboard/PageShell";
import { DemoExampleActions } from "@/components/demo/DemoExampleActions";
import { Button } from "@/components/ui/Button";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { getCommercialSignalsForCurrentBusiness } from "@/lib/commercial-inbox";
import { opportunities as demoOpportunities } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { formatCurrency } from "@/lib/utils";
import type { Opportunity, OpportunityAction, OpportunityDocument } from "@/lib/types";

type WorkflowMetrics = {
  documents: OpportunityDocument[];
  actions: OpportunityAction[];
};

const demoFlow = [
  "Firma primeste cereri din email, telefon, formulare, WhatsApp sau liste vechi.",
  "Multe raman neurmarite sau fara follow-up.",
  "MoneyHunter le aduna in Inbox Comercial.",
  "Semnalele importante devin oportunitati.",
  "Platforma pregateste email, oferta, apel sau follow-up.",
  "Managerul vede raportul cu bani potentiali si actiuni urgente."
];

const demoScript = [
  ["Minute 1", "Problema", "Majoritatea firmelor nu pierd bani pentru ca nu au cereri. Pierd bani pentru ca lead-urile raman in inbox, pe telefon sau in conversatii fara urmatorul pas."],
  ["Minute 2", "Inbox Comercial", "Arata cum semnalele comerciale sunt centralizate, prioritizate si pregatite pentru revizuire."],
  ["Minute 3", "Workflow oportunitate", "Transforma un semnal important intr-o oportunitate si explica scorurile, valoarea estimata si actiunea recomandata."],
  ["Minute 4", "Documente si follow-up", "Arata cum sistemul pregateste email, oferta, apel sau follow-up pentru ca echipa sa actioneze rapid."],
  ["Minute 5", "Raport si oferta pilot", "Incheie cu raportul de bani potentiali, actiuni urgente si oferta Audit Revenue Recovery - 7 zile."]
];

const objections = [
  [
    "Avem deja CRM",
    "MoneyHunter nu inlocuieste CRM-ul la inceput. Functioneaza ca strat de revenue recovery peste semnalele comerciale: identifica lead-uri pierdute, follow-up-uri lipsa si oportunitati care merita urmarite."
  ],
  [
    "Nu avem timp sa introducem date",
    "Se incepe cu semnale simple: emailuri copiate, formulare, apeluri notate si liste vechi. Scopul pilotului este sa arate rapid unde sunt bani pierduti, nu sa incarce echipa cu administrare."
  ],
  [
    "Nu vrem AI care trimite singur mesaje",
    "MoneyHunter pregateste mesaje si documente pentru revizuire. Echipa pastreaza controlul si decide ce se trimite, cand si cui."
  ],
  [
    "Cat de sigur este?",
    "Datele sunt organizate pe workspace-ul firmei si accesul este legat de conturile autorizate. In pilot se folosesc doar semnalele pe care firma alege sa le introduca."
  ],
  [
    "Cine verifica ce genereaza AI-ul?",
    "Managerul sau echipa comerciala revizuieste continutul inainte de folosire. MoneyHunter accelereaza pregatirea, nu elimina decizia umana."
  ]
];

const sampleSignals = [
  {
    title: "Rent-a-car B2B",
    source: "Website form",
    company: "Construct Alpha SRL",
    need: "3 masini pentru echipe de teren, 30 zile, Bucuresti/Ilfov",
    value: "3000-5000 EUR",
    priority: "Urgenta"
  },
  {
    title: "Service auto / fleet",
    source: "Email",
    company: "Logistic Nord Vest",
    need: "mentenanta / masina inlocuire / flota temporara",
    value: "1500-3000 EUR",
    priority: "Ridicata"
  },
  {
    title: "Corporate transport",
    source: "Phone",
    company: "Events Pro Bucharest",
    need: "transport temporar pentru eveniment, 5 zile",
    value: "800-2000 EUR",
    priority: "Medie"
  }
];

function exampleText(example: (typeof sampleSignals)[number]) {
  return [
    `Tip: ${example.title}`,
    `Sursa: ${example.source}`,
    `Companie: ${example.company}`,
    `Nevoie: ${example.need}`,
    `Valoare estimata: ${example.value}`,
    `Prioritate: ${example.priority}`
  ].join("\n");
}

async function loadWorkflowMetrics(opportunities: Opportunity[]): Promise<WorkflowMetrics> {
  if (!isSupabaseConfigured) {
    return {
      documents: opportunities.flatMap((opportunity) => opportunity.documents),
      actions: opportunities.flatMap((opportunity) => opportunity.actions)
    };
  }

  const opportunityIds = opportunities.map((opportunity) => opportunity.id);
  if (opportunityIds.length === 0) {
    return { documents: [], actions: [] };
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { documents: [], actions: [] };
  }

  const [{ data: documentRows, error: documentError }, { data: actionRows, error: actionError }] = await Promise.all([
    supabase.from("opportunity_documents").select("id,title,document_type,status,created_at,opportunity_id,generation_mode").in("opportunity_id", opportunityIds),
    supabase.from("opportunity_actions").select("id,title,description,status,due_at,priority,type").in("opportunity_id", opportunityIds)
  ]);

  if (documentError || actionError) {
    return { documents: [], actions: [] };
  }

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
    <span className={`rounded border px-2 py-1 text-xs font-semibold ${isReady ? "border-mint-400/25 bg-mint-400/10 text-mint-300" : "border-gold-400/25 bg-gold-400/10 text-gold-300"}`}>
      {isReady ? "Gata" : "Lipsa"}
    </span>
  );
}

export default async function DemoPage() {
  const currentBusiness = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const business = currentBusiness?.business;
  const opportunities = isSupabaseConfigured ? await getOpportunitiesForCurrentBusiness() : demoOpportunities;
  const inbox = await getCommercialSignalsForCurrentBusiness();
  const workflow = await loadWorkflowMetrics(opportunities);

  const activeOpportunities = opportunities.filter((opportunity) => !["won", "lost", "ignored"].includes(opportunity.status));
  const convertedSignals = inbox.signals.filter((signal) => signal.status === "converted" || signal.convertedOpportunityId);
  const generatedDocuments = workflow.documents.filter((document) => document.status !== "placeholder");
  const pendingFollowUps = workflow.actions.filter((action) => action.status === "pending" && (action.type === "follow_up" || action.title.toLowerCase().includes("follow")));
  const reportsReady = inbox.signals.length > 0 || opportunities.length > 0 || generatedDocuments.length > 0 || workflow.actions.length > 0;
  const potentialValue = opportunities.reduce((sum, opportunity) => sum + opportunity.estimatedValueHigh, 0);

  const checklist = [
    { label: "Exista cel putin 3 semnale comerciale in Inbox", ready: inbox.tableReady && inbox.signals.length >= 3, href: "/inbox", cta: "Adauga semnal in Inbox Comercial" },
    { label: "Exista cel putin 3 oportunitati active", ready: activeOpportunities.length >= 3, href: "/opportunities/analyze", cta: "Adauga oportunitate" },
    { label: "Exista cel putin 1 oportunitate convertita din Inbox", ready: convertedSignals.length >= 1, href: "/inbox", cta: "Transforma un semnal" },
    { label: "Exista cel putin 1 email outreach generat", ready: generatedDocuments.some((document) => document.type === "outreach_email" || document.title.toLowerCase().includes("email")), href: "/opportunities", cta: "Genereaza email" },
    { label: "Exista cel putin 1 follow-up programat", ready: pendingFollowUps.length >= 1, href: "/opportunities", cta: "Programeaza follow-up" },
    { label: "Raportul are date reale de afisat", ready: reportsReady, href: "/reports", cta: "Verifica raportul" },
    { label: "Headerul arata business-ul real, nu Demo", ready: currentBusiness?.source === "supabase", href: "/settings", cta: "Verifica workspace" },
    { label: "Nu apar texte tehnice in interfata", ready: true, href: "/help", cta: "Verifica explicatiile" }
  ];

  return (
    <PageShell
      eyebrow="Demo"
      title="Demo Revenue Recovery MoneyHunter AI"
      description="Pregateste un demo care arata cum MoneyHunter gaseste semnale comerciale pierdute, le transforma in oportunitati si pregateste urmatoarea actiune."
      actions={<Button href="/inbox" variant="secondary">Deschide Inbox Comercial</Button>}
    >
      <div className="grid gap-6">
        {!isSupabaseConfigured ? <DemoNotice /> : null}

        <DataCard title="Pozitionare pentru vanzare">
          <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
            <div>
              <p className="text-lg font-semibold leading-8 text-white">
                MoneyHunter AI este un Revenue Recovery System pentru firme: un sistem AI care gaseste si recupereaza oportunitatile comerciale pierdute din inbox, formulare, apeluri si conversatii.
              </p>
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                Gasim lead-urile pierdute si iti aratam zilnic pe cine trebuie sa contactezi ca sa faci bani.
              </p>
            </div>
            <div className="rounded-lg border border-mint-400/20 bg-mint-400/10 p-4 text-sm leading-6 text-mint-100">
              Auditul demo trebuie sa arate bani recuperabili: semnale uitate, follow-up-uri lipsa, oportunitati prioritare si actiuni concrete.
            </div>
          </div>
        </DataCard>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Semnale comerciale" value={`${inbox.tableReady ? inbox.signals.length : 0}`} detail="Cereri si lead-uri centralizate in Inbox Comercial." />
          <MetricCard label="Semnale noi" value={`${inbox.tableReady ? inbox.signals.filter((signal) => signal.status === "new").length : 0}`} detail="Lead-uri care asteapta revizuire." tone="gold" />
          <MetricCard label="Semnale convertite" value={`${convertedSignals.length}`} detail="Semnale transformate in oportunitati." tone="mint" />
          <MetricCard label="Potential pipeline" value={formatCurrency(potentialValue)} detail="Valoare estimata din oportunitatile curente." />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Oportunitati" value={`${opportunities.length}`} detail="Total oportunitati pentru demo." />
          <MetricCard label="Active" value={`${activeOpportunities.length}`} detail="Oportunitati care merita urmarite." tone="mint" />
          <MetricCard label="Documente" value={`${generatedDocuments.length}`} detail="Emailuri, oferte sau scripturi pregatite." />
          <MetricCard label="Follow-up-uri" value={`${pendingFollowUps.length}`} detail="Actiuni programate pentru recuperare." tone="gold" />
        </div>

        {!inbox.tableReady ? (
          <DataCard title="Inbox Comercial neactivat">
            <p className="text-sm leading-6 text-zinc-300">{inbox.setupMessage}</p>
          </DataCard>
        ) : null}

        <DataCard title="Demo flow" description="Povestea clara pentru un demo de 5 minute.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {demoFlow.map((item, index) => (
              <div key={item} className="rounded-lg border border-white/10 bg-ink-900/70 p-4">
                <span className="inline-flex size-8 items-center justify-center rounded-lg border border-mint-400/20 bg-mint-400/10 text-sm font-semibold text-mint-300">
                  {index + 1}
                </span>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{item}</p>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Readiness checklist" description={`Pregatire demo pentru ${business?.name ?? "workspace"}.`}>
          <div className="grid gap-3">
            {checklist.map((item) => (
              <div key={item.label} className="grid gap-3 rounded-lg border border-white/10 bg-ink-900/70 p-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                {statusBadge(item.ready)}
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <Button href={item.href} variant={item.ready ? "ghost" : "secondary"} className="min-h-10 px-4">
                  {item.ready ? "Verifica" : item.cta}
                </Button>
              </div>
            ))}
          </div>
        </DataCard>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <DataCard title="Demo script" description="Text de prezentare si structura de 5 minute.">
            <p className="rounded-lg border border-white/10 bg-ink-900/70 p-4 text-sm leading-6 text-zinc-300">
              MoneyHunter AI este un sistem de Revenue Recovery care centralizeaza cererile comerciale ale firmei si le transforma in oportunitati urmarite. In loc ca emailurile, apelurile, formularele sau conversatiile sa ramana pierdute, ele intra intr-un Inbox Comercial, sunt prioritizate, convertite in oportunitati si apoi platforma pregateste urmatoarea actiune: email, oferta, apel sau follow-up.
            </p>
            <div className="mt-4 grid gap-3">
              {demoScript.map(([minute, title, copy]) => (
                <div key={minute} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mint-400">{minute}</p>
                  <h3 className="mt-2 font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
                </div>
              ))}
            </div>
          </DataCard>

          <DataCard title="Audit Revenue Recovery - 7 zile" description="Oferta pilot recomandata pentru vanzare consultativa.">
            <p className="text-sm leading-6 text-zinc-300">
              In 7 zile analizam semnalele comerciale ale firmei, identificam lead-uri pierdute sau neurmarite, le introducem in MoneyHunter AI si livram un raport cu oportunitati recuperabile, valoare estimata si actiuni concrete.
            </p>
            <div className="mt-5 grid gap-3">
              {["Setup pilot: 300-500 EUR", "Abonament lunar dupa pilot: 300-1000 EUR", "Firme mari: implementare personalizata"].map((item) => (
                <div key={item} className="rounded-lg border border-white/10 bg-ink-900/70 p-4 text-sm font-semibold text-white">{item}</div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-zinc-500">Ghid intern de vanzare, nu pricing public pe landing page.</p>
          </DataCard>
        </div>

        <DataCard title="Date demo recomandate" description="Exemple realiste pe care le poti copia manual in Inbox Comercial. Nu se insereaza automat date.">
          <div className="grid gap-4 lg:grid-cols-3">
            {sampleSignals.map((example) => (
              <article key={example.title} className="rounded-lg border border-white/10 bg-ink-900/70 p-4">
                <h3 className="font-semibold text-white">{example.title}</h3>
                <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
                  <p><span className="text-zinc-500">Sursa:</span> {example.source}</p>
                  <p><span className="text-zinc-500">Companie:</span> {example.company}</p>
                  <p><span className="text-zinc-500">Nevoie:</span> {example.need}</p>
                  <p><span className="text-zinc-500">Valoare:</span> {example.value}</p>
                  <p><span className="text-zinc-500">Prioritate:</span> {example.priority}</p>
                </div>
                <div className="mt-4">
                  <DemoExampleActions text={exampleText(example)} />
                </div>
              </article>
            ))}
          </div>
        </DataCard>

        <DataCard title="Obiectii si raspunsuri" description="Raspunsuri scurte pentru discutii comerciale reale.">
          <div className="grid gap-3 md:grid-cols-2">
            {objections.map(([objection, answer]) => (
              <div key={objection} className="rounded-lg border border-white/10 bg-ink-900/70 p-4">
                <h3 className="font-semibold text-white">{objection}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{answer}</p>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Rute utile pentru demo">
          <div className="flex flex-wrap gap-3">
            {[
              ["/inbox", "Inbox Comercial"],
              ["/opportunities", "Oportunitati"],
              ["/outreach", "Documente si outreach"],
              ["/reports", "Raport executiv"],
              ["/help", "Explicatie produs"]
            ].map(([href, label]) => (
              <Link key={href} href={href} className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-mint-400/30 hover:text-white">
                {label}
              </Link>
            ))}
          </div>
        </DataCard>
      </div>
    </PageShell>
  );
}
