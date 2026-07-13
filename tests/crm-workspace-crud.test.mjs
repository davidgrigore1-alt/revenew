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

test("CRM UI exposes real CRUD forms and organization detail surfaces", () => {
  const crmPage = read("src/app/(protected)/crm/page.tsx");
  const client = read("src/components/crm/CrmWorkspaceClient.tsx");
  const detail = read("src/app/(protected)/crm/organizations/[id]/page.tsx");
  const navigation = read("src/lib/navigation.ts");

  assert.match(navigation, /href: "\/crm"/);
  assert.match(navigation, /primaryNavigation/);
  assert.match(crmPage, /CrmWorkspaceClient/);
  assert.match(client, /Creează organizație/);
  assert.match(client, /Creează contact/);
  assert.match(client, /Arhivează/);
  assert.match(client, /Contact principal pentru organizație/);
  assert.match(detail, /Oportunități asociate/);
  assert.match(detail, /Activitate/);
});

test("CRM loader detects missing tables and missing CRUD columns explicitly", () => {
  const source = read("src/lib/revenue-workspace.ts");

  assert.match(source, /202607060002_crm_workspace_crud\.sql/);
  assert.match(source, /Tabelele CRM lipsesc/);
  assert.match(source, /Schema CRM există, dar coloanele CRUD lipsesc/);
  assert.match(source, /is_archived/);
  assert.match(source, /is_primary_for_organization/);
});
