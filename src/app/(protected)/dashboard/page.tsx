import { DataCard } from "@/components/dashboard/DataCard";
import { DemoNotice } from "@/components/dashboard/DemoNotice";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { OpportunityCard } from "@/components/dashboard/OpportunityCard";
import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/Button";
import { getCommercialInboxSummary } from "@/lib/commercial-inbox";
import { getCurrentBusinessOrDemo, getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const opportunities = await getOpportunitiesForCurrentBusiness();
  const inboxSummary = await getCommercialInboxSummary();
  if (!business) {
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);
  const pipelineValue = opportunities.reduce((sum, item) => sum + item.estimatedValueHigh, 0);
  const highFit = opportunities.filter((item) => item.fitScore >= 85);
  const urgentDeadlines = opportunities.filter((item) => item.urgencyScore >= 80 || (item.deadline ? item.deadline <= today : false));
  const actionsDueToday = opportunities.flatMap((item) =>
    item.actions.filter((action) => action.dueDate?.slice(0, 10) === today).map((action) => ({ ...action, opportunity: item.title }))
  );
  let recentActivity = opportunities.flatMap((item) => item.timeline.map((event) => ({ ...event, opportunity: item.title }))).slice(0, 6);
  if (isSupabaseConfigured) {
    const supabase = createSupabaseServerClient();
    const opportunityIds = opportunities.map((item) => item.id);
    if (supabase && opportunityIds.length > 0) {
      const { data, error } = await supabase
        .from("opportunity_events")
        .select("id,label,event_type,description,occurred_at,created_at,opportunity_id")
        .in("opportunity_id", opportunityIds)
        .order("occurred_at", { ascending: false })
        .limit(6);

      if (error) {
        throw new Error(`Dashboard activity load error: ${error.message}`);
      }

      recentActivity = (data ?? []).map((event) => ({
        id: event.id,
        type: event.event_type,
        label: event.label,
        description: event.description ?? "",
        date: event.occurred_at ?? event.created_at,
        opportunity: opportunities.find((item) => item.id === event.opportunity_id)?.title ?? "Oportunitate"
      }));
    }
  }
  const followUps = opportunities.filter((item) => item.status === "follow_up_needed");
  const won = opportunities.filter((item) => item.status === "won");
  const lost = opportunities.filter((item) => item.status === "lost");

  return (
    <PageShell
      eyebrow="Dashboard"
      title={`Bani de urmarit pentru ${business.name}`}
      description={`${business.industry}, ${business.city}. Aici vezi unde poate firma sa castige bani saptamana aceasta.`}
    >
      <div className="grid gap-6">
        {!isSupabaseConfigured ? <DemoNotice /> : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Pipeline estimat"
            value={formatCurrency(pipelineValue)}
            detail="Valoare maxima estimata din oportunitati reale active."
            tone="mint"
            info="Valoarea totala estimata a oportunitatilor active. Nu este venit garantat, ci potential comercial."
          />
          <MetricCard
            label="Oportunitati noi"
            value={`${opportunities.length}`}
            detail="Semnale comerciale incarcate pentru businessul activ."
            info="Semnale comerciale care au fost introduse sau detectate, dar nu au fost inca validate complet."
          />
          <MetricCard
            label="High-fit"
            value={`${highFit.length}`}
            detail="Oportunitati cu scor de potrivire peste 85."
            tone="gold"
            info="Oportunitati cu potrivire mare intre nevoia clientului si serviciile firmei tale."
          />
          <MetricCard
            label="Termene urgente"
            value={`${urgentDeadlines.length}`}
            detail="Oportunitati cu scor de urgenta ridicat sau deadline apropiat."
            info="Oportunitati cu deadline apropiat sau actiuni care trebuie facute rapid."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Actiuni azi"
            value={`${actionsDueToday.length}`}
            detail="Task-uri pregatite pentru executie astazi."
            tone="mint"
            info="Task-uri comerciale pregatite pentru azi: emailuri, apeluri, follow-up-uri sau documente."
          />
          <MetricCard
            label="Follow-up"
            value={`${followUps.length}`}
            detail="Oportunitati unde urmatorul mesaj conteaza."
            tone="gold"
            info="Oportunitati unde urmatorul mesaj poate decide daca lead-ul avanseaza sau se pierde."
          />
          <MetricCard
            label="Castigate"
            value={`${won.length}`}
            detail="Oportunitati marcate castigate."
            info="Oportunitati marcate ca transformate in contract sau rezultat comercial pozitiv."
          />
          <MetricCard
            label="Pierdute"
            value={`${lost.length}`}
            detail="Oportunitati marcate pierdute."
            info="Oportunitati inchise fara rezultat."
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <DataCard title="Top oportunitati recomandate" description="Cele mai bune semnale dupa valoare, potrivire si urgenta.">
            <div className="grid gap-4">
              {opportunities.length > 0 ? (
                opportunities.slice(0, 3).map((opportunity) => (
                  <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                ))
              ) : (
                <div className="grid gap-3">
                  <EmptyState
                    title="Nu ai oportunitati reale inca."
                    description="Adauga primul semnal comercial sau prima oportunitate pentru a incepe sa urmaresti pipeline-ul si lead-urile care pot fi recuperate."
                  />
                  <div>
                    <Button href="/inbox">Adauga primul semnal</Button>
                  </div>
                </div>
              )}
            </div>
          </DataCard>

          <DataCard title="Actiuni scadente azi" description="Lucruri concrete care pot misca bani azi.">
            <div className="space-y-4">
              {actionsDueToday.length > 0 ? (
                actionsDueToday.map((action) => (
                  <div key={action.id} className="rounded-lg border border-white/10 bg-ink-900/70 p-4">
                    <p className="font-semibold text-white">{action.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">{action.opportunity}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-mint-400">
                      Termen {formatDate(action.dueDate)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState title="Nicio actiune azi" description="Actiunile apar dupa ce transformi semnale in oportunitati si programezi follow-up-uri pentru lead-urile care merita recuperate." />
              )}
            </div>
          </DataCard>
        </div>

        <DataCard title="Inbox Comercial" description="Semnale comerciale noi care pot deveni oportunitati urmarite.">
          {inboxSummary.tableReady ? (
            <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr_auto] md:items-center">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-white/10 bg-ink-900/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Noi</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{inboxSummary.newCount}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-ink-900/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Urgente</p>
                  <p className="mt-2 text-2xl font-semibold text-gold-300">{inboxSummary.urgentCount}</p>
                </div>
              </div>
              <p className="text-sm leading-6 text-zinc-300">
                {inboxSummary.latestSignal?.extractedSummary || inboxSummary.latestSignal?.detectedNeed || "Adauga cereri primite din email, telefon, formular sau WhatsApp pentru a vedea rapid ce lead-uri merita recuperate."}
              </p>
              <Button href="/inbox" variant="secondary">Vezi Inbox Comercial</Button>
            </div>
          ) : (
            <p className="text-sm leading-6 text-zinc-400">{inboxSummary.setupMessage}</p>
          )}
        </DataCard>

        <DataCard title="Activitate comerciala recenta" description="Ultimele schimbari din workflow: documente, follow-up-uri si statusuri.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((event) => (
                <div key={event.id} className="rounded-lg border border-white/10 bg-ink-900/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">{event.label}</p>
                    <span className="rounded border border-white/10 px-2 py-1 text-xs text-zinc-300">{event.type ?? "event"}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">{event.opportunity}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-mint-400">{formatDate(event.date)}</p>
                </div>
              ))
            ) : (
              <EmptyState title="Fara activitate recenta" description="Activitatea apare dupa ce revizuiesti semnale, generezi documente, schimbi statusuri sau programezi follow-up-uri." />
            )}
          </div>
        </DataCard>
      </div>
    </PageShell>
  );
}
