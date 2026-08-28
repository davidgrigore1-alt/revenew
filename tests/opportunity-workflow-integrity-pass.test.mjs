import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("opportunity creation persists validated owner before workflow dispatch", () => {
  const source = read("src/lib/crm/workspace-actions.ts");
  assert.match(source, /business_assignable_profiles/);
  assert.match(source, /owner_profile_id: ownerProfileId/);
  assert.ok(source.indexOf("owner_profile_id: ownerProfileId") < source.indexOf("await processCommercialWorkflowEvent"));
  assert.match(source, /trigger: "opportunity_created"/);
  assert.match(source, /eventKey: `opportunity:\$\{data\.id\}:created`/);
});

test("opportunity creation UI uses canonical assignable profiles and confirms mutations", () => {
  const page = read("src/app/(protected)/opportunities/page.tsx");
  const panel = read("src/components/opportunities/CreateOpportunityPanel.tsx");
  const control = read("src/components/opportunities/OpportunityControlCenter.tsx");
  assert.match(page, /getAssignableProfilesForCurrentBusiness/);
  assert.match(panel, /name="ownerProfileId"/);
  assert.match(panel, /useToast/);
  assert.match(control, /useToast/);
  assert.match(control, /tone: "success"/);
  assert.match(control, /tone: "danger"/);
});

test("golden path has no autonomous external send", () => {
  const source = read("src/lib/crm/workspace-actions.ts");
  assert.doesNotMatch(source, /send_email|gmail\.send/);
});