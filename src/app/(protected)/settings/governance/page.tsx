import { EnterpriseGovernancePanel } from "@/components/settings/EnterpriseGovernancePanel";
import { PageShell } from "@/components/dashboard/PageShell";
import { requireAnyPermission } from "@/lib/authz/require-permission";
import { getEnterpriseWorkspaceSnapshot } from "@/lib/enterprise-governance-internal";

export const dynamic = "force-dynamic";

export default async function GovernanceSettingsPage() {
  await requireAnyPermission(["workspace.members.read", "workspace.policies.read", "approvals.read"]);
  const snapshot = await getEnterpriseWorkspaceSnapshot();
  if (!snapshot) return <PageShell eyebrow="Setări" title="Administrare enterprise" description="Guvernanța nu este disponibilă în modul curent." />;
  return <PageShell eyebrow="Setări workspace" title="Echipă și guvernanță" description="Acces, atribuiri, aprobări și audit pentru operarea sigură a echipei."><EnterpriseGovernancePanel snapshot={snapshot} /></PageShell>;
}
