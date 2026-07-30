import { AppointmentControlSandbox } from "@/components/demo/AppointmentControlSandbox";
import { PageShell } from "@/components/dashboard/PageShell";
import { requirePermission } from "@/lib/authz/require-permission";

export default async function AppointmentControlSandboxPage() {
  await requirePermission("platform.internal_tools.access");

  return (
    <PageShell
      eyebrow="Sandbox local · fără efecte externe"
      title="Controlul programărilor ReveNew — sandbox local"
      description="O simulare deterministă care colectează intenția de programare, verifică datele demonstrative Atelier Bellezza și pregătește o propunere pentru aprobarea operatorului."
      breadcrumbs={[
        { label: "Demonstrație", href: "/demo" },
        { label: "Controlul programărilor" }
      ]}
    >
      <AppointmentControlSandbox />
    </PageShell>
  );
}
