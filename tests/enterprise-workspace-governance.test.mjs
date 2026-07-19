import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const migrationUrl = new URL("../supabase/migrations/20260718100927_enterprise_workspace_governance_v1.sql", import.meta.url);
async function source(path) { return readFile(new URL(`../${path}`, import.meta.url), "utf8"); }
async function core() { const input=await source("src/lib/enterprise-governance-core.ts"); const output=ts.transpileModule(input,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText; return import("data:text/javascript;base64,"+Buffer.from(output).toString("base64")); }

test("enterprise roles map to centralized least-privilege capabilities", async () => {
  const roles=await source("src/lib/authz/role-permissions.ts"); const names=await source("src/lib/authz/roles.ts");
  assert.match(names,/business_manager/); assert.match(names,/"manager"/);
  assert.match(roles,/business_viewer: businessRead/); assert.match(roles,/business_manager: \[\.\.\.businessWork, \.\.\.teamOperations/);
  assert.match(roles,/workspace\.members\.manage/); assert.match(roles,/outcomes\.approve/); assert.match(roles,/revenue\.confirm/);
  assert.doesNotMatch(roles,/business_viewer:[^\n]*(update|manage|approve|assign)/);
});

test("invitation helpers normalize email and reject unsafe redirects", async () => {
  const domain=await core();
  assert.equal(domain.normalizeInvitationEmail("  TEST@Example.COM "),"test@example.com");
  assert.equal(domain.isValidInvitationEmail("person@example.com"),true); assert.equal(domain.isValidInvitationEmail("bad"),false);
  assert.equal(domain.isSafeInternalRedirect("/dashboard"),true); assert.equal(domain.isSafeInternalRedirect("//evil.test"),false); assert.equal(domain.isSafeInternalRedirect("https://evil.test"),false);
});

test("invitation persistence hashes tokens, blocks owner escalation, duplicates and replay", async () => {
  const sql=await readFile(migrationUrl,"utf8"); const actions=await source("src/lib/enterprise-governance-internal.ts");
  assert.match(sql,/token_hash text not null unique/i); assert.match(sql,/digest\(invitation_token, 'sha256'\)/i); assert.doesNotMatch(sql,/raw_token|invitation_token text not null/i);
  assert.match(sql,/role in \('admin','manager','member','viewer'\)/i); assert.match(sql,/where status = 'pending'/i);
  assert.match(sql,/for update/i); assert.match(sql,/status <> 'pending'/i); assert.match(sql,/normalized_email <> v_email/i); assert.match(sql,/auth\.uid\(\) is null/i);
  assert.match(actions,/randomBytes\(32\)/); assert.match(actions,/existing\.data/); assert.match(actions,/INVITATION_DELIVERY_MODE/);
});

test("acceptance is authenticated atomic single-use and creates one membership", async () => {
  const sql=await readFile(migrationUrl,"utf8");
  assert.match(sql,/create or replace function public\.accept_business_invitation/i); assert.match(sql,/security definer set search_path = pg_catalog, public, auth/i);
  assert.match(sql,/insert into public\.business_members/i); assert.match(sql,/update public\.business_invitations set status='accepted'/i);
  assert.match(sql,/revoke all on function public\.accept_business_invitation\(text\) from public, anon/i);
});

test("inactive and cross-workspace assignees are blocked and duplicate assignment is idempotent", async () => {
  const actions=await source("src/lib/enterprise-governance-internal.ts"); const migration=await readFile(migrationUrl,"utf8");
  assert.match(actions,/\.eq\("business_id", context\.businessId\)\.eq\("profile_id", assigneeProfileId\)\.eq\("status", "active"\)/);
  assert.match(actions,/\.neq\(field, assigneeProfileId\)/); assert.match(actions,/idempotent: true/); assert.match(actions,/category: "assignment"/);
  assert.match(migration,/business_assignable_profiles[\s\S]*bm\.status = 'active'/i);
});

test("governance defaults preserve current behavior and constrained values", async () => {
  const domain=await core(); const sql=await readFile(migrationUrl,"utf8");
  assert.equal(domain.governanceDefaults.liveEmailApprovalPolicy,"existing_approval"); assert.equal(domain.governanceDefaults.outcomeApprovalPolicy,"member_confirmation");
  assert.equal(domain.governanceDefaults.assignmentPolicy,"members_self_assign"); assert.equal(domain.governanceDefaults.invitationExpiryHours,72);
  assert.match(sql,/confirmed_revenue_threshold >= 0/); assert.match(sql,/invitation_expiry_hours in \(24,72,168,336\)/);
});

test("approval requests enforce fingerprint, dual control, expiry and one-time consumption", async () => {
  const actions=await source("src/lib/enterprise-governance-internal.ts"); const sql=await readFile(migrationUrl,"utf8");
  assert.match(actions,/createHash\("sha256"\)/); assert.match(sql,/payload_fingerprint ~ '\^\[a-f0-9\]\{64\}\$'/);
  assert.match(actions,/safe_payload\?\.dual_control === true/); assert.match(actions,/requested_by_profile_id === context\.profileId/);
  assert.match(actions,/Date\.parse\(request\.data\.expires_at\) <= Date\.now\(\)/); assert.match(actions,/\.eq\("status", "approved"\)[\s\S]*\.gt\("expires_at", new Date\(\)\.toISOString\(\)\)[\s\S]*\.is\("executed_at", null\)/);
  assert.match(actions,/restricted_operation\.executed/);
});

test("live send and outcome paths enforce enterprise approval server-side", async () => {
  const sending=await source("src/lib/follow-up-send-actions.ts"); const outcome=await source("src/lib/revenue-workspace/actions.ts");
  assert.match(sending,/getLiveEmailGovernanceDecision/); assert.match(sending,/config\.mode === "live"/); assert.match(sending,/consumeGovernedApproval/);
  assert.match(outcome,/getOutcomeGovernanceDecision/); assert.match(outcome,/approvalRequired: true/); assert.match(outcome,/consumeGovernedApproval/);
});

test("enterprise audit is append-only, bounded, tenant-scoped and secret-free", async () => {
  const sql=await readFile(migrationUrl,"utf8"); const actions=await source("src/lib/enterprise-governance-internal.ts");
  assert.match(sql,/business_audit_events/); assert.match(sql,/octet_length\(safe_metadata::text\) <= 2048/); assert.match(sql,/business_audit_elevated_read/);
  assert.match(sql,/grant select on table public\.business_invitations, public\.business_governance_policies, public\.business_approval_requests, public\.business_audit_events to authenticated/i);
  assert.doesNotMatch(sql,/grant (insert|update|delete|all)[^;]*business_audit_events[^;]*authenticated/i);
  assert.doesNotMatch(actions,/RESEND_API_KEY|SUPABASE_SERVICE_ROLE_KEY|provider_response|raw_token/);
});

test("migration is additive, RLS enabled and does not add businesses.owner_id", async () => {
  const sql=await readFile(migrationUrl,"utf8");
  for(const table of ["business_invitations","business_governance_policies","business_approval_requests","business_audit_events"]) assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`,`i`));
  assert.doesNotMatch(sql,/disable row level security|businesses\.owner_id|drop\s+(table|schema|column)|truncate|delete\s+from/i);
  assert.match(sql,/revoke all on table[\s\S]*from anon/i); assert.match(sql,/has_business_capability/);
});
test("active member workspace loading remains tenant-scoped after RLS verification", async () => {
  const business=await source("src/lib/business/current-business.ts");
  assert.match(business,/from\("business_members"\)[\s\S]*\.eq\("profile_id", profile\.id\)[\s\S]*\.eq\("status", "active"\)/);
  assert.match(business,/dataClient = admin;[\s\S]*\.eq\("id", membership\.business_id\)\.single\(\)/);
  assert.match(business,/dataClient\.from\("business_services"\)[\s\S]*dataClient\.from\("business_targets"\)/);
});
test("internal governance helpers are not exposed as browser-callable server actions", async () => {
  const actionSurface=await source("src/lib/enterprise-governance.ts");
  const internal=await source("src/lib/enterprise-governance-internal.ts");
  assert.doesNotMatch(actionSurface,/requestGovernedApproval|consumeGovernedApproval|getEnterpriseWorkspaceSnapshot/);
  assert.match(internal,/import "server-only"/);
  assert.match(internal,/\.gt\("expires_at", new Date\(\)\.toISOString\(\)\)/);
});

test("governance route renders an intentional forbidden state before loading privileged data", async () => {
  const page = await source("src/app/(protected)/settings/governance/page.tsx");

  assert.match(page, /getAuthorizationContext/);
  assert.match(page, /hasPermission\(authorization, "workspace\.members\.read"\)/);
  assert.match(page, /hasPermission\(authorization, "workspace\.policies\.read"\)/);
  assert.match(page, /hasPermission\(authorization, "approvals\.read"\)/);
  assert.match(page, /ForbiddenState/);
  assert.ok(page.indexOf("if (!canAccessGovernance)") < page.indexOf("getEnterpriseWorkspaceSnapshot()"));
  assert.doesNotMatch(page, /requireAnyPermission/);
});
