import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");

test("A4.2 registries use one compact tool surface and responsive semantic records", () => {
  const companies = read("src/app/(protected)/companies/page.tsx");
  const contacts = read("src/app/(protected)/contacts/page.tsx");
  const opportunities = read("src/app/(protected)/opportunities/page.tsx");
  const crm = read("src/components/crm/CrmWorkspaceClient.tsx");
  const explorer = read("src/components/opportunities/OpportunitiesExplorer.tsx");

  for (const route of [companies, contacts, opportunities]) {
    assert.match(route, /<PageShell[\s\S]{0,40}\bwide\b/);
  }
  assert.match(crm, /product-grouping-surface/);
  assert.match(crm, /aria-label="Registru companii"/);
  assert.match(crm, /aria-label="Registru contacte"/);
  assert.match(crm, /lg:hidden/);
  assert.match(crm, /hidden overflow-x-auto[\s\S]*lg:block/);
  assert.match(explorer, /aria-label="Registru oportunități"/);
  assert.match(explorer, /Valoare estimată/);
  assert.match(explorer, />Estimat</);
});

test("contact context comes only from explicit persisted opportunity associations", () => {
  const contacts = read("src/app/(protected)/contacts/page.tsx");
  const data = read("src/lib/crm/contact-registry-data.ts");
  const crm = read("src/components/crm/ContactsRegistry.tsx");

  // The route now delegates to a narrow cohort loader. Relationship behavior,
  // tenant rejection and canonical lifecycle are exercised in contact-registry.
  assert.match(contacts, /getContactRegistryForCurrentBusiness\(\)/);
  assert.match(data, /from\("opportunity_contacts"\)/);
  assert.match(data, /\.in\("contact_id", contacts\.map/);
  assert.doesNotMatch(contacts, /getOpportunitiesForCurrentBusiness/);
  assert.match(crm, /Oportunități asociate/);
  assert.match(crm, /asocieri explicite/);
  assert.doesNotMatch(contacts, /similar|heuristic|fuzzy|includes\(contact\.fullName/);
});

test("record details share compact identity and semantic tab patterns", () => {
  const summary = read("src/components/records/RecordSummaryBar.tsx");
  const tabs = read("src/components/records/RecordTabs.tsx");
  const company = read("src/app/(protected)/crm/organizations/[id]/page.tsx");
  const contact = read("src/app/(protected)/crm/contacts/[id]/page.tsx");
  const opportunity = read("src/app/(protected)/opportunities/[id]/page.tsx");

  assert.match(summary, /<dl/);
  assert.match(tabs, /aria-current/);
  assert.match(tabs, /aria-\[current=page\]/);
  assert.match(company, /<CompanyIdentity/);
  assert.match(company, /<RecordTabs/);
  assert.match(contact, /<ContactDetail/);
  assert.match(opportunity, /<RecordSummaryBar/);
  assert.match(opportunity, /<RecordTabs/);
});

test("opportunity command workspace keeps state, safe action and financial truth distinct", () => {
  const opportunity = read("src/app/(protected)/opportunities/[id]/page.tsx");

  assert.match(opportunity, /STARE CURENTĂ/);
  assert.match(opportunity, /URMĂTOAREA ACȚIUNE SIGURĂ/);
  assert.match(opportunity, /Necesită control uman/);
  assert.match(opportunity, /Valoare estimată/);
  assert.match(opportunity, /Nu reprezintă venit confirmat/);
  assert.match(opportunity, /Venit confirmat/);
  assert.doesNotMatch(opportunity, /probabilitate|AI risk|health score/i);
});
