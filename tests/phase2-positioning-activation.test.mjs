import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");

test("Phase 2 positioning defines commercial recovery without debt ambiguity", () => {
  const landing = read("src/app/(marketing)/page.tsx");
  const plans = read("src/lib/billing/plans.ts");
  assert.match(landing, /nu datorii/i);
  assert.match(landing, /Nu este recuperare de creanțe/);
  assert.match(landing, /ReveNew recomandă, iar echipa ta decide/);
  assert.match(plans, /Revenue Recovery Audit/);
  assert.match(plans, /490 EUR/);
  assert.match(plans, /ReveNew Managed/);
  assert.match(plans, /690 EUR/);
  assert.match(plans, /Custom Implementation/);
});

test("navigation reflects user jobs and keeps platform administration permission-gated", () => {
  const navigation = read("src/lib/navigation.ts");
  const policies = read("src/lib/authz/route-policies.ts");
  for (const label of ["Acasă", "Activitatea mea", "Pipeline", "Companii", "Contacte", "Oportunități", "Documente", "Rapoarte", "Setări"]) assert.match(navigation, new RegExp(label));
  assert.match(navigation, /permission: "platform\.admin\.access"/);
  assert.match(policies, /prefix: "\/companies", permission: "workspace\.read"/);
  assert.match(policies, /prefix: "\/contacts", permission: "workspace\.read"/);
  assert.doesNotMatch(navigation, /businesses\.owner_id/);
});

test("global search is bounded and always derives workspace context server-side", () => {
  const search = read("src/lib/search/actions.ts");
  assert.match(search, /requirePermission\("workspace\.read"\)/);
  assert.match(search, /getCurrentBusinessForUser\(\{ redirectIfMissing: true \}\)/);
  assert.ok((search.match(/\.eq\("business_id", businessId\)/g) ?? []).length >= 5);
  assert.ok((search.match(/\.limit\(5\)/g) ?? []).length >= 5);
  assert.doesNotMatch(search, /service.role|SUPABASE_SERVICE_ROLE_KEY/i);
});

test("CSV import is bounded, idempotent and rejects foreign workspace identifiers", () => {
  const actions = read("src/lib/imports/actions.ts");
  const client = read("src/components/imports/CsvImportWizard.tsx");
  assert.match(actions, /const maxRows = 1000/);
  assert.match(actions, /createHash\("sha256"\)/);
  assert.match(actions, /getCurrentBusinessForUser\(\{ redirectIfMissing: true \}\)/);
  assert.match(actions, /eligibleOwners\.has\(ownerId\)/);
  assert.match(actions, /business_id: businessId/);
  assert.doesNotMatch(actions, /console\.(log|error)\([^)]*rows/);
  assert.match(client, /papaparse/);
  assert.match(client, /2 \* 1024 \* 1024/);
  assert.match(client, /spreadsheet|^[\s\S]*\^\[=\+\\-@\]/i);
});

test("saved views and onboarding progress use authenticated database ownership", () => {
  const views = read("src/lib/saved-views/actions.ts");
  const onboarding = read("src/lib/onboarding/progress-actions.ts");
  assert.match(views, /profile_id: authorization\.profileId/);
  assert.match(views, /business_id: current\.business\.id/);
  assert.match(onboarding, /profile_id: profile\.id/);
  assert.match(onboarding, /JSON\.stringify\(draft\)\.length > 12_000/);
});

test("Phase 2 migration has explicit grants, RLS and tenant ownership policies", () => {
  const migration = read("supabase/migrations/202607140001_phase2_activation_search_import_views.sql");
  for (const table of ["onboarding_drafts", "saved_views", "data_import_batches", "product_events"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`revoke all on public\\.[^;]*${table}|revoke all on public\\.${table}`));
  }
  assert.match(migration, /profile_id = \(select public\.current_profile_id\(\)\)/);
  assert.match(migration, /public\.can_access_business\(business_id\)/);
  assert.match(migration, /grant select, insert, update, delete on public\.saved_views to authenticated/);
  assert.match(migration, /crm_organizations_name_search_idx/);
  assert.doesNotMatch(migration, /businesses\.owner_id\s+(uuid|text)/i);
});

test("filters persist through URLs and debug diagnostics are dynamic development-only routes", () => {
  const filters = read("src/components/filters/OpportunityFilters.tsx");
  const opportunities = read("src/app/(protected)/opportunities/page.tsx");
  const debug = read("src/app/debug/supabase/page.tsx");
  assert.match(filters, /form method="get"/);
  assert.match(filters, /href="\/opportunities"/);
  assert.match(opportunities, /searchParams/);
  assert.match(opportunities, /pageSize = 25/);
  assert.match(debug, /process\.env\.NODE_ENV !== "development"/);
  assert.match(debug, /export const dynamic = "force-dynamic"/);
});
