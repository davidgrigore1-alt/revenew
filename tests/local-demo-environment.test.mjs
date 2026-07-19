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
  assert.equal(DEMO.businessName, "[DEMO] Auto Management Revenue Lab");
  assert.equal(fixtures.organizations.length, 8);
  assert.ok(fixtures.organizations.every((organization) => organization.name.startsWith("[DEMO]") && organization.notes.includes(DEMO.marker)));
  assert.equal(fixtures.contacts.length, 8);
  assert.equal(fixtures.contacts.filter((contact) => contact.organization_id === fixtures.organizations[0].id).length, 2);
  assert.ok(fixtures.contacts.every((contact) => fixtures.organizations.some((organization) => organization.id === contact.organization_id)));
  assert.equal(fixtures.opportunities.length, 11);
  assert.equal(fixtures.actions.length, 12);
  assert.equal(fixtures.signals.length, 10);
  assert.equal(fixtures.signalEvents.length, 10);
  assert.ok(fixtures.signals.some((signal) => signal.review_status === "ready_for_review"));
  assert.ok(fixtures.signals.some((signal) => signal.status === "converted" && signal.converted_opportunity_id));
  assert.ok(fixtures.signals.some((signal) => signal.matched_organization_id));
  assert.ok(fixtures.signals.some((signal) => signal.detected_from_opportunity_id));
  assert.ok(fixtures.signals.every((signal) => !["ai_receptionist", "instagram", "website_form", "missed_call"].includes(signal.source)));
  assert.ok(fixtures.contacts.every((contact) => contact.email.endsWith(".test")));
  assert.ok(fixtures.opportunities.every((opportunity) => opportunity.currency === "RON"));
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
});

test("demo tooling keeps local guard and disabled external integrations explicit", () => {
  const localTool = readFileSync(new URL("../scripts/demo/local-supabase.mjs", import.meta.url), "utf8");
  const seedTool = readFileSync(new URL("../scripts/demo/seed-local-demo.mjs", import.meta.url), "utf8");
  const resetTool = readFileSync(new URL("../scripts/demo/reset-local-demo.mjs", import.meta.url), "utf8");
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
});
