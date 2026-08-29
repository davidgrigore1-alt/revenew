import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("workspace notes use tenant RLS, author ownership, and target-scope validation", () => {
  const sql = read("supabase/migrations/20260824143000_workspace_notes_v1.sql");
  assert.match(sql, /create table public\.workspace_notes/i);
  assert.match(sql, /alter table public\.workspace_notes enable row level security/i);
  assert.match(sql, /workspace_notes_member_read[\s\S]+?can_access_business\(business_id\)/i);
  assert.match(sql, /workspace_notes_own_(insert|update|delete)/i);
  assert.match(sql, /author_profile_id = \(select public\.current_profile_id\(\)\)/i);
  assert.match(sql, /validate_workspace_note_scope/i);
  for (const target of ["crm_organizations", "crm_contacts", "opportunities"]) assert.match(sql, new RegExp(target));
  assert.match(sql, /revoke all on table public\.workspace_notes from anon, authenticated/i);
  assert.doesNotMatch(sql, /service_role|grant all|disable row level security/i);
});

test("workspace notes actions stay server-side, bounded, and scoped to current business and author", () => {
  const actions = read("src/lib/workspace-notes.ts");
  assert.match(actions, /^"use server"/);
  assert.match(actions, /requirePermission\("actions\.create"\)/);
  assert.match(actions, /content\.length > 5000/);
  assert.match(actions, /\.eq\("business_id", current\.business\.id\)/);
  assert.match(actions, /\.eq\("author_profile_id", authorization\.profileId\)/);
  assert.doesNotMatch(actions, /service.?role|localStorage|dangerouslySetInnerHTML/i);
});

test("saved views validate declarative state and support every core record registry", () => {
  const actions = read("src/lib/saved-views/actions.ts");
  assert.match(actions, /"companies", "contacts", "activities"/);
  assert.match(actions, /"relationship"/);
  assert.match(actions, /enumFilterPattern/);
  assert.match(actions, /profile_id", authorization\.profileId/);
  const companies = read("src/app/(protected)/companies/page.tsx");
  const contacts = read("src/app/(protected)/contacts/page.tsx");
  for (const page of [companies, contacts]) {
    assert.match(page, /getSavedViews/);
    assert.match(page, /savedViews=\{savedViews\}/);
  }
});

test("record tables expose stable sorting, selection, and safe contextual actions", () => {
  const crm = read("src/components/crm/CrmWorkspaceClient.tsx");
  const opportunities = read("src/components/opportunities/OpportunitiesExplorer.tsx");
  for (const source of [crm, opportunities]) {
    assert.match(source, /type="checkbox"/);
    assert.match(source, /role="status"/);
    assert.match(source, /Șterge selecția/);
    assert.doesNotMatch(source, /Deschide Ask ReveNew/);
    assert.doesNotMatch(source, /bulk.*send|trimite toate/i);
  }
  assert.match(crm, /SavedViewControls/);
  assert.match(crm, /Actualizare recentă/);
});

test("quick actions are real routes and remain separate from tenant-scoped search", () => {
  const search = read("src/components/search/GlobalSearch.tsx");
  for (const route of ["/ai", "/companies?create=1", "/contacts?create=1", "/opportunities?create=1", "/today", "/approvals", "/prepared"]) {
    assert.ok(search.includes(route), `missing quick action ${route}`);
  }
  assert.match(search, /query\.trim\(\)\.length < 2 \? \[\.\.\.quickActions\]/);
  assert.match(search, /searchWorkspace\(normalized\)/);
});

test("prepared work center is derived from persistent opportunity documents and never executes work", () => {
  const registry = read("src/lib/prepared-work-registry.ts");
  const page = read("src/app/(protected)/prepared/page.tsx");
  assert.match(registry, /getOpportunitiesForCurrentBusiness/);
  assert.match(registry, /flatMap\(preparedWorkForOpportunity\)/);
  assert.match(registry, /requirePermission\("documents\.read"\)/);
  assert.doesNotMatch(registry + page, /\.insert\(|\.update\(|\.delete\(|sendEmail|gmail\.send/i);
  assert.match(page, /Nimic nu este executat automat/);
});

test("Company, Opportunity, and Contact 360 expose collaborative notes without merging private connector data", () => {
  const company = read("src/app/(protected)/crm/organizations/[id]/page.tsx");
  const opportunity = read("src/app/(protected)/opportunities/[id]/page.tsx");
  const contact = read("src/app/(protected)/crm/contacts/[id]/page.tsx");
  for (const source of [company, opportunity, contact]) assert.match(source, /RecordNotes/);
  assert.match(contact, /Contact 360/);
  assert.match(contact, /getOpportunitiesForCurrentBusiness/);
  const notes = read("src/components/workspace/RecordNotes.tsx");
  assert.match(notes, /date neîncrezute/);
  assert.doesNotMatch(notes, /dangerouslySetInnerHTML/);
});