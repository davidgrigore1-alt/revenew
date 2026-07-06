import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.resolve("supabase/migrations/202607060001_crm_contacts_foundation.sql");
const actionsPath = path.resolve("src/lib/crm/contact-actions.ts");
const dataPath = path.resolve("src/lib/supabase/data.ts");
const panelPath = path.resolve("src/components/opportunities/OpportunityContactsPanel.tsx");
const workflowPath = path.resolve("src/components/opportunities/OpportunityWorkflow.tsx");
const typesPath = path.resolve("src/lib/types.ts");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("CRM migration is tenant-scoped, additive, and protected by RLS", () => {
  const sql = read(migrationPath);

  assert.match(sql, /create table if not exists public\.crm_organizations/i);
  assert.match(sql, /create table if not exists public\.crm_contacts/i);
  assert.match(sql, /create table if not exists public\.opportunity_contacts/i);
  assert.match(sql, /references public\.businesses\(id\)/i);
  assert.match(sql, /references public\.opportunities\(id\)/i);
  assert.match(sql, /alter table public\.crm_organizations enable row level security/i);
  assert.match(sql, /alter table public\.crm_contacts enable row level security/i);
  assert.match(sql, /alter table public\.opportunity_contacts enable row level security/i);
  assert.match(sql, /public\.can_access_business\(business_id\)/i);
  assert.match(sql, /crm_contacts_business_email_unique/i);
  assert.match(sql, /opportunity_contacts_one_primary_idx/i);
  assert.match(sql, /crm_validate_contact_scope/i);
  assert.match(sql, /crm_validate_opportunity_contact_scope/i);
  assert.match(sql, /public\.businesses\.owner_id exists unexpectedly/i);
});

test("CRM server actions derive business server-side and enforce duplicate and primary-contact rules", () => {
  const source = read(actionsPath);

  assert.match(source, /"use server"/);
  assert.match(source, /getCurrentBusinessForUser\(\{ redirectIfMissing: true \}\)/);
  assert.match(source, /requirePermission\("opportunities\.update"\)/);
  assert.match(source, /\.eq\("business_id", business\.id\)/);
  assert.match(source, /\.eq\("business_id", context\.businessId\)/);
  assert.match(source, /\.eq\("normalized_email", normalizedEmail\)/);
  assert.match(source, /\.update\(\{ is_primary: false \}\)/);
  assert.match(source, /primary_contact_changed/);
  assert.match(source, /contact_removed/);
  assert.doesNotMatch(source, /\bowner_id\b/);
  assert.doesNotMatch(source, /profiles\.role/);
});

test("opportunity loader maps CRM contacts and degrades before migration is applied", () => {
  const source = read(dataPath);

  assert.match(source, /from\("opportunity_contacts"\)/);
  assert.match(source, /crm_contacts\(id,business_id,organization_id,full_name/);
  assert.match(source, /crm_organizations\(id,business_id,name,website,notes/);
  assert.match(source, /isMissingRelationError\(contactsError, "opportunity_contacts"\)/);
  assert.match(source, /contacts: OpportunityContact\[\]/);
  assert.match(source, /primaryContact\.contact\.fullName/);
});

test("opportunity detail exposes CRM contact management without changing page architecture", () => {
  const panel = read(panelPath);
  const actions = read(actionsPath);
  const workflow = read(workflowPath);
  const types = read(typesPath);

  assert.match(types, /export type CrmOrganization/);
  assert.match(types, /export type CrmContact/);
  assert.match(types, /export type OpportunityContact/);
  assert.match(types, /contacts\?: OpportunityContact\[\]/);
  assert.match(workflow, /<OpportunityContactsPanel opportunityId=\{opportunity\.id\} contacts=\{opportunity\.contacts \?\? \[\]\} \/>/);
  assert.match(panel, /Contacte oportunitate/);
  assert.match(panel, /Companie prospect/);
  assert.match(panel, /Setează principal/);
  assert.match(panel, /Elimină/);
  assert.match(actions, /Numele contactului este obligatoriu/);
  assert.doesNotMatch(panel, /Ä|È|Å|Ã|Â|�/);
});
