import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = "supabase/migrations/202606260001_harden_business_members_rls.sql";

function readMigration() {
  return fs.readFileSync(path.resolve(migrationPath), "utf8");
}

function policyBody(sql, policyName) {
  const escapedName = policyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`create policy "${escapedName}"[\\s\\S]*?(?=\\ncreate policy |\\ncommit;)`, "i");
  const match = sql.match(pattern);
  assert.ok(match, `${policyName} policy missing`);
  return match[0];
}

test("business_members insert policy blocks cross-tenant self-join attempts", () => {
  const sql = readMigration();
  const insertPolicy = policyBody(sql, "business_members_insert_business_owner_only");

  assert.match(insertPolicy, /for insert with check\s*\(\s*public\.owns_business\(business_id\)\s*\)/i);
  assert.equal(insertPolicy.includes("profile_id = public.current_profile_id()"), false);
  assert.equal(insertPolicy.includes("or public.owns_business"), false);
});

test("business_members update policy prevents member self-promotion", () => {
  const sql = readMigration();
  const updatePolicy = policyBody(sql, "business_members_update_business_owner_only");

  assert.match(updatePolicy, /for update using\s*\(\s*public\.owns_business\(business_id\)\s*\)/i);
  assert.match(updatePolicy, /with check\s*\(\s*public\.owns_business\(business_id\)\s*\)/i);
  assert.equal(updatePolicy.includes("profile_id = public.current_profile_id()"), false);
});

test("business_members cannot be moved between businesses", () => {
  const sql = readMigration();

  assert.match(sql, /new\.business_id is distinct from old\.business_id/i);
  assert.match(sql, /raise exception 'business_members\.business_id cannot be changed'/i);
  assert.match(sql, /before update of business_id on public\.business_members/i);
});

test("business_members hardening preserves owner onboarding membership creation", () => {
  const sql = readMigration();
  const insertPolicy = policyBody(sql, "business_members_insert_business_owner_only");

  assert.match(insertPolicy, /public\.owns_business\(business_id\)/i);
  assert.equal(sql.includes('drop policy if exists "businesses_insert_owner_profile"'), false);
  assert.equal(sql.includes("disable row level security"), false);
});
