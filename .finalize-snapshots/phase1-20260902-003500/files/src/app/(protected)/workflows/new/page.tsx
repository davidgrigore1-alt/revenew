import { PageShell } from "@/components/dashboard/PageShell";
import { WorkflowPlaybooks } from "@/components/workflows/WorkflowPlaybooks";
import { createWorkflowAndOpen } from "@/lib/workflow-actions";

export const dynamic = "force-dynamic";
export default async function NewWorkflowPage(props: { searchParams?: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  return <PageShell wide eyebrow="Execuție comercială" title="Creează un workflow"
    description="Alege un playbook verificabil. Configurația rămâne inactivă până la revizuire și activare explicită."
    breadcrumbs={[{ label: "Workflow-uri", href: "/workflows" }, { label: "Workflow nou" }]}>
    {searchParams?.error ? <p role="alert" className="text-sm text-[rgb(var(--danger-text))]">Draftul nu a putut fi creat. Verifică accesul și încearcă din nou.</p> : null}
    <WorkflowPlaybooks />
    <section className="mt-8 border-t border-[rgb(var(--border))] pt-5" aria-labelledby="manual-workflow-title">
      <h2 id="manual-workflow-title" className="text-sm font-semibold">Începe manual</h2>
      <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Un draft pentru oportunități noi, cu revizuire internă. Poți modifica regulile înainte de activare.</p>
      <form action={createWorkflowAndOpen} className="mt-3 flex max-w-xl items-end gap-3">
        <label className="grid flex-1 gap-1.5 text-xs font-semibold">Nume workflow<input name="name" required minLength={3} maxLength={120} placeholder="Revizuire comercială" className="focus-ring h-9 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm"/></label>
        <button className="focus-ring h-9 rounded-[8px] bg-[rgb(var(--primary))] px-4 text-xs font-semibold text-[rgb(var(--primary-foreground))]">Creează draft</button>
      </form>
    </section>
  </PageShell>;
}
