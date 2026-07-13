import { notFound } from "next/navigation";
import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageShell } from "@/components/dashboard/PageShell";
import { getStatusLabel } from "@/components/dashboard/StatusBadge";
import { getCrmOrganizationDetail } from "@/lib/revenue-workspace";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CrmOrganizationDetailPage({ params }: { params: { id: string } }) {
  const detail = await getCrmOrganizationDetail(params.id);
  if (!detail.ready) {
    return (
      <PageShell eyebrow="CRM" title="Schema CRM necesită actualizare" description={detail.error ?? "Organizația nu poate fi încărcată."}>
        <DataCard title="Migrare necesară" description={detail.error ?? "Aplică migrarea CRM CRUD înainte de utilizare."} />
      </PageShell>
    );
  }
  if (!detail.organization) notFound();

  return (
    <PageShell
      eyebrow="Companie"
      title={detail.organization.name}
      description={[detail.organization.industry, detail.organization.city, detail.organization.county].filter(Boolean).join(" · ") || "Detalii comerciale necompletate."}
    >
      <div className="grid gap-6">
        <DataCard title="Profil companie">
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <div><dt className="text-[rgb(var(--muted-foreground))]">Website</dt><dd className="break-all font-semibold">{detail.organization.website ?? "Necompletat"}</dd></div>
            <div><dt className="text-[rgb(var(--muted-foreground))]">Telefon</dt><dd className="font-semibold">{detail.organization.phone ?? "Necompletat"}</dd></div>
            <div><dt className="text-[rgb(var(--muted-foreground))]">Relație</dt><dd className="font-semibold">{detail.organization.relationshipStatus ?? "prospect"}</dd></div>
            <div><dt className="text-[rgb(var(--muted-foreground))]">Actualizat</dt><dd className="font-semibold">{formatDate(detail.organization.updatedAt ?? undefined)}</dd></div>
          </dl>
          {detail.organization.notes ? <p className="mt-4 rounded-lg bg-[rgb(var(--surface-elevated))] p-4 text-sm leading-6">{detail.organization.notes}</p> : null}
        </DataCard>

        <DataCard title="Contacte">
          {detail.contacts.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {detail.contacts.map((contact) => (
                <article key={contact.id} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{contact.fullName}</h2>
                    {contact.isPrimaryForOrganization ? <span className="rounded border border-[rgb(var(--primary))] px-2 py-1 text-xs text-[rgb(var(--primary))]">Principal</span> : null}
                  </div>
                  <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">{[contact.jobTitle, contact.decisionRole].filter(Boolean).join(" · ") || "Rol neconfirmat"}</p>
                  <p className="mt-3 break-all text-sm">{contact.email ?? "Email necompletat"}</p>
                  <p className="text-sm">{contact.phone ?? "Telefon necompletat"}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Fără contacte" description="Adaugă contacte din pagina CRM." />
          )}
        </DataCard>

        <DataCard title="Oportunități asociate">
          {detail.opportunities.length > 0 ? (
            <div className="grid gap-3">
              {detail.opportunities.map((opportunity) => (
                <a key={opportunity.id} href={`/opportunities/${opportunity.id}`} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4 hover:border-[rgb(var(--primary))]">
                  <p className="break-words font-semibold">{opportunity.title}</p>
                  <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">{getStatusLabel(opportunity.status)} · {formatDate(opportunity.deadline)}</p>
                </a>
              ))}
            </div>
          ) : (
            <EmptyState title="Fără oportunități asociate" description="Asociază contactele companiei la oportunități pentru a vedea istoricul comercial aici." />
          )}
        </DataCard>

        <DataCard title="Activitate">
          {detail.events.length > 0 ? (
            <ol className="space-y-3">
              {detail.events.map((event) => (
                <li key={event.id} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4">
                  <p className="font-semibold">{event.label}</p>
                  <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">{event.opportunityTitle} · {formatDate(event.date)}</p>
                  {event.description ? <p className="mt-2 text-sm leading-6">{event.description}</p> : null}
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="Fără activitate încă" description="Evenimentele apar după asignări, documente, task-uri și schimbări de status." />
          )}
        </DataCard>
      </div>
    </PageShell>
  );
}
