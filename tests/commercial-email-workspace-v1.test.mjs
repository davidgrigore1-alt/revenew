import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
import vm from "node:vm";
import ts from "typescript";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");

function compile(file) {
  const output = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { exports: module.exports, module, require }, { filename: file });
  return module.exports;
}

test("email intent extracts count, exact sender identity, direction and bounded time", () => {
  const intent = compile("src/lib/google-workspace/email-intent.ts");
  const parsed = intent.parseEmailQueryIntent("Arată-mi ultimele 4 mailuri primite de la LinkedIn săptămâna aceasta", new Date("2026-08-24T10:00:00Z"));
  assert.equal(parsed.limit, 4);
  assert.equal(parsed.sender, "linkedin");
  assert.equal(parsed.direction, "inbound");
  assert.match(parsed.from, /^2026-08-2[34]T/);
  assert.equal(intent.senderMatchesExact("news@e.linkedin.com", "LinkedIn", parsed.sender), true);
  assert.equal(intent.senderMatchesExact("client@meridian.example", "Meridian", parsed.sender), false);
});

test("deterministic sender filtering cannot fill the requested count with unrelated messages", () => {
  const intent = compile("src/lib/google-workspace/email-intent.ts");
  const rows = [
    { sender_email: "news@linkedin.com", sender_name: "LinkedIn" },
    { sender_email: "client@meridian.example", sender_name: "Meridian" },
    { sender_email: "alerts@e.linkedin.com", sender_name: "LinkedIn" }
  ];
  const selected = rows.filter((row) => intent.senderMatchesExact(row.sender_email, row.sender_name, "LinkedIn")).slice(0, 4);
  assert.equal(selected.length, 2);
  assert.equal(selected.some((row) => row.sender_name === "Meridian"), false);
  const repository = read("src/lib/google-workspace/repository.ts");
  assert.match(repository, /filter\(\(item\) => !input\.emailIntent\?\.sender \|\| senderMatchesExact/);
  assert.match(repository, /\.slice\(0, Math\.min\(12/);
});

test("email actions and HTML retrieval stay bound to an owned internal source", () => {
  const route = read("src/app/api/integrations/google/email/[messageId]/route.ts");
  const repository = read("src/lib/google-workspace/repository.ts");
  const runtime = read("src/lib/google-workspace/email-runtime.ts");
  assert.match(route, /requireGoogleConnectorActor/);
  assert.match(route, /runOwnedGoogleEmailAction\(actor, context\.params\.messageId/);
  assert.match(repository, /\.eq\("business_id", actor\.businessId\)/);
  assert.match(repository, /\.eq\("owner_profile_id", actor\.profileId\)/);
  assert.match(repository, /\.eq\("connection_id", connection\.id\)/);
  assert.match(runtime, /decryptGoogleRefreshCredential/);
  assert.match(runtime, /sanitizeHtml/);
  assert.match(runtime, /Content-Security-Policy/);
  assert.match(runtime, /form-action 'none'/);
  assert.doesNotMatch(route, /provider_message_id|refresh_token|access_token|encrypted_refresh/i);
});

test("viewer isolates sanitized HTML, blocks images by default and uses source-bound actions", () => {
  const drawer = read("src/components/intelligence/EmailDetailDrawer.tsx");
  assert.match(drawer, /sandbox=""/);
  assert.match(drawer, /referrerPolicy="no-referrer"/);
  assert.match(drawer, /Încarcă imaginile/);
  assert.match(drawer, /summarize_email/);
  assert.match(drawer, /explain_email_relevance/);
  assert.match(drawer, /prepare_email_followup/);
  assert.match(drawer, /Confirmă și trimite/);
  assert.doesNotMatch(drawer, /gmail\.send|sendEmail/);
  assert.match(drawer, /document\.body\.style\.overflow = "hidden"/);
  assert.match(drawer, /overflow-y-auto overscroll-contain/);
  assert.match(drawer, /fixed inset-0/);
  assert.match(drawer, /Gmail · conversație autorizată/);
  assert.match(drawer, /aria-modal="true"/);
  assert.match(drawer, /focus\(\{ preventScroll: true \}\)/);
});
