import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function importTypeScript(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(output).toString("base64"));
}

test("follow-up transitions require human approval and never expose sent", async () => {
  const { canTransitionFollowUpDraft } = await importTypeScript("../src/lib/follow-up-studio.ts");
  assert.equal(canTransitionFollowUpDraft("draft", "approved"), true);
  assert.equal(canTransitionFollowUpDraft("draft", "ready_to_send"), false);
  assert.equal(canTransitionFollowUpDraft("approved", "ready_to_send"), true);
  assert.equal(canTransitionFollowUpDraft("sent", "edited"), false);
});

test("quality checks reject unsafe claims and provide variants", async () => {
  const { assessFollowUpDraft, validateFollowUpDraftFields } = await importTypeScript("../src/lib/follow-up-studio.ts");
  const body = "Bună ziua, revenim privind oferta discutată. Dacă subiectul este relevant, propun să stabilim următorul pas.";
  const assessment = assessFollowUpDraft({ subject: "Reluare discuție comercială", body, reason: "Ofertă fără răspuns" });
  assert.equal(assessment.canApprove, true);
  assert.match(assessment.variants.warmer, /Mulțumesc/);
  assert.match(assessment.variants.direct, /confirmați/);
  assert.ok(assessment.missingInformation.some((item) => item.includes("destinatarului")));
  assert.equal(validateFollowUpDraftFields("Venit garantat", "Vă garantăm venit și rezultate dacă răspundeți acum.").ok, false);
});

test("server action derives tenant context and cannot mark a document sent", async () => {
  const source = await readFile(new URL("../src/lib/actions.ts", import.meta.url), "utf8");
  const action = source.slice(source.indexOf("export async function updateGeneratedDocument"), source.indexOf("export async function persistOpportunityStatus"));
  assert.match(action, /getCurrentBusinessOrDemo\(\{ redirectIfMissing: true \}\)/);
  assert.match(action, /\.eq\("business_id", business\.id\)/);
  assert.match(action, /actor_profile_id: authorization\.profileId/);
  assert.match(action, /external_send: false/);
  assert.doesNotMatch(action, /status\?:[^;\n]*sent/);
  assert.doesNotMatch(action, /payload\.sent_at|status:\s*"sent"/);
});

test("studio discloses mode and automatic-send state", async () => {
  const [studio, board, route] = await Promise.all([
    readFile(new URL("../src/components/outreach/FollowUpStudio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/outreach/OutreachBoard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/(protected)/outreach/[id]/page.tsx", import.meta.url), "utf8")
  ]);
  assert.match(studio, /Draft asistat AI/);
  assert.match(studio, /Draft standard/);
  assert.match(studio, /Netrimis automat/);
  assert.match(studio, /Aprobă draftul/);
  assert.doesNotMatch(studio, /Marchează trimis/);
  assert.doesNotMatch(board, /Marchează trimis/);
  assert.match(route, /\.eq\("business_id",business\.id\)/);
});