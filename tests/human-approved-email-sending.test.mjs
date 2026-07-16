import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importSendingModule() {
  const source = (await readFile(new URL("../src/lib/follow-up-sending.ts", import.meta.url), "utf8")).replace('import "server-only";', "");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(output).toString("base64"));
}

test("recipient, subject and body validation fail closed", async () => {
  const sending = await importSendingModule();
  assert.equal(sending.isValidRecipientEmail("invalid"), false);
  assert.equal(sending.isValidRecipientEmail("client@example.ro"), true);
  const fingerprint = sending.createFollowUpContentFingerprint({ businessId: "b", documentId: "d", opportunityId: "o", recipient: "client@example.ro", subject: "Subiect", body: "Mesaj" });
  assert.notEqual(fingerprint, sending.createFollowUpContentFingerprint({ businessId: "b", documentId: "d", opportunityId: "o", recipient: "client@example.ro", subject: "Subiect schimbat", body: "Mesaj" }));
  assert.notEqual(fingerprint, sending.createFollowUpContentFingerprint({ businessId: "b", documentId: "d", opportunityId: "o", recipient: "other@example.ro", subject: "Subiect", body: "Mesaj" }));
});

test("server action rejects anonymous, cross-workspace, unapproved and replayed sends", async () => {
  const source = await readFile(new URL("../src/lib/follow-up-send-actions.ts", import.meta.url), "utf8");
  assert.match(source, /requirePermission\("documents\.mark_sent"\)/);
  assert.match(source, /\.eq\("business_id", business\.id\)/);
  assert.match(source, /document\.business_id === business\.id/);
  assert.match(source, /\["approved", "ready_to_send"\]\.includes\(document\.status\)/);
  assert.match(source, /isValidRecipientEmail\(recipient\)/);
  assert.match(source, /subject\.length > 0/);
  assert.match(source, /body\.length > 0/);
  assert.match(source, /approved_content_fingerprint === fingerprint/);
  assert.match(source, /document\.send_status === "sending"/);
  assert.match(source, /document\.send_status === "sent"/);
  assert.match(source, /\.eq\("send_attempt_count", document\.send_attempt_count\)/);
  assert.match(source, /follow_up_replay_blocked/);
  assert.doesNotMatch(source, /businessId:\s*string|workspaceId:\s*string|recipient:\s*string,\s*finalConfirmation/);
});

test("disabled and test modes never call the live provider or mark sent", async () => {
  const source = await readFile(new URL("../src/lib/follow-up-send-actions.ts", import.meta.url), "utf8");
  const disabled = source.slice(source.indexOf('if (config.mode === "disabled")'), source.indexOf('if (config.mode === "test")'));
  const testMode = source.slice(source.indexOf('if (config.mode === "test")'), source.indexOf("const providerResult"));
  assert.doesNotMatch(disabled, /sendWithConfiguredProvider|status:\s*"sent"/);
  assert.match(disabled, /send_status: "disabled"/);
  assert.doesNotMatch(testMode, /sendWithConfiguredProvider|status:\s*"sent"/);
  assert.match(testMode, /send_status: "test_completed"/);
  assert.match(testMode, /Nu a fost livrat niciun email extern/);
});

test("migration is additive, tenant-safe and revision-aware", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260716205102_human_approved_email_sending_v1.sql", import.meta.url), "utf8");
  assert.match(sql, /approved_content_fingerprint text/i);
  assert.match(sql, /send_status text not null default 'not_sent'/i);
  assert.match(sql, /unique index[\s\S]*business_id, idempotency_key/i);
  assert.match(sql, /invalidate_follow_up_document_approval/i);
  assert.doesNotMatch(sql, /businesses\.owner_id|disable row level security|grant all|service[_ -]?role/i);
  assert.doesNotMatch(sql, /drop\s+(?:table|schema|column)|truncate|delete\s+from/i);
});

test("studio requires explicit final confirmation and labels test results", async () => {
  const source = await readFile(new URL("../src/components/outreach/FollowUpStudio.tsx", import.meta.url), "utf8");
  assert.match(source, /Confirmare finală/);
  assert.match(source, /Confirm explicit/);
  assert.match(source, /Netrimis automat/);
  assert.match(source, /Test intern finalizat\. Nu a fost livrat niciun email extern/);
  assert.match(source, /Conținutul sau destinatarul diferă de versiunea aprobată/);
  assert.match(source, /savedRevision/);
  assert.match(source, />Subiect</);
  assert.match(source, />Mesaj</);
});

test("approval fingerprints use the same linked recipient fallback as send readiness", async () => {
  const source = await readFile(new URL("../src/lib/actions.ts", import.meta.url), "utf8");
  assert.match(source, /opportunity\.contact\?\.email \?\? primaryContact\?\.contact\.email/);
  assert.match(source, /validated\.subject !== \(currentDocument\.title \?\? ""\)/);
  assert.match(source, /validated\.body !== \(currentDocument\.body \?\? ""\)/);
});

test("opportunity workflow deduplicates a newly persisted document after revalidation", async () => {
  const source = await readFile(new URL("../src/components/opportunities/OpportunityWorkflow.tsx", import.meta.url), "utf8");
  assert.match(source, /savedDocuments\.filter\(\(savedDocument\) => !documents\.some\(\(document\) => document\.id === savedDocument\.id\)\)/);
});
