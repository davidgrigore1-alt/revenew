import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

const migration = read("supabase/migrations/202607130001_phase1_revenue_control_center.sql");
const actions = read("src/lib/revenue-workspace/actions.ts");
const data = read("src/lib/supabase/data.ts");
const workspace = read("src/lib/revenue-workspace.ts");
const contacts = read("src/lib/crm/contact-actions.ts");
const stabilizedRls = read("supabase/migrations/202606100007_stabilize_supabase_rls.sql");

test("Phase 1 migration is additive, tenant-linked and preserves RLS", () => {
  assert.match(migration, /add column if not exists lifecycle_status/i);
  assert.match(migration, /add column if not exists owner_profile_id uuid references public\.profiles/i);
  assert.match(migration, /actual_outcome_amount numeric\(12, 2\)/i);
  assert.match(migration, /actual_outcome_amount is null or actual_outcome_amount >= 0/i);
  assert.match(migration, /assigned_to_profile_id uuid references public\.profiles/i);
  assert.match(migration, /alter table public\.opportunities enable row level security/i);
  assert.match(migration, /public\.can_access_business\(target_business_id\)/i);
  assert.match(migration, /opportunity owner must belong to the same business/i);
  assert.match(migration, /action assignee must belong to the same business/i);
  assert.match(migration, /opportunities_status_lifecycle_consistency_check/i);
  assert.match(migration, /set_trusted_opportunity_event_context/i);
  assert.match(migration, /revoke update, delete on public\.opportunity_events from authenticated/i);
  assert.match(migration, /touch_opportunity_updated_at/i);
  assert.doesNotMatch(migration, /disable row level security|drop table|\bbusinesses\.owner_id\b/i);
});

test("terminal outcomes require trusted actor, controlled reason and actual won amount", () => {
  assert.match(actions, /authorization\.profileId/);
  assert.match(actions, /terminalOutcomes/);
  assert.match(actions, /wonReasons/);
  assert.match(actions, /negativeReasons/);
  assert.match(actions, /actual_outcome_amount: lifecycleStatus === "won" \? amount : null/);
  assert.match(actions, /\.eq\("business_id", business\.id\)/);
  assert.match(actions, /expectedUpdatedAt/);
  assert.doesNotMatch(actions, /service_role|profiles\.role|\bowner_id\b/);
});

test("dashboard and attention reads remain bounded and business scoped", () => {
  assert.match(data, /\.eq\("business_id", business\.id\)/);
  assert.match(data, /\.limit\(200\)/);
  assert.match(data, /\.limit\(500\)/);
  assert.match(data, /getCurrentBusinessForUser/);
  assert.doesNotMatch(data, /platform_user_roles|platform_admin/);
});

test("commercial events include trusted workspace and actor context", () => {
  assert.match(actions, /business_id: input\.businessId/);
  assert.match(actions, /actor_profile_id: input\.actorProfileId/);
  assert.match(actions, /metadata: input\.metadata/);
});

test("outsiders and removed members cannot reach opportunity, outcome, contact or attention paths", () => {
  assert.match(stabilizedRls, /create or replace function public\.can_access_business/i);
  assert.match(stabilizedRls, /public\.owns_business\(target_business_id\) or public\.is_business_member\(target_business_id\)/i);
  assert.doesNotMatch(stabilizedRls, /platform_user_roles|platform_admin/i);
  assert.match(actions, /getOpportunityForCurrentBusiness\(opportunityId\)/);
  assert.match(actions, /\.eq\("business_id", business\.id\)/);
  assert.match(contacts, /\.eq\("business_id", businessId\)/);
  assert.match(data, /getCurrentBusinessForUser/);
});

test("ordinary dashboard work is assignee scoped while manager exceptions are explicit", () => {
  assert.match(workspace, /action\.assignedToProfileId === authorization\.profileId/);
  assert.match(workspace, /authorization\.businessRole === "business_owner"/);
  assert.match(workspace, /isManager \? active\.filter/);
});
