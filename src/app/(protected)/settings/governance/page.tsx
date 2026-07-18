import Link from "next/link";
import { PageShell } from "@/components/dashboard/PageShell";
import { EnterpriseGovernancePanel } from "@/components/settings/EnterpriseGovernancePanel";
import { requireAnyPermission } from "@/lib/authz/require-permission";
import { getEnterpriseWorkspaceSnapshot } from "@/lib/enterprise-governance-internal";

export const dynamic = "force-dynamic";

export default async function GovernancePage() {
  await requireAnyPermission(["workspace.members.read", "workspace.policies.read", "approvals.read"]);
  const snapshot = await getEnterpriseWorkspaceSnapshot();
  if (!snapshot) return <PageShell eyebrow="Setări" title="Administrare enterprise" description="Guvernanța nu este disponibilă în modul curent." />;
  return (
    <PageShell eyebrow="Setări workspace" title="Echipă și guvernanță" description="Acces, atribuiri, aprobări și audit pentru operarea sigură a echipei." actions={<Link href="/settings" className="focus-ring inline-flex min-h-11 items-center rounded-button border border-[rgb(var(--border))] px-4 text-sm font-semibold hover:bg-[rgb(var(--surface-muted))]">Înapoi la setări</Link>}>
      <div className="grid gap-6">
        <nav className="sticky top-[4.25rem] z-20 flex gap-1 overflow-x-auto rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.94)] p-1 shadow-card backdrop-blur" aria-label="Secțiuni guvernanță">
          {[["echipa", "Echipă și acces"], ["guvernanta", "Politici"], ["aprobari", "Aprobări"], ["cozi", "Cozi de lucru"], ["audit", "Audit"]].map(([id, label]) => <a key={id} href={`#${id}`} className="focus-ring min-h-10 whitespace-nowrap rounded-button px-3 py-2 text-sm font-semibold text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]">{label}</a>)}
        </nav>
        <EnterpriseGovernancePanel snapshot={snapshot} />
      </div>
    </PageShell>
  );
}
