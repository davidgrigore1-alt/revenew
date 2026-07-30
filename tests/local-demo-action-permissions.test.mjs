import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

test("local demo grants only the columns required for internal action updates and audit", () => {
  const seed = read("scripts/demo/seed-local-demo.mjs");

  assert.match(seed, /grant update \(status, due_at, completed_at, cancelled_at\)\s+on public\.opportunity_actions to authenticated/i);
  assert.match(seed, /grant insert \(\s*business_id, opportunity_id, actor_profile_id, event_type,\s*label, description, metadata\s*\) on public\.opportunity_events to authenticated/i);
  assert.match(seed, /if not \(select relrowsecurity[\s\S]+?raise exception 'Demo grant refused: RLS disabled/i);
  assert.doesNotMatch(seed, /grant all|grant update on public\.opportunity_actions|grant delete|to anon/i);
});

test("local verification covers allowed action mutations and denied cross-tenant updates", () => {
  const verification = read("scripts/demo/verify-local-demo.mjs");
  const action = read("src/lib/actions.ts");
  const workflow = read("src/components/opportunities/OpportunityWorkflow.tsx");

  assert.match(verification, /status: "done", completed_at: completedAt/);
  assert.match(verification, /due_at: postponedUntil/);
  assert.match(verification, /status: "cancelled", cancelled_at: cancelledAt/);
  assert.match(verification, /crossTenantUpdate\.data\.length === 0/);
  assert.match(verification, /demoActionAfter\.due_at === demoAction\.due_at/);
  assert.match(verification, /metadata: \{ action_id: actionIds\[0\], external_action: false \}/);

  assert.match(action, /requirePermission\(action === "done" \? "actions\.complete" : "actions\.update"\)/);
  assert.match(action, /\.eq\("business_id", business\.id\)\.eq\("opportunity_id", opportunityId\)/);
  assert.doesNotMatch(action, /service.role|SUPABASE_SERVICE_ROLE_KEY|fetch\s*\(|sendEmail|calendar/i);
  assert.match(workflow, /Activitatea mea/);
  assert.doesNotMatch(workflow, /permission denied for table|42501/i);
});
