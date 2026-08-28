import { Select } from "@/components/ui/Select";
import { PageShell } from "@/components/dashboard/PageShell";
import { presentSequenceState } from "@/lib/ui/presentation";
import { Button } from "@/components/ui/Button";
import { NewSequenceBuilder, SequenceStepBuilder } from "@/components/communication/SequenceStepBuilder";
import {
  archiveCommunicationTemplate,
  createCommunicationTemplate,
  exitSequenceEnrollment,
  enrollOpportunityInSequence,
  getCommunicationWorkspace,
  saveCommunicationSignature,
  saveResponseWindow,
  setSequenceStatus,
  updateCommunicationTemplate
} from "@/lib/communication-workspace";

export const dynamic = "force-dynamic";

const sequenceStates = new Set(["draft", "active", "paused", "completed", "archived"] as const);
const stepLabels = { email: "Email pregătit", wait: "Așteptare", manual_task: "Task manual" } as const;
function sequenceLabel(value: string) { return sequenceStates.has(value as "draft" | "active" | "paused" | "completed" | "archived") ? presentSequenceState(value as "draft" | "active" | "paused" | "completed" | "archived").label : "De verificat"; }

export default async function SequencesPage() {
  const workspace = await getCommunicationWorkspace();
  const enrollmentsBySequence = new Map<string, number>();
  for (const item of workspace.enrollments) enrollmentsBySequence.set(item.sequence_id, (enrollmentsBySequence.get(item.sequence_id) ?? 0) + 1);

  return <PageShell
    eyebrow="Communication OS"
    title="Secvențe și mesaje"
    description="Pregătește comunicarea repetabilă, păstrează controlul uman și oprește secvența când contextul comercial se schimbă."
    actions={<Button href="/inbox" variant="secondary">Deschide Inbox Comercial</Button>}
  >
    <div className="grid gap-10">
      <section>
        <div className="flex items-end justify-between gap-4 border-b border-[rgb(var(--border))] pb-3">
          <div><h2 className="text-sm font-semibold text-[rgb(var(--foreground))]">Secvențe V1</h2><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Emailurile sunt pregătite pentru revizuire. Nu există trimitere autonomă.</p></div>
          <span className="text-xs tabular-nums text-[rgb(var(--text-muted))]">{workspace.sequences.length} definite</span>
        </div>
        {workspace.sequences.length ? <div className="divide-y divide-[rgb(var(--border))]">
          {workspace.sequences.map((sequence) => {
            const steps = Array.isArray(sequence.steps) ? sequence.steps as Array<{ type: "email" | "wait" | "manual_task"; label: string; businessDays?: number }> : [];
            return <article key={sequence.id} className="grid gap-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">{sequence.name}</h3><span className="status-pill status-pill-neutral">{sequenceLabel(sequence.status)}</span></div>
                <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{sequence.description || "Fără descriere."}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem] text-[rgb(var(--text-subtle))]">{steps.map((step, index) => <span key={index}>{index + 1}. {step.label || stepLabels[step.type]}</span>)}<span>{enrollmentsBySequence.get(sequence.id) ?? 0} înrolări</span></div><details className="mt-3"><summary className="focus-ring cursor-pointer text-xs font-semibold text-[rgb(var(--primary))]">Editează pașii</summary><SequenceStepBuilder sequenceId={sequence.id} initialSteps={steps} disabled={sequence.status === "active" || sequence.status === "archived"}/></details>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={setSequenceStatus}><input type="hidden" name="sequenceId" value={sequence.id}/><input type="hidden" name="status" value={sequence.status === "active" ? "paused" : "active"}/><button className="focus-ring h-8 rounded-[8px] border border-[rgb(var(--border))] px-3 text-xs font-semibold text-[rgb(var(--foreground))] hover:bg-[rgb(var(--surface-hover))]">{sequence.status === "active" ? "Pauză" : "Activează"}</button></form>
                {workspace.opportunities.length ? <details className="relative"><summary className="focus-ring flex h-8 cursor-pointer list-none items-center rounded-[8px] bg-[rgb(var(--brand))] px-3 text-xs font-semibold text-black">Revizuiește înrolarea</summary><div className="absolute right-0 z-20 mt-2 w-[min(28rem,calc(100vw-2rem))] rounded-[10px] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-floating))] p-4 shadow-floating"><p className="micro-label">Confirmare explicită</p><dl className="mt-3 grid gap-2 text-xs"><div><dt className="text-[rgb(var(--text-muted))]">Expeditor</dt><dd className="mt-0.5 font-semibold">{workspace.senderEmail || "Conexiune Gmail de confirmat"}</dd></div><div><dt className="text-[rgb(var(--text-muted))]">Plan</dt><dd className="mt-0.5">{steps.length} pași · emailurile sunt doar pregătite pentru revizuire</dd></div><div><dt className="text-[rgb(var(--text-muted))]">Ieșiri</dt><dd className="mt-0.5">Răspuns primit · întâlnire programată · oportunitate închisă · oprire manuală</dd></div></dl><form action={enrollOpportunityInSequence} className="mt-4 grid gap-2"><input type="hidden" name="sequenceId" value={sequence.id}/><label className="text-[0.6875rem] text-[rgb(var(--text-muted))]">Oportunitate<Select name="opportunityId" aria-label="Oportunitate de înrolat" className="focus-ring mt-1 h-9 w-full rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 text-xs text-[rgb(var(--foreground))]">{workspace.opportunities.map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.companyName ? `${opportunity.companyName} · ` : ""}{opportunity.title}</option>)}</Select></label><button className="focus-ring mt-1 h-9 rounded-[8px] bg-[rgb(var(--brand))] px-3 text-xs font-semibold text-black">Confirmă înrolarea</button></form></div></details> : null}
              </div>
            </article>;
          })}
        </div> : <p className="py-5 text-sm text-[rgb(var(--text-muted))]">Nu există secvențe. Creează un draft controlat pentru a defini pașii înainte de activare.</p>}
        <NewSequenceBuilder />
        {workspace.enrollments.some((item) => item.status === "active" || item.status === "paused") ? <div className="mt-5 border-t border-[rgb(var(--border))] pt-4"><p className="micro-label">Înrolări active</p><div className="mt-2 divide-y divide-[rgb(var(--border))]">{workspace.enrollments.filter((item) => item.status === "active" || item.status === "paused").map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-2 text-xs"><span className="truncate text-[rgb(var(--text-muted))]">{workspace.opportunities.find((opportunity) => opportunity.id === item.opportunity_id)?.title || "Oportunitate"} · pas {item.current_step + 1}</span><form action={exitSequenceEnrollment}><input type="hidden" name="enrollmentId" value={item.id}/><button className="focus-ring font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]">Oprește</button></form></div>)}</div></div> : null}      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div><div className="border-b border-[rgb(var(--border))] pb-3"><h2 className="text-sm font-semibold text-[rgb(var(--foreground))]">Șabloane de workspace</h2><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">Conținut reutilizabil, editabil înainte de fiecare trimitere.</p></div>
          <div className="divide-y divide-[rgb(var(--border))]">{workspace.templates.filter((item) => item.status === "active").map((template) => <article key={template.id} className="py-4"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">{template.name}</h3><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{template.subject || "Fără subiect predefinit"}</p></div><form action={archiveCommunicationTemplate}><input type="hidden" name="templateId" value={template.id}/><button className="focus-ring text-xs font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]">Arhivează</button></form></div><p className="mt-3 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-[rgb(var(--text-subtle))]">{template.body}</p><details className="mt-3"><summary className="focus-ring cursor-pointer text-xs font-semibold text-[rgb(var(--primary))]">Editează șablonul</summary><form action={updateCommunicationTemplate} className="mt-3 grid gap-2 border-l border-[rgb(var(--border))] pl-3"><input type="hidden" name="templateId" value={template.id}/><input name="name" required maxLength={120} defaultValue={template.name} aria-label="Numele șablonului" className="focus-ring h-8 rounded-[7px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 text-xs"/><input name="subject" maxLength={500} defaultValue={template.subject} aria-label="Subiectul șablonului" className="focus-ring h-8 rounded-[7px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 text-xs"/><textarea name="body" required maxLength={50000} defaultValue={template.body} rows={5} aria-label="Conținutul șablonului" className="focus-ring rounded-[7px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-2.5 text-xs leading-5"/><button className="focus-ring h-8 w-fit rounded-[7px] border border-[rgb(var(--border-strong))] px-3 text-xs font-semibold">Salvează modificările</button></form></details></article>)}</div>
          <form action={createCommunicationTemplate} className="mt-4 grid gap-3 border-t border-[rgb(var(--border))] pt-4"><div className="grid gap-3 md:grid-cols-2"><input name="name" required placeholder="Nume șablon" className="focus-ring h-9 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm"/><input name="subject" placeholder="Subiect" className="focus-ring h-9 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm"/></div><textarea name="body" required rows={5} placeholder="Mesaj reutilizabil" className="focus-ring rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 text-sm leading-6"/><button className="focus-ring h-9 w-fit rounded-[8px] border border-[rgb(var(--border-strong))] px-4 text-sm font-semibold">Salvează șablonul</button></form>
        </div>

        <div><div className="border-b border-[rgb(var(--border))] pb-3"><h2 className="text-sm font-semibold text-[rgb(var(--foreground))]">Semnătura mea</h2><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Se aplică numai utilizatorului curent și rămâne editabilă în composer.</p></div>
          <form action={saveCommunicationSignature} className="mt-4 grid gap-3"><textarea name="signature" defaultValue={workspace.signature} rows={7} maxLength={4000} placeholder={"Cu stimă,\nNumele tău"} className="focus-ring rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 text-sm leading-6"/><button className="focus-ring h-9 w-fit rounded-[8px] bg-[rgb(var(--brand))] px-4 text-sm font-semibold text-black">Salvează semnătura</button></form>
        </div>
      </section>

      <section className="border-t border-[rgb(var(--border))] pt-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="micro-label">Reguli de siguranță</p><p className="mt-2 text-xs text-[rgb(var(--text-muted))]">Fereastra conservatoare previne alertele premature după un mesaj trimis.</p></div><form action={saveResponseWindow} className="flex items-end gap-2"><label className="text-[0.6875rem] text-[rgb(var(--text-muted))]">Zile lucrătoare<input name="businessDays" type="number" min={1} max={20} defaultValue={workspace.responseWindowBusinessDays} className="focus-ring mt-1 block h-8 w-20 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2 text-sm"/></label><button className="focus-ring h-8 rounded-[8px] border border-[rgb(var(--border))] px-3 text-xs font-semibold">Salvează</button></form></div><div className="mt-3 grid gap-4 text-xs leading-5 text-[rgb(var(--text-muted))] md:grid-cols-3"><p><strong className="text-[rgb(var(--foreground))]">Ieșire la răspuns.</strong><br/>Un răspuns nou oprește pregătirea pașilor următori.</p><p><strong className="text-[rgb(var(--foreground))]">Ieșire la întâlnire.</strong><br/>O întâlnire programată suspendă follow-up-ul automatizat.</p><p><strong className="text-[rgb(var(--foreground))]">Control uman.</strong><br/>V1 pregătește emailuri; nu le trimite autonom.</p></div></section>
    </div>
  </PageShell>;
}