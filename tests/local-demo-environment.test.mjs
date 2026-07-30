import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { assertLocalUrl } from "../scripts/demo/local-supabase.mjs";
import { buildFixtures, DEMO } from "../scripts/demo/fixtures.mjs";

test("local demo guard accepts only loopback Supabase targets", () => {
  assert.equal(assertLocalUrl("http://127.0.0.1:54321", "API", ["http:"]).hostname, "127.0.0.1");
  assert.equal(assertLocalUrl("postgresql://postgres@localhost:54322/postgres", "DB", ["postgresql:"]).hostname, "localhost");
  assert.throws(() => assertLocalUrl("https://project.supabase.co", "API", ["https:"]), /localhost/);
  assert.throws(() => assertLocalUrl("postgresql://db.example.test/postgres", "DB", ["postgresql:"]), /localhost/);
  assert.throws(() => assertLocalUrl("file:///tmp/demo", "API", ["http:"]), /localhost/);
});

test("fixtures are deterministic, fictional and decision-useful", () => {
  const fixtures = buildFixtures("de900000-0000-4000-8000-000000000001", new Date("2026-07-19T09:00:00.000Z"));
  const visibleFixtureText = JSON.stringify(fixtures);
  assert.equal(DEMO.businessName, "Meridian Commercial Operations");
  assert.equal(DEMO.operatorName, "Irina Petrescu");
  assert.equal(DEMO.email, "irina.petrescu@revenew-demo.invalid");
  assert.equal(DEMO.featuredOpportunityId, "de300006-0000-4000-8000-000000000006");
  assert.equal(fixtures.organizations.length, 8);
  assert.ok(fixtures.organizations.every((organization) => !organization.name.startsWith("[DEMO]") && /fictivă/i.test(organization.notes)));
  for (const company of ["Meridian Logistics SRL", "Delta Construct Solutions SRL", "Nova Medical Systems SRL", "Atlas Fleet Services SRL", "Carpathia Distribution Group SRL", "Urban Facility Partners SRL"]) {
    assert.ok(fixtures.organizations.some((organization) => organization.name === company), `${company} lipsește`);
  }
  assert.equal(fixtures.contacts.length, 8);
  for (const contact of ["Andrei Ionescu", "Elena Popa", "Mihai Dumitrescu", "Radu Marinescu", "Ioana Stan"]) {
    assert.ok(fixtures.contacts.some((candidate) => candidate.full_name === contact), `${contact} lipsește`);
  }
  assert.equal(fixtures.contacts.filter((contact) => contact.organization_id === fixtures.organizations[0].id).length, 2);
  assert.ok(fixtures.contacts.every((contact) => fixtures.organizations.some((organization) => organization.id === contact.organization_id)));
  assert.equal(fixtures.opportunities.length, 11);
  assert.equal(fixtures.actions.length, 12);
  assert.equal(fixtures.signals.length, 10);
  assert.equal(fixtures.signalEvents.length, 12);
  assert.ok(fixtures.signals.some((signal) => signal.review_status === "ready_for_review"));
  assert.ok(fixtures.signals.some((signal) => signal.status === "converted" && signal.converted_opportunity_id));
  assert.ok(fixtures.signals.some((signal) => signal.matched_organization_id));
  assert.ok(fixtures.signals.some((signal) => signal.detected_from_opportunity_id));
  assert.ok(fixtures.signals.some((signal) => signal.source_label === "Import controlat · text în bloc" && signal.ingestion_origin === "csv_import" && signal.status === "new" && signal.analysis_status === "not_started"));
  assert.ok(fixtures.signals.every((signal) => !["ai_receptionist", "instagram", "website_form", "missed_call"].includes(signal.source)));
  assert.ok(fixtures.contacts.every((contact) => /@(?:[a-z0-9-]+\.)*(?:demo|example|revenew-demo)\.invalid$/i.test(contact.email)));
  assert.ok(fixtures.contacts.every((contact) => !/^contact\d+@/i.test(contact.email)));
  assert.deepEqual([...new Set(fixtures.opportunities.map((opportunity) => opportunity.currency))].sort(), ["EUR", "RON"]);
  assert.ok(fixtures.opportunities.every((opportunity) => ["RON", "EUR"].includes(opportunity.currency)));
  assert.equal(fixtures.opportunities.filter((opportunity) => opportunity.currency === "EUR").length, 1);
  assert.equal(fixtures.opportunities.filter((opportunity) => opportunity.lifecycle_status === "won").length, 1);
  assert.equal(fixtures.opportunities.filter((opportunity) => opportunity.lifecycle_status === "lost").length, 1);
  assert.ok(fixtures.opportunities.some((opportunity) => opportunity.owner_profile_id === null));
  assert.ok(fixtures.opportunities.some((opportunity) => opportunity.deadline === null));
  assert.ok(fixtures.opportunities.some((opportunity) => opportunity.lifecycle_status === "won" && opportunity.actual_outcome_amount > 0));
  assert.ok(fixtures.opportunities.some((opportunity) => opportunity.lifecycle_status === "lost" && opportunity.actual_outcome_amount === null));
  assert.ok(fixtures.actions.some((action) => action.status === "pending" && action.due_at < "2026-07-19T09:00:00.000Z"));
  assert.ok(fixtures.actions.some((action) => action.status === "pending" && action.due_at > "2026-07-19T09:00:00.000Z"));
  assert.ok(fixtures.actions.some((action) => action.status === "done"));
  assert.ok(fixtures.opportunities.some((opportunity) => !fixtures.actions.some((action) => action.opportunity_id === opportunity.id && action.status === "pending")));
  assert.ok(fixtures.opportunities.some((opportunity) => opportunity.estimated_value_high > 0 && opportunity.actual_outcome_amount == null));
  assert.ok(fixtures.opportunities.some((opportunity) => opportunity.id === DEMO.featuredOpportunityId && opportunity.owner_profile_id === null && opportunity.deadline < "2026-07-19"));
  assert.ok(fixtures.signals.some((signal) => signal.detected_from_opportunity_id && signal.primary_recovery_reason && signal.raw_message));
  assert.ok(fixtures.signals.some((signal) => signal.review_status === "ready_for_review" && signal.analysis_status === "completed"));
  assert.ok(fixtures.opportunities.some((opportunity) => opportunity.recommended_action));
  assert.ok(fixtures.documents.some((document) => document.status === "ready_to_send" && !/trimis/i.test(document.status)));
  const buyerVisibleFixtureText = JSON.stringify({
    organizations: fixtures.organizations.map(({ name, notes }) => ({ name, notes })),
    contacts: fixtures.contacts.map(({ full_name, notes }) => ({ full_name, notes })),
    opportunities: fixtures.opportunities.map(({ title, summary, outcome_note }) => ({ title, summary, outcome_note })),
    actions: fixtures.actions.map(({ title, description }) => ({ title, description })),
    events: fixtures.events.map(({ label, description }) => ({ label, description })),
    documents: fixtures.documents.map(({ title, body }) => ({ title, body })),
    signals: fixtures.signals.map(({ title, source_label, raw_message, analysis_explanation }) => ({ title, source_label, raw_message, analysis_explanation })),
    signalEvents: fixtures.signalEvents.map(({ description }) => ({ description }))
  });
  assert.doesNotMatch(buyerVisibleFixtureText, new RegExp(DEMO.marker, "i"));
  assert.doesNotMatch(buyerVisibleFixtureText, /Captură locală demonstrativă|acțiune pending/i);
  assert.doesNotMatch(`${DEMO.businessName}\n${DEMO.operatorName}\n${DEMO.email}\n${visibleFixtureText}`, /gmail\.com|Grigore|David|testdavid|davidtest|TEST DATA|E2E/i);
});

test("demo tooling keeps local guard and disabled external integrations explicit", () => {
  const localTool = readFileSync(new URL("../scripts/demo/local-supabase.mjs", import.meta.url), "utf8");
  const seedTool = readFileSync(new URL("../scripts/demo/seed-local-demo.mjs", import.meta.url), "utf8");
  const resetTool = readFileSync(new URL("../scripts/demo/reset-local-demo.mjs", import.meta.url), "utf8");
  const verifyTool = readFileSync(new URL("../scripts/demo/verify-local-demo.mjs", import.meta.url), "utf8");
  const docs = readFileSync(new URL("../docs/local-demo.md", import.meta.url), "utf8");
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(localTool, /assertLocalUrl\(apiUrl/);
  assert.match(localTool, /assertLocalUrl\(dbUrl/);
  assert.match(localTool, /EMAIL_SENDING_MODE: "disabled"/);
  assert.match(localTool, /OPENAI_API_KEY: ""/);
  assert.match(seedTool, /requireDemoPassword/);
  assert.doesNotMatch(seedTool, /password:\s*["'][^"']+["']/);
  assert.match(seedTool, /delete from public\.businesses where id/);
  assert.match(resetTool, /runLocalSql/);
  assert.match(resetTool, /DEMO\.businessId/);
  assert.doesNotMatch(seedTool + resetTool, /https:\/\/(?!127\.0\.0\.1|localhost)/);
  assert.doesNotMatch(seedTool, /openai|resend|webhook|whatsapp/i);
  assert.doesNotMatch(`${DEMO.email}\n${seedTool}`, /gmail\.com|Grigore|David|testdavid|davidtest/i);
  assert.match(seedTool, /DEMO\.operatorName/);
  assert.match(seedTool, /'platform_operator'/);
  assert.doesNotMatch(seedTool, /'platform_admin'/);
  assert.match(verifyTool, /unsafe_visible_label_count/);
  assert.match(verifyTool, /internal_demo_access_count/);
  assert.match(verifyTool, /unsupported_currency_count/);
  assert.match(verifyTool, /evidence_backed_opportunity_count/);
  assert.equal(packageJson.scripts["demo:buyer-ready"], "npm run demo:seed && npm run demo:verify");
  assert.match(docs, /Nicio comunicare externă nu este trimisă automat/);
  assert.match(docs, /Valorile estimate nu sunt venit confirmat/);
  assert.match(docs, /\/reports\/revenue-recovery-audit/);
  assert.match(docs, /\/reports\/enterprise-pilot-pack/);
  assert.match(docs, new RegExp(`/opportunities/${DEMO.featuredOpportunityId}`));
  assert.match(docs, /testdavid.*davidtest.*TEST DATA.*E2E/s);
});
