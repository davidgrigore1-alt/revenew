import { DataCard } from "@/components/dashboard/DataCard";
import { PageShell } from "@/components/dashboard/PageShell";
import { CrmWorkspaceClient } from "@/components/crm/CrmWorkspaceClient";
import { getCrmWorkspaceForCurrentBusiness } from "@/lib/revenue-workspace";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const crm = await getCrmWorkspaceForCurrentBusiness();

  return (
    <PageShell
      eyebrow="CRM"
      title="Companii și contacte"
      description="Registrul comercial intern pentru companii și persoanele implicate în oportunități."
    >
      {crm.ready ? (
        <CrmWorkspaceClient organizations={crm.organizations} contacts={crm.contacts} />
      ) : (
        <DataCard title="Schema CRM necesită actualizare" description={crm.error ?? "CRM-ul nu poate fi încărcat în acest mediu."}>
          <p className="text-sm leading-6 text-[rgb(var(--muted-foreground))]">
            Nu afișez date false și nu creez entități duplicate. Aplică migrarea CRM indicată, apoi pagina va activa formularele reale de creare și editare.
          </p>
        </DataCard>
      )}
    </PageShell>
  );
}
