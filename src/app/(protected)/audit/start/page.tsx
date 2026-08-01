import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { AuditIntakeWizard } from "@/components/audit/AuditIntakeWizard";
import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/Button";
import { requirePermission } from "@/lib/authz/require-permission";

export default async function AuditStartPage() {
  await requirePermission("workspace.read");

  return (
    <PageShell
      eyebrow="AUDIT CONTROLAT"
      title="Pregătește primul audit ReveNew"
      description="Alege un set mic de cazuri comerciale recente, clarifică datele disponibile și generează un plan sigur de audit."
      breadcrumbs={[{ label: "Control Center", href: "/dashboard" }, { label: "Începe audit controlat" }]}
      actions={<Button href="/reports/revenue-recovery-audit" variant="secondary"><ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />Vezi auditul curent</Button>}
    >
      <section className="rounded-panel border border-[rgb(var(--primary)/0.38)] bg-[linear-gradient(145deg,rgb(var(--surface)),rgb(var(--primary-muted)))] p-4 sm:p-5" aria-label="Limitele pregătirii auditului">
        <div className="grid gap-3 text-sm leading-6 text-[rgb(var(--text-secondary))] sm:grid-cols-3">
          <p><strong className="text-[rgb(var(--foreground))]">20–50 de cazuri.</strong><br />Un eșantion recent, suficient pentru o analiză controlată.</p>
          <p><strong className="text-[rgb(var(--foreground))]">Date anonimizabile.</strong><br />Primul audit nu necesită acces complet la inbox.</p>
          <p><strong className="text-[rgb(var(--foreground))]">Control uman.</strong><br />Nicio comunicare externă nu este trimisă automat.</p>
        </div>
        <p className="mt-4 border-t border-[rgb(var(--border))] pt-3 text-xs leading-5 text-[rgb(var(--text-muted))]">Valorile estimate rămân neconfirmate. Auditul structurează verificarea și următorul pas sigur; nu garantează venit sau recuperare.</p>
      </section>
      <AuditIntakeWizard />
    </PageShell>
  );
}
