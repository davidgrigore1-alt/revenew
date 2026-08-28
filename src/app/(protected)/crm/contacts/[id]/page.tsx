import Link from "next/link";
import { notFound } from "next/navigation";
import { EnvelopeIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { PageShell } from "@/components/dashboard/PageShell";
import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { AssistantButton } from "@/components/guidance/ContextualAssistant";
import { RecordNotes } from "@/components/workspace/RecordNotes";
import { getCrmWorkspaceForCurrentBusiness } from "@/lib/revenue-workspace";
import { getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";
import { getWorkspaceNotes } from "@/lib/workspace-notes";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  decision_maker: "Decident",
  champion: "Campion",
  influencer: "Influencer",
  procurement: "Achiziții",
  finance: "Financiar",
  legal: "Legal",
  technical: "Tehnic",
  operational: "Operațional",
  other: "Alt rol"
};

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const [crm, opportunities, notes] = await Promise.all([
    getCrmWorkspaceForCurrentBusiness(),
    getOpportunitiesForCurrentBusiness(),
    getWorkspaceNotes("contact", params.id)
  ]);
  if (!crm.ready) return <PageShell eyebrow="Contact" title="Contact indisponibil" description={crm.error ?? "Registrul nu poate fi încărcat momentan."} />;
  const contact = crm.contacts.find((item) => item.id === params.id);
  if (!contact) notFound();
  const linkedOpportunities = opportunities.filter((opportunity) =>
    opportunity.contacts?.some((relationship) => relationship.contact.id === contact.id)
  );

  return (
    <PageShell
      eyebrow="Contact 360"
      title={contact.fullName}
      description={[contact.jobTitle, contact.organization?.name].filter(Boolean).join(" · ") || "Persoană comercială din workspace-ul curent."}
      breadcrumbs={[{ label: "Contacte", href: "/contacts" }, { label: contact.fullName }]}
      actions={<AssistantButton />}
    >
      <div className="grid items-start gap-6 xl:grid-cols-12">
        <div className="grid min-w-0 gap-6 xl:col-span-8">
          <section className="grid gap-3 border-y border-[rgb(var(--border))] py-4 sm:grid-cols-3" aria-label="Rezumat contact">
            <div><p className="text-xs text-[rgb(var(--text-muted))]">Companie</p><p className="mt-1 truncate text-sm font-semibold">{contact.organization ? <Link href={"/crm/organizations/" + contact.organization.id} className="hover:text-[rgb(var(--primary))] hover:underline">{contact.organization.name}</Link> : "Neasociată"}</p></div>
            <div><p className="text-xs text-[rgb(var(--text-muted))]">Rol în decizie</p><p className="mt-1 text-sm font-semibold">{roleLabels[contact.decisionRole ?? "other"] ?? "Neconfirmat"}</p></div>
            <div><p className="text-xs text-[rgb(var(--text-muted))]">Statut</p><div className="mt-1"><StatusPill tone={contact.isPrimaryForOrganization ? "success" : "neutral"}>{contact.isPrimaryForOrganization ? "Contact principal" : "Contact activ"}</StatusPill></div></div>
          </section>

          <DataCard title="Oportunități conectate" description="Contexte comerciale asociate explicit acestei persoane.">
            {linkedOpportunities.length ? <div className="divide-y divide-[rgb(var(--border))]">{linkedOpportunities.map((opportunity) => <Link key={opportunity.id} href={"/opportunities/" + opportunity.id} className="focus-ring grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><p className="truncate text-sm font-semibold hover:text-[rgb(var(--primary))]">{opportunity.title}</p><p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">{opportunity.ownerName ?? "Responsabil neconfirmat"} · {opportunity.recommendedAction ?? "Pas următor neconfirmat"}</p></div><p className="text-xs font-semibold tabular-nums">{formatCurrency(opportunity.estimatedValueHigh, opportunity.currency ?? "RON")}</p></Link>)}</div> : <EmptyState title="Nicio oportunitate conectată" description="Asociază persoana unei oportunități numai când relația este confirmată." />}
          </DataCard>

          <RecordNotes targetType="contact" targetId={contact.id} notes={notes} />
        </div>
        <aside className="grid gap-4 xl:sticky xl:top-20 xl:col-span-4">
          <DataCard title="Date de contact" description="Datele introduse explicit în workspace.">
            <dl className="grid gap-4 text-sm">
              <div><dt className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]"><EnvelopeIcon className="h-4 w-4" />Email</dt><dd className="mt-1 break-all font-medium">{contact.email ?? "Necompletat"}</dd></div>
              <div><dt className="flex items-center gap-2 text-xs text-[rgb(var(--text-muted))]"><PhoneIcon className="h-4 w-4" />Telefon</dt><dd className="mt-1 font-medium">{contact.phone ?? "Necompletat"}</dd></div>
              <div><dt className="text-xs text-[rgb(var(--text-muted))]">Departament</dt><dd className="mt-1 font-medium">{contact.department ?? "Neconfirmat"}</dd></div>
            </dl>
          </DataCard>
          <p className="border-t border-[rgb(var(--border))] pt-3 text-xs leading-5 text-[rgb(var(--text-muted))]">Datele de contact și notele nu sunt instrucțiuni pentru AI. Orice acțiune rămâne pregătită și supusă controlului uman.</p>
        </aside>
      </div>
    </PageShell>
  );
}
