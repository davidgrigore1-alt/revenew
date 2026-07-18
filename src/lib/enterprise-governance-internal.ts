import "server-only";
import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import type { Permission } from "@/lib/authz/permissions";
import { requirePermission } from "@/lib/authz/require-permission";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { enterpriseMemberRoles, governanceDefaults, invitationStatus, isValidInvitationEmail, normalizeInvitationEmail, type EnterpriseMemberRole } from "@/lib/enterprise-governance-core";
import { requiresManagedApproval, requiresRevenueApproval } from "@/lib/enterprise-governance-core";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type GovernancePolicy = typeof governanceDefaults;

function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function clean(value: unknown, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function invitationMode() {
  const mode = clean(process.env.INVITATION_DELIVERY_MODE, 16).toLowerCase();
  return mode === "test" || mode === "live" ? mode : "disabled";
}

async function enterpriseContext(permission: Permission) {
  const authorization = await requirePermission(permission);
  const current = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const admin = createSupabaseAdminClient();
  if (!current || !authorization.profileId || !admin) throw new Error("Guvernanța workspace-ului nu este disponibilă pe server.");
  return { authorization, current, admin, businessId: current.business.id, profileId: authorization.profileId };
}

async function audit(context: Awaited<ReturnType<typeof enterpriseContext>>, input: { category: string; action: string; entityType?: string; entityId?: string; result: string; description: string; metadata?: Record<string, string | number | boolean | null> }) {
  await context.admin.from("business_audit_events").insert({
    business_id: context.businessId, actor_profile_id: context.profileId, category: input.category, action: input.action,
    entity_type: input.entityType ?? null, entity_id: input.entityId ?? null, result: input.result,
    description: clean(input.description), safe_metadata: input.metadata ?? {}
  });
}

async function policyFor(businessId: string): Promise<GovernancePolicy> {
  const admin = createSupabaseAdminClient();
  if (!admin) return governanceDefaults;
  const { data } = await admin.from("business_governance_policies").select("live_email_approval_policy,outcome_approval_policy,confirmed_revenue_threshold,assignment_policy,invitation_expiry_hours").eq("business_id", businessId).maybeSingle();
  if (!data) return governanceDefaults;
  return {
    liveEmailApprovalPolicy: data.live_email_approval_policy,
    outcomeApprovalPolicy: data.outcome_approval_policy,
    confirmedRevenueThreshold: Number(data.confirmed_revenue_threshold ?? 0),
    assignmentPolicy: data.assignment_policy,
    invitationExpiryHours: data.invitation_expiry_hours
  } as GovernancePolicy;
}

export async function getEnterpriseWorkspaceSnapshot() {
  const authorization = await getAuthorizationContext();
  const current = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const supabase = createSupabaseServerClient();
  if (!current || !supabase) return null;
  const dataClient = createSupabaseAdminClient() ?? supabase;
  const businessId = current.business.id;
  const [members, invitations, policy, approvals, auditEvents, opportunities, actions] = await Promise.all([
    authorization.permissions.includes("workspace.members.read") ? dataClient.from("business_members").select("id,profile_id,role,status,created_at,deactivated_at,profile:profiles!business_members_profile_id_fkey(full_name,email)").eq("business_id", businessId).order("created_at") : Promise.resolve({ data: [], error: null }),
    authorization.permissions.includes("workspace.members.read") ? dataClient.from("business_invitations").select("id,normalized_email,role,status,delivery_mode,expires_at,created_at,created_by_profile_id,accepted_by_profile_id").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
    dataClient.from("business_governance_policies").select("*").eq("business_id", businessId).maybeSingle(),
    authorization.permissions.includes("approvals.read") ? dataClient.from("business_approval_requests").select("id,action_type,entity_type,entity_id,requested_by_profile_id,decided_by_profile_id,safe_summary,status,expires_at,decided_at,executed_at,created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null }),
    authorization.permissions.includes("workspace.audit.read") ? dataClient.from("business_audit_events").select("id,actor_profile_id,category,action,entity_type,entity_id,result,description,occurred_at,safe_metadata").eq("business_id", businessId).order("occurred_at", { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null }),
    dataClient.from("opportunities").select("id,title,owner_profile_id,lifecycle_status,actual_outcome_amount,currency").eq("business_id", businessId),
    dataClient.from("opportunity_actions").select("id,title,assigned_to_profile_id,status,priority,due_at").eq("business_id", businessId)
  ]);
  const memberRows: any[] = [...(members.data ?? [])];
  if (authorization.permissions.includes("workspace.members.read") && current.business.owner_profile_id && !memberRows.some((item) => item.profile_id === current.business.owner_profile_id)) {
    memberRows.unshift({ id: `owner-${current.business.owner_profile_id}`, profile_id: current.business.owner_profile_id, role: "owner", status: "active", created_at: null, deactivated_at: null, profile: { full_name: current.profileId === current.business.owner_profile_id ? current.profileName : "Proprietar workspace", email: current.profileId === current.business.owner_profile_id ? current.authUserEmail : null } });
  }
  const opportunityRows = opportunities.data ?? [];
  const actionRows = actions.data ?? [];
  return {
    authorization, business: current.business,
    members: memberRows.map((row: any) => ({ ...row, profile: Array.isArray(row.profile) ? row.profile[0] : row.profile, workload: opportunityRows.filter((item) => item.owner_profile_id === row.profile_id && item.lifecycle_status === "open").length + actionRows.filter((item) => item.assigned_to_profile_id === row.profile_id && item.status === "pending").length })),
    invitations: (invitations.data ?? []).map((row) => ({ ...row, effective_status: invitationStatus(row.status, row.expires_at) })),
    policy: policy.data ?? null, approvals: approvals.data ?? [], auditEvents: auditEvents.data ?? [],
    assignableMembers: memberRows.filter((item) => item.status === "active").map((item: any) => ({ id: item.profile_id, name: (Array.isArray(item.profile) ? item.profile[0] : item.profile)?.full_name ?? "Membru" })),
    workItems: {
      opportunities: opportunityRows.filter((item) => item.lifecycle_status === "open").map((item) => ({ id: item.id, title: item.title, assigneeId: item.owner_profile_id })),
      actions: actionRows.filter((item) => item.status === "pending").map((item) => ({ id: item.id, title: item.title, assigneeId: item.assigned_to_profile_id }))
    },
    queues: {
      myWork: actionRows.filter((item) => item.assigned_to_profile_id === authorization.profileId && item.status === "pending").length,
      team: actionRows.filter((item) => item.status === "pending").length,
      unassigned: opportunityRows.filter((item) => !item.owner_profile_id && item.lifecycle_status === "open").length,
      overdue: actionRows.filter((item) => item.status === "pending" && item.due_at && item.due_at.slice(0,10) < new Date().toISOString().slice(0,10)).length,
      dueToday: actionRows.filter((item) => item.status === "pending" && item.due_at?.slice(0,10) === new Date().toISOString().slice(0,10)).length,
      highPriority: actionRows.filter((item) => item.status === "pending" && item.priority === "high").length,
      awaitingApproval: (approvals.data ?? []).filter((item) => item.status === "pending").length
    },
    metrics: {
      activeMembers: memberRows.filter((item) => item.status === "active").length,
      pendingInvitations: (invitations.data ?? []).filter((item) => invitationStatus(item.status, item.expires_at) === "pending").length,
      confirmedRevenueByOwner: opportunityRows.filter((item) => item.lifecycle_status === "won" && item.currency === "RON").reduce((sum, item) => sum + Number(item.actual_outcome_amount ?? 0), 0)
    }
  };
}

export async function createWorkspaceInvitation(formData: FormData) {
  const context = await enterpriseContext("workspace.members.manage");
  const email = normalizeInvitationEmail(clean(formData.get("email"), 320));
  const role = clean(formData.get("role"), 20) as EnterpriseMemberRole;
  if (!isValidInvitationEmail(email) || !enterpriseMemberRoles.includes(role)) return { ok: false as const, error: "Verifică adresa și rolul invitației." };
  const policy = await policyFor(context.businessId);
  const now = new Date();
  await context.admin.from("business_invitations").update({ status: "expired", updated_at: now.toISOString() }).eq("business_id", context.businessId).eq("status", "pending").lte("expires_at", now.toISOString());
  const existing = await context.admin.from("business_invitations").select("id").eq("business_id", context.businessId).eq("normalized_email", email).eq("status", "pending").maybeSingle();
  if (existing.data) return { ok: false as const, duplicate: true, error: "Există deja o invitație activă pentru această adresă." };
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const mode = invitationMode();
  const expiresAt = new Date(now.getTime() + policy.invitationExpiryHours * 3600000).toISOString();
  const { data, error } = await context.admin.from("business_invitations").insert({ business_id: context.businessId, normalized_email: email, role, token_hash: tokenHash, status: "pending", delivery_mode: mode, created_by_profile_id: context.profileId, expires_at: expiresAt }).select("id").single();
  if (error || !data) return { ok: false as const, error: "Invitația nu a putut fi creată." };
  await audit(context, { category: "invitation", action: "invitation.created", entityType: "business_invitation", entityId: data.id, result: "pending", description: "O invitație de workspace a fost creată.", metadata: { role, delivery_mode: mode } });
  revalidatePath("/settings");
  const acceptancePath = `/invite/accept?token=${encodeURIComponent(token)}`;
  if (mode === "test") return { ok: true as const, mode, testAcceptancePath: acceptancePath, invitationId: data.id };
  return { ok: true as const, mode, invitationId: data.id, notice: mode === "live" ? "Livrarea live necesită un furnizor de invitații configurat separat." : "Livrarea invitațiilor nu este configurată." };
}

export async function revokeWorkspaceInvitation(invitationId: string) {
  const context = await enterpriseContext("workspace.members.manage");
  const { data } = await context.admin.from("business_invitations").update({ status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", invitationId).eq("business_id", context.businessId).eq("status", "pending").select("id").maybeSingle();
  if (!data) return { ok: false as const, error: "Invitația nu mai poate fi revocată." };
  await audit(context, { category: "invitation", action: "invitation.revoked", entityType: "business_invitation", entityId: invitationId, result: "success", description: "Invitația de workspace a fost revocată." });
  revalidatePath("/settings"); return { ok: true as const };
}

export async function acceptWorkspaceInvitation(token: string) {
  const { profile } = await getCurrentProfile();
  if (!profile) return { ok: false as const, error: "Invitația necesită un cont autentificat valid." };
  const supabase = createSupabaseServerClient();
  if (!supabase) return { ok: false as const, error: "Invitația nu este disponibilă." };
  const { data, error } = await supabase.rpc("accept_business_invitation", { invitation_token: token });
  if (error || !data?.[0]) return { ok: false as const, error: "Invitația este invalidă, expirată, utilizată sau nu corespunde contului autentificat." };
  return { ok: true as const, businessId: data[0].business_id };
}

export async function updateWorkspaceMember(memberId: string, role: EnterpriseMemberRole | "inactive") {
  const context = await enterpriseContext("workspace.members.manage");
  const member = await context.admin.from("business_members").select("id,profile_id,role,status,businesses!inner(owner_profile_id)").eq("id", memberId).eq("business_id", context.businessId).maybeSingle();
  if (!member.data || member.data.role === "owner" || (member.data as any).businesses?.owner_profile_id === member.data.profile_id) return { ok: false as const, error: "Proprietarul final nu poate fi modificat sau eliminat prin acest flux." };
  if (role !== "inactive" && !enterpriseMemberRoles.includes(role)) return { ok: false as const, error: "Rolul nu este permis." };
  const patch = role === "inactive" ? { status: "inactive", deactivated_at: new Date().toISOString(), updated_at: new Date().toISOString() } : { role, status: "active", deactivated_at: null, updated_at: new Date().toISOString() };
  const { data } = await context.admin.from("business_members").update(patch).eq("id", memberId).eq("business_id", context.businessId).neq("role", "owner").select("id").maybeSingle();
  if (!data) return { ok: false as const, error: "Membrul nu a putut fi actualizat." };
  await audit(context, { category: "membership", action: role === "inactive" ? "member.deactivated" : "member.role_changed", entityType: "business_member", entityId: memberId, result: "success", description: role === "inactive" ? "Membrul a fost dezactivat." : "Rolul membrului a fost actualizat.", metadata: { role } });
  revalidatePath("/settings"); return { ok: true as const };
}

export async function updateGovernancePolicies(formData: FormData) {
  const context = await enterpriseContext("workspace.policies.manage");
  const live = clean(formData.get("liveEmailApprovalPolicy"), 32);
  const outcome = clean(formData.get("outcomeApprovalPolicy"), 32);
  const assignment = clean(formData.get("assignmentPolicy"), 32);
  const expiry = Number(formData.get("invitationExpiryHours"));
  const threshold = Number(String(formData.get("confirmedRevenueThreshold") ?? "0").replace(",", "."));
  if (!["existing_approval","manager_required","dual_control"].includes(live) || !["member_confirmation","manager_required","dual_control"].includes(outcome) || !["members_self_assign","managers_only"].includes(assignment) || ![24,72,168,336].includes(expiry) || !Number.isFinite(threshold) || threshold < 0) return { ok: false as const, error: "Politicile conțin valori nepermise." };
  const { error } = await context.admin.from("business_governance_policies").upsert({ business_id: context.businessId, live_email_approval_policy: live, outcome_approval_policy: outcome, confirmed_revenue_threshold: threshold, assignment_policy: assignment, invitation_expiry_hours: expiry, updated_by_profile_id: context.profileId, updated_at: new Date().toISOString() }, { onConflict: "business_id" });
  if (error) return { ok: false as const, error: "Politicile nu au putut fi salvate." };
  await audit(context, { category: "governance", action: "policy.updated", entityType: "business", entityId: context.businessId, result: "success", description: "Politicile de guvernanță ale workspace-ului au fost actualizate.", metadata: { live, outcome, assignment, expiry, threshold } });
  revalidatePath("/settings"); return { ok: true as const };
}

export async function assignEnterpriseWork(entityType: "opportunity" | "action", entityId: string, assigneeProfileId: string) {
  const permission = entityType === "opportunity" ? "opportunities.assign" : "actions.assign";
  const context = await enterpriseContext(permission);
  const assignee = await context.admin.from("business_members").select("profile_id").eq("business_id", context.businessId).eq("profile_id", assigneeProfileId).eq("status", "active").maybeSingle();
  const owner = await context.admin.from("businesses").select("owner_profile_id").eq("id", context.businessId).eq("owner_profile_id", assigneeProfileId).maybeSingle();
  if (!assignee.data && !owner.data) return { ok: false as const, error: "Responsabilul nu este membru activ al workspace-ului." };
  const table = entityType === "opportunity" ? "opportunities" : "opportunity_actions";
  const field = entityType === "opportunity" ? "owner_profile_id" : "assigned_to_profile_id";
  const { data } = await context.admin.from(table).update({ [field]: assigneeProfileId }).eq("id", entityId).eq("business_id", context.businessId).neq(field, assigneeProfileId).select("id").maybeSingle();
  if (!data) return { ok: true as const, idempotent: true };
  await audit(context, { category: "assignment", action: `${entityType}.assigned`, entityType, entityId, result: "success", description: entityType === "opportunity" ? "Oportunitatea a fost atribuită." : "Acțiunea a fost atribuită.", metadata: { assignee_profile_id: assigneeProfileId } });
  revalidatePath("/today"); revalidatePath("/dashboard"); return { ok: true as const };
}

export async function requestGovernedApproval(input: { actionType: "live_email_send" | "outcome_confirmation" | "revenue_confirmation"; entityType: "opportunity_document" | "opportunity"; entityId: string; safeSummary: string; safePayload: Record<string, string | number | boolean | null>; dualControl: boolean }) {
  const context = await enterpriseContext("approvals.read");
  const payloadFingerprint = fingerprint({ businessId: context.businessId, actionType: input.actionType, entityType: input.entityType, entityId: input.entityId, payload: input.safePayload });
  const existing = await context.admin.from("business_approval_requests").select("id,status,decided_by_profile_id,requested_by_profile_id,expires_at").eq("business_id", context.businessId).eq("action_type", input.actionType).eq("entity_id", input.entityId).eq("payload_fingerprint", payloadFingerprint).in("status", ["pending","approved"]).maybeSingle();
  if (existing.data && Date.parse(existing.data.expires_at) <= Date.now()) {
    await context.admin.from("business_approval_requests").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", existing.data.id).eq("business_id", context.businessId).in("status", ["pending","approved"]);
  } else if (existing.data) {
    return { ok: true as const, approvalRequired: existing.data.status !== "approved", approvalId: existing.data.id, fingerprint: payloadFingerprint };
  }
  const { data, error } = await context.admin.from("business_approval_requests").insert({ business_id: context.businessId, action_type: input.actionType, entity_type: input.entityType, entity_id: input.entityId, requested_by_profile_id: context.profileId, payload_fingerprint: payloadFingerprint, safe_summary: clean(input.safeSummary), safe_payload: { ...input.safePayload, dual_control: input.dualControl }, status: "pending", expires_at: new Date(Date.now() + 72 * 3600000).toISOString() }).select("id").single();
  if (error || !data) return { ok: false as const, error: "Cererea de aprobare nu a putut fi creată." };
  await audit(context, { category: "approval", action: "approval.requested", entityType: input.entityType, entityId: input.entityId, result: "pending", description: clean(input.safeSummary), metadata: { action_type: input.actionType } });
  revalidatePath("/settings"); return { ok: true as const, approvalRequired: true, approvalId: data.id, fingerprint: payloadFingerprint };
}

export async function decideGovernedApproval(approvalId: string, decision: "approved" | "rejected") {
  const context = await enterpriseContext("approvals.decide");
  const request = await context.admin.from("business_approval_requests").select("id,status,requested_by_profile_id,safe_payload,expires_at,entity_type,entity_id").eq("id", approvalId).eq("business_id", context.businessId).maybeSingle();
  if (!request.data || request.data.status !== "pending" || Date.parse(request.data.expires_at) <= Date.now()) return { ok: false as const, error: "Cererea nu mai poate fi decisă." };
  if (request.data.safe_payload?.dual_control === true && request.data.requested_by_profile_id === context.profileId) {
    await audit(context, { category: "security", action: "approval.self_approval_blocked", entityType: request.data.entity_type, entityId: request.data.entity_id, result: "blocked", description: "Auto-aprobarea a fost blocată de politica dual-control." });
    return { ok: false as const, error: "Dual-control necesită o altă persoană autorizată." };
  }
  const { data } = await context.admin.from("business_approval_requests").update({ status: decision, decided_by_profile_id: context.profileId, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", approvalId).eq("business_id", context.businessId).eq("status", "pending").select("id").maybeSingle();
  if (!data) return { ok: false as const, error: "Cererea a fost deja decisă." };
  await audit(context, { category: "approval", action: `approval.${decision}`, entityType: request.data.entity_type, entityId: request.data.entity_id, result: decision, description: decision === "approved" ? "Cererea a fost aprobată." : "Cererea a fost respinsă." });
  revalidatePath("/settings"); return { ok: true as const };
}

export async function getOutcomeGovernanceDecision(input: { opportunityId: string; outcome: "won" | "lost"; amount: number; currency: string; reason: string; outcomeDate: string }) {
  const context = await enterpriseContext("opportunities.update");
  const policy = await policyFor(context.businessId);
  const managed = requiresManagedApproval(policy.outcomeApprovalPolicy, context.authorization.businessRole);
  const revenue = input.outcome === "won" && requiresRevenueApproval(input.amount, policy.confirmedRevenueThreshold, context.authorization.businessRole);
  if (!managed && !revenue) return { ok: true as const, allowed: true as const, approvalId: null };
  const actionType = revenue ? "revenue_confirmation" as const : "outcome_confirmation" as const;
  const requested = await requestGovernedApproval({ actionType, entityType: "opportunity", entityId: input.opportunityId, safeSummary: revenue ? `Confirmare venit peste prag pentru oportunitate (${input.currency}).` : `Confirmare rezultat ${input.outcome === "won" ? "câștigat" : "pierdut"}.`, safePayload: { outcome: input.outcome, amount: input.amount, currency: input.currency, reason: input.reason, outcome_date: input.outcomeDate }, dualControl: policy.outcomeApprovalPolicy === "dual_control" });
  if (!requested.ok) return requested;
  return { ok: true as const, allowed: requested.approvalRequired === false, approvalRequired: requested.approvalRequired, approvalId: requested.approvalId };
}

export async function getLiveEmailGovernanceDecision(input: { documentId: string; contentFingerprint: string }) {
  const context = await enterpriseContext("documents.mark_sent");
  const policy = await policyFor(context.businessId);
  if (!requiresManagedApproval(policy.liveEmailApprovalPolicy, context.authorization.businessRole)) return { ok: true as const, allowed: true as const, approvalId: null };
  const requested = await requestGovernedApproval({ actionType: "live_email_send", entityType: "opportunity_document", entityId: input.documentId, safeSummary: "Autorizare pentru trimiterea live a versiunii aprobate.", safePayload: { content_fingerprint: input.contentFingerprint }, dualControl: policy.liveEmailApprovalPolicy === "dual_control" });
  if (!requested.ok) return requested;
  return { ok: true as const, allowed: requested.approvalRequired === false, approvalRequired: requested.approvalRequired, approvalId: requested.approvalId };
}

export async function consumeGovernedApproval(approvalId: string) {
  const context = await enterpriseContext("approvals.read");
  const { data } = await context.admin.from("business_approval_requests").update({ status: "executed", executed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", approvalId).eq("business_id", context.businessId).eq("requested_by_profile_id", context.profileId).eq("status", "approved").gt("expires_at", new Date().toISOString()).is("executed_at", null).select("id,entity_type,entity_id").maybeSingle();
  if (!data) return { ok: false as const, replay: true, error: "Aprobarea lipsește, a expirat sau a fost deja consumată." };
  await audit(context, { category: "approval", action: "restricted_operation.executed", entityType: data.entity_type, entityId: data.entity_id, result: "executed", description: "Aprobarea a fost consumată atomic înaintea operațiunii protejate." });
  revalidatePath("/settings"); return { ok: true as const };
}
