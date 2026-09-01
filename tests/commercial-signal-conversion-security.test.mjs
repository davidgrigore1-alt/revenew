import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("signal approval stays security invoker and receives only column-scoped DML grants", async () => {
  const recoverable = await read("../supabase/migrations/20260714143000_recoverable_revenue_engine_v1.sql");
  const detected = await read("../supabase/migrations/20260714234600_data_ingestion_continuous_recovery_v1.sql");
  const privileges = await read("../supabase/migrations/20260719143946_commercial_signal_conversion_privileges.sql");
  const security = await read("../supabase/migrations/20260830090801_commercial_signal_decision_security.sql");

  assert.match(recoverable, /create or replace function public\.approve_recoverable_signal[\s\S]+?security invoker/i);
  assert.match(detected, /create or replace function public\.approve_detected_recoverable_signal[\s\S]+?security invoker/i);
  assert.doesNotMatch(privileges, /security\s+definer/i);
  assert.doesNotMatch(privileges, /grant\s+(all|delete|truncate|references|trigger)\b/i);
  assert.doesNotMatch(privileges, /grant\s+(insert|update)\s+on\s+table/i);
  assert.match(privileges, /grant insert \([\s\S]+?\)\s+on table public\.opportunities to authenticated/i);
  assert.match(privileges, /grant update \(owner_profile_id, deadline, recommended_action, updated_at\)\s+on table public\.opportunities to authenticated/i);
  assert.match(privileges, /grant insert \([\s\S]+?\)\s+on table public\.opportunity_actions to authenticated/i);
  assert.match(privileges, /grant insert \(opportunity_id, event_type, label, description\)\s+on table public\.opportunity_events to authenticated/i);
  assert.match(security, /approve_recoverable_signal_v2[\s\S]+?security invoker/i);
  assert.match(security, /approve_detected_recoverable_signal_v2[\s\S]+?security invoker/i);
  assert.match(security, /reject_commercial_signal[\s\S]+?security invoker/i);
  assert.match(security, /revoke all on function public\.approve_recoverable_signal\([\s\S]+?authenticated/i);
  assert.match(security, /revoke all on function public\.approve_detected_recoverable_signal\([\s\S]+?authenticated/i);
});

test("conversion tables retain workspace-scoped RLS policies", async () => {
  const baseRls = await read("../supabase/migrations/202606100007_stabilize_supabase_rls.sql");
  const crmRls = await read("../supabase/migrations/202607060001_crm_contacts_foundation.sql");
  const signalRls = await read("../supabase/migrations/202606110010_commercial_inbox.sql");
  const security = await read("../supabase/migrations/20260830090801_commercial_signal_decision_security.sql");

  for (const table of ["opportunities", "opportunity_actions", "opportunity_events"]) {
    assert.match(baseRls, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(baseRls, /opportunities_insert_accessible_business[\s\S]+?can_access_business\(business_id\)/i);
  assert.match(baseRls, /opportunities_update_accessible_business[\s\S]+?with check \(public\.can_access_business\(business_id\)\)/i);
  assert.match(baseRls, /opportunity_actions_insert_accessible_business[\s\S]+?can_access_business/i);
  assert.match(baseRls, /opportunity_events_insert_accessible_opportunity[\s\S]+?can_access_business/i);
  assert.match(crmRls, /crm_organizations_insert_accessible_business[\s\S]+?can_access_business\(business_id\)/i);
  assert.match(crmRls, /crm_contacts_insert_accessible_business[\s\S]+?can_access_business\(business_id\)/i);
  assert.match(crmRls, /opportunity_contacts_insert_accessible_business[\s\S]+?can_access_business\(business_id\)/i);
  assert.match(signalRls, /commercial_signals_update_accessible_business[\s\S]+?with check \(public\.can_access_commercial_inbox_business\(business_id\)\)/i);
  assert.match(security, /commercial_signals_update_authorized[\s\S]+?has_business_capability\(business_id, 'signals\.update'\)[\s\S]+?with check/i);
  assert.match(security, /commercial_signal_events_insert_authorized[\s\S]+?has_business_capability\(business_id, 'signals\.update'\)/i);
  assert.match(security, /when 'signals\.convert' then role in \('owner','admin','manager','member'\)/i);
  assert.doesNotMatch(security, /when 'signals\.(?:update|convert|archive)' then role in \([^)]*'viewer'/i);
});

test("approval and rejection are atomic compare-and-set decisions", async () => {
  const security = await read("../supabase/migrations/20260830090801_commercial_signal_decision_security.sql");
  assert.match(security, /alter column updated_at set not null/i);
  assert.match(security, /expected_updated_at timestamptz/i);
  assert.match(security, /for update/i);
  assert.match(security, /v_signal\.updated_at is distinct from expected_updated_at/i);
  assert.match(security, /'outcome', 'already_applied'/i);
  assert.match(security, /'outcome', 'conflict'/i);
  assert.match(security, /review_status not in \('ready_for_review', 'postponed'\)/i);
  const rejectBody = security.slice(security.indexOf("create or replace function public.reject_commercial_signal"));
  assert.match(rejectBody, /update public\.commercial_signals[\s\S]+?insert into public\.commercial_signal_events[\s\S]+?'signal_dismissed'/i);
});

test("local integration verification covers authorization, tenant links and atomic audit", async () => {
  const verify = await read("../scripts/demo/verify-local-demo.mjs");
  assert.match(verify, /verifySignalConversionAuthorization/);
  assert.match(verify, /approve_recoverable_signal_v2/);
  assert.match(verify, /approve_detected_recoverable_signal_v2/);
  assert.match(verify, /reject_commercial_signal/);
  assert.match(verify, /Un utilizator neautorizat a convertit semnalul altui tenant/);
  assert.match(verify, /RPC-ul a acceptat o companie din alt workspace/);
  assert.match(verify, /RPC-ul a acceptat un contact din alt workspace/);
  assert.match(verify, /RPC-ul a acceptat o oportunitate din alt workspace/);
  assert.match(verify, /O conversie eșuată a modificat starea sau auditul semnalului/);
  assert.match(verify, /viewer/i);
  assert.match(verify, /stale/i);
  assert.match(verify, /already_applied/);
});

test("conversion path does not use a service-role client", async () => {
  const inbox = await read("../src/lib/commercial-inbox.ts");
  const actions = await read("../src/lib/commercial-inbox-actions.ts");
  const client = await read("../src/components/inbox/CommercialInboxClient.tsx");
  assert.doesNotMatch(inbox + actions + client, /SUPABASE_SERVICE_ROLE_KEY|createSupabaseAdminClient|service_role/i);
  assert.match(inbox, /createSupabaseServerClient/);
});
