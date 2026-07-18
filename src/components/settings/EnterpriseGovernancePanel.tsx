"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { assignEnterpriseWork, createWorkspaceInvitation, decideGovernedApproval, revokeWorkspaceInvitation, updateGovernancePolicies, updateWorkspaceMember } from "@/lib/enterprise-governance";
import { enterpriseRoleLabels } from "@/lib/enterprise-governance-core";

const field = "min-h-10 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2 text-sm";

export function EnterpriseGovernancePanel({ snapshot }: { snapshot: any }) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [testLink, setTestLink] = useState("");
  const [auditFilter, setAuditFilter] = useState("all");
  const permissions = new Set<string>(snapshot.authorization.permissions);
  const canManageMembers = permissions.has("workspace.members.manage");
  const canManagePolicies = permissions.has("workspace.policies.manage");
  const canDecide = permissions.has("approvals.decide");
  const canAssign = permissions.has("opportunities.assign");
  const policy = snapshot.policy ?? {};
  const visibleAudit = useMemo(() => snapshot.auditEvents.filter((event: any) => auditFilter === "all" || event.category === auditFilter), [snapshot.auditEvents, auditFilter]);

  function run(task: () => Promise<any>, success: string) {
    setError(""); setNotice("");
    startTransition(async () => {
      const result = await task();
      if (!result?.ok) setError(result?.error ?? "Operațiunea nu a putut fi finalizată.");
      else { setNotice(success); if (result.testAcceptancePath) setTestLink(result.testAcceptancePath); }
    });
  }

  return <div className="grid gap-6">
    {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}
    {error ? <StatusNotice tone="warning">{error}</StatusNotice> : null}

    <section id="echipa" className="scroll-mt-36 grid gap-4 rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card">
      <div><h2 className="text-xl font-semibold">Echipă și acces</h2><p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Membri activi, roluri, invitații și volum de lucru atribuit.</p></div>
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Membri activi" value={snapshot.metrics.activeMembers} /><Metric label="Invitații în așteptare" value={snapshot.metrics.pendingInvitations} /><Metric label="Lucrări neatribuite" value={snapshot.queues.unassigned} />
      </div>
      {canManageMembers ? <form action={(formData) => run(() => createWorkspaceInvitation(formData), "Invitația a fost creată." )} className="grid gap-3 rounded-lg bg-[rgb(var(--surface-elevated))] p-4 md:grid-cols-[1fr_190px_auto]">
        <label className="grid gap-1 text-sm font-semibold">Email<input name="email" type="email" required className={field} /></label>
        <label className="grid gap-1 text-sm font-semibold">Rol<select name="role" defaultValue="member" className={field}><option value="admin">Administrator</option><option value="manager">Manager</option><option value="member">Membru comercial</option><option value="viewer">Vizualizator</option></select></label>
        <Button type="submit" disabled={pending} className="self-end">Invită</Button>
      </form> : <p className="text-sm text-[rgb(var(--muted-foreground))]">Nu ai permisiunea de a administra membrii.</p>}
      {testLink ? <div className="rounded-card border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-bg))] p-4 text-sm text-[rgb(var(--warning-text))]"><strong>Link de acceptare — mod test</strong><p className="mt-1 break-all">{testLink}</p><p className="mt-1 text-xs">Vizibil numai administratorului care a creat invitația; tokenul nu este stocat în baza de date.</p></div> : null}
      <div className="grid gap-2">
        {snapshot.members.map((member: any) => <div key={member.id} className="grid gap-3 rounded-lg border border-[rgb(var(--border))] p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div><p className="font-semibold">{member.profile?.full_name ?? "Membru"}</p><p className="text-sm text-[rgb(var(--muted-foreground))]">{enterpriseRoleLabels[member.role] ?? member.role} · {member.status === "active" ? "Activ" : "Inactiv"} · {member.workload} elemente atribuite</p></div>
          {canManageMembers && member.role !== "owner" ? <select aria-label={`Rol ${member.profile?.full_name ?? "membru"}`} defaultValue={member.role} className={field} onChange={(event) => run(() => updateWorkspaceMember(member.id, event.target.value as any), "Rolul a fost actualizat.")}><option value="admin">Administrator</option><option value="manager">Manager</option><option value="member">Membru comercial</option><option value="viewer">Vizualizator</option></select> : <span className="text-sm">{enterpriseRoleLabels[member.role]}</span>}
          {canManageMembers && member.role !== "owner" && member.status === "active" ? <Button variant="secondary" disabled={pending} onClick={() => run(() => updateWorkspaceMember(member.id, "inactive"), "Membrul a fost dezactivat.")}>Dezactivează</Button> : null}
        </div>)}
      </div>
      <div><h3 className="font-semibold">Invitații</h3><div className="mt-2 grid gap-2">{snapshot.invitations.length ? snapshot.invitations.map((invite: any) => <div key={invite.id} className="flex flex-col gap-2 rounded-lg border border-[rgb(var(--border))] p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{invite.normalized_email}</p><p className="text-xs text-[rgb(var(--muted-foreground))]">{enterpriseRoleLabels[invite.role]} · {invite.effective_status} · {invite.delivery_mode}</p></div>{canManageMembers && invite.effective_status === "pending" ? <Button variant="secondary" onClick={() => run(() => revokeWorkspaceInvitation(invite.id), "Invitația a fost revocată.")}>Revocă</Button> : null}</div>) : <p className="text-sm text-[rgb(var(--muted-foreground))]">Nu există invitații.</p>}</div></div>
    </section>

    <section id="guvernanta" className="scroll-mt-36 grid gap-4 rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card">
      <div><h2 className="text-xl font-semibold">Guvernanță</h2><p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Controale explicite pentru trimiteri live, rezultate, venit și atribuiri.</p></div>
      <form action={(formData) => run(() => updateGovernancePolicies(formData), "Politicile au fost salvate.")} className="grid gap-4 md:grid-cols-2">
        <PolicySelect name="liveEmailApprovalPolicy" label="Aprobare email live" value={policy.live_email_approval_policy ?? "existing_approval"} options={[["existing_approval","Aprobarea existentă este suficientă"],["manager_required","Manager sau administrator obligatoriu"],["dual_control","Dual-control obligatoriu"]]} disabled={!canManagePolicies} />
        <PolicySelect name="outcomeApprovalPolicy" label="Aprobare rezultat" value={policy.outcome_approval_policy ?? "member_confirmation"} options={[["member_confirmation","Confirmare membru autorizat"],["manager_required","Aprobare manager"],["dual_control","Dual-control"]]} disabled={!canManagePolicies} />
        <label className="grid gap-1 text-sm font-semibold">Prag venit confirmat (RON)<input className={field} name="confirmedRevenueThreshold" type="number" min="0" step="0.01" defaultValue={policy.confirmed_revenue_threshold ?? 0} disabled={!canManagePolicies} /></label>
        <PolicySelect name="assignmentPolicy" label="Politică atribuire" value={policy.assignment_policy ?? "members_self_assign"} options={[["members_self_assign","Membrii se pot auto-atribui"],["managers_only","Doar managementul atribuie"]]} disabled={!canManagePolicies} />
        <PolicySelect name="invitationExpiryHours" label="Expirare invitație" value={String(policy.invitation_expiry_hours ?? 72)} options={[["24","24 ore"],["72","72 ore"],["168","7 zile"],["336","14 zile"]]} disabled={!canManagePolicies} />
        {canManagePolicies ? <Button type="submit" disabled={pending} className="self-end">Salvează politicile</Button> : <p className="self-end text-sm text-[rgb(var(--muted-foreground))]">Doar proprietarul sau administratorul poate modifica aceste controale.</p>}
      </form>
    </section>

    <section id="aprobari" className="scroll-mt-36 grid gap-4 rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card">
      <div><h2 className="text-xl font-semibold">Aprobări</h2><p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Cereri fără corpuri de email, tokenuri sau date sensibile brute.</p></div>
      <div className="grid gap-3">{snapshot.approvals.length ? snapshot.approvals.map((approval: any) => <div key={approval.id} className="grid gap-3 rounded-lg border border-[rgb(var(--border))] p-4 md:grid-cols-[1fr_auto] md:items-center"><div><p className="font-semibold">{approval.safe_summary}</p><p className="text-xs text-[rgb(var(--muted-foreground))]">{approval.action_type} · {approval.status} · {new Intl.DateTimeFormat("ro-RO").format(new Date(approval.created_at))}</p></div>{canDecide && approval.status === "pending" ? <div className="flex gap-2"><Button onClick={() => run(() => decideGovernedApproval(approval.id,"approved"), "Cererea a fost aprobată.")}>Aprobă</Button><Button variant="secondary" onClick={() => run(() => decideGovernedApproval(approval.id,"rejected"), "Cererea a fost respinsă.")}>Respinge</Button></div> : null}</div>) : <p className="text-sm text-[rgb(var(--muted-foreground))]">Nu există cereri de aprobare.</p>}</div>
    </section>

    <section id="cozi" className="scroll-mt-36 grid gap-4 rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card">
      <div><h2 className="text-xl font-semibold">Cozi de lucru</h2><p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Aceleași oportunități și acțiuni existente, grupate operațional.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Lucrul meu" value={snapshot.queues.myWork}/><Metric label="Echipă" value={snapshot.queues.team}/><Metric label="Neatribuite" value={snapshot.queues.unassigned}/><Metric label="Restante" value={snapshot.queues.overdue}/><Metric label="Astăzi" value={snapshot.queues.dueToday}/><Metric label="Prioritate ridicată" value={snapshot.queues.highPriority}/><Metric label="În aprobare" value={snapshot.queues.awaitingApproval}/></div>
      {canAssign ? <div className="grid gap-3 md:grid-cols-2">{[...snapshot.workItems.opportunities.map((item:any)=>({...item,type:"opportunity"})),...snapshot.workItems.actions.map((item:any)=>({...item,type:"action"}))].slice(0,12).map((item:any)=><div key={`${item.type}-${item.id}`} className="rounded-lg border border-[rgb(var(--border))] p-3"><p className="font-medium">{item.title}</p><select aria-label={`Responsabil ${item.title}`} className={`${field} mt-2`} defaultValue={item.assigneeId ?? ""} onChange={(event)=>event.target.value && run(()=>assignEnterpriseWork(item.type,item.id,event.target.value),"Responsabilul a fost actualizat.")}><option value="">Neatribuit</option>{snapshot.assignableMembers.map((member:any)=><option key={member.id} value={member.id}>{member.name}</option>)}</select></div>)}</div> : null}
    </section>

    <section id="audit" className="scroll-mt-36 grid gap-4 rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-semibold">Jurnal de audit</h2><p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Evenimente append-only, tenant-scoped și fără conținut sensibil.</p></div><label className="grid gap-1 text-sm">Categorie<select className={field} value={auditFilter} onChange={(event)=>setAuditFilter(event.target.value)}><option value="all">Toate</option>{["membership","invitation","assignment","governance","approval","outreach","outcome","security"].map(value=><option key={value} value={value}>{value}</option>)}</select></label></div>
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-[rgb(var(--border))]"><th className="p-2">Data</th><th className="p-2">Acțiune</th><th className="p-2">Rezultat</th><th className="p-2">Descriere</th></tr></thead><tbody>{visibleAudit.map((event:any)=><tr key={event.id} className="border-b border-[rgb(var(--border))]"><td className="p-2 whitespace-nowrap">{new Intl.DateTimeFormat("ro-RO",{dateStyle:"short",timeStyle:"short"}).format(new Date(event.occurred_at))}</td><td className="p-2">{event.action}</td><td className="p-2">{event.result}</td><td className="p-2">{event.description}</td></tr>)}</tbody></table>{!visibleAudit.length?<p className="p-3 text-sm text-[rgb(var(--muted-foreground))]">Nu există evenimente pentru filtrul selectat.</p>:null}</div>
    </section>
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-[rgb(var(--surface-elevated))] p-4"><p className="text-2xl font-semibold">{value}</p><p className="text-xs uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">{label}</p></div>; }
function PolicySelect({ name,label,value,options,disabled }: { name:string;label:string;value:string;options:string[][];disabled:boolean }) { return <label className="grid gap-1 text-sm font-semibold">{label}<select name={name} defaultValue={value} disabled={disabled} className={field}>{options.map(([id,text])=><option key={id} value={id}>{text}</option>)}</select></label>; }
