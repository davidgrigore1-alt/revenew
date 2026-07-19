import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("CRM CRUD migration is additive and preserves tenant isolation", () => {
  const sql = read("supabase/migrations/202607060002_crm_workspace_crud.sql");

  assert.match(sql, /alter table public\.crm_organizations/i);
  assert.match(sql, /add column if not exists is_archived/i);
  assert.match(sql, /alter table public\.crm_contacts/i);
  assert.match(sql, /add column if not exists is_primary_for_organization/i);
  assert.match(sql, /crm_contacts_one_primary_per_organization_idx/i);
  assert.match(sql, /where is_primary_for_organization and organization_id is not null and is_active/i);
  assert.match(sql, /public\.businesses\.owner_id exists unexpectedly/i);
  assert.doesNotMatch(sql, /disable row level security/i);
});

test("CRM workspace actions create, edit and archive tenant-scoped records", () => {
  const source = read("src/lib/crm/workspace-actions.ts");

  assert.match(source, /"use server"/);
  assert.match(source, /getCurrentBusinessForUser\(\{ redirectIfMissing: true \}\)/);
  assert.match(source, /requirePermission\("opportunities\.update"\)/);
  assert.match(source, /\.eq\("business_id", context\.businessId\)/);
  assert.match(source, /saveCrmOrganization/);
  assert.match(source, /archiveCrmOrganization/);
  assert.match(source, /saveCrmContact/);
  assert.match(source, /archiveCrmContact/);
  assert.match(source, /is_primary_for_organization: false/);
  assert.doesNotMatch(source, /\bowner_id\b/);
  assert.doesNotMatch(source, /profiles\.role/);
});

test("CRM UI exposes real CRUD forms and first-class company/contact navigation", () => {
  const crmPage = read("src/app/(protected)/crm/page.tsx");
  const client = read("src/components/crm/CrmWorkspaceClient.tsx");
  const detail = read("src/app/(protected)/crm/organizations/[id]/page.tsx");
  const navigation = read("src/lib/navigation.ts");

  assert.match(navigation, /href: "\/companies"/);
  assert.match(navigation, /href: "\/contacts"/);
  assert.match(navigation, /primaryNavigation/);
  assert.match(crmPage, /CrmWorkspaceClient/);
  assert.match(client, /Adaugă companie/);
  assert.match(client, /Adaugă contact/);
  assert.match(client, /role="dialog"/);
  assert.match(client, /filteredOrganizations/);
  assert.match(client, /activeOpportunities/);
  assert.match(client, /Arhivează/);
  assert.match(client, /Contact principal pentru companie/);
  assert.match(detail, /Oportunități asociate/);
  assert.match(detail, /Activitate/);
});

test("commercial workflow links opportunities to companies with a tenant-scope trigger", () => {
  const sql = read("supabase/migrations/20260714100223_complete_commercial_workflow.sql");
  const actions = read("src/lib/crm/workspace-actions.ts");
  const createPanel = read("src/components/opportunities/CreateOpportunityPanel.tsx");

  assert.match(sql, /add column if not exists organization_id uuid references public\.crm_organizations\(id\)/i);
  assert.match(sql, /organization\.business_id = new\.business_id/i);
  assert.match(sql, /organization\.is_archived = false/i);
  assert.match(sql, /trg_opportunities_validate_organization_scope/i);
  assert.doesNotMatch(sql, /disable row level security/i);
  assert.match(actions, /requirePermission\("opportunities\.create"\)/);
  assert.match(actions, /\.eq\("business_id", business\.id\)/);
  assert.match(actions, /organization_id: organization\.id/);
  assert.match(createPanel, /createCrmOpportunity/);
  assert.doesNotMatch(actions, /business_id:\s*field\(/);
});

test("Supabase configuration never auto-seeds demonstration data", () => {
  const config = read("supabase/config.toml");

  assert.match(config, /\[db\.seed\][\s\S]*enabled = false/);
  assert.match(config, /auto_expose_new_tables = false/);
});

test("CRM loader detects missing tables and missing CRUD columns explicitly", () => {
  const source = read("src/lib/revenue-workspace.ts");

  assert.match(source, /202607060002_crm_workspace_crud\.sql/);
  assert.match(source, /Tabelele CRM lipsesc/);
  assert.match(source, /Schema CRM există, dar coloanele CRUD lipsesc/);
  assert.match(source, /is_archived/);
  assert.match(source, /is_primary_for_organization/);
});
