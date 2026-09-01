import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");
const has = (source, fragment) => assert.ok(source.includes(fragment), `Missing expected fragment: ${fragment}`);

function presentationModule() {
  const source = read("src/lib/ui/presentation.ts");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, Intl, Date, Number, RegExp }, { filename: "presentation.ts" });
  return module.exports;
}

test("central presentation turns canonical values into Romanian product language", () => {
  const format = presentationModule();
  assert.equal(format.presentOpportunityState("contacted").label, "Contact inițiat");
  assert.equal(format.presentOpportunityState("reviewed").label, "Revizuit");
  assert.equal(format.presentOpportunityState("follow_up_needed").label, "Follow-up necesar");
  assert.equal(format.presentOpportunityState("action_generated").label, "Acțiune pregătită");
  assert.equal(format.presentExecutionState("waiting_for_client").label, "Așteaptă clientul");
  assert.equal(format.presentCommunicationState("failed").label, "Trimitere nereușită");
});

test("product date formatting never exposes an ISO timestamp", () => {
  const format = presentationModule();
  const result = format.formatProductDateTime("2026-08-20T09:00:00+00:00");
  assert.doesNotMatch(result, /T09:00:00|\+00:00|2026-08-20/);
  assert.match(result, /20/);
});

test("recent changes use a dedicated renderer with concise narrative and secondary evidence", () => {
  const cards = read("src/components/intelligence/CopilotResultCards.tsx");
  const conversation = read("src/components/intelligence/CopilotConversation.tsx");
  const orchestrator = read("src/lib/ai/copilot-orchestrator.ts");
  has(cards, 'presentation.kind !== "recent_changes"');
  has(cards, "Ce s-a schimbat recent");
  has(cards, "presentOpportunityState");
  has(cards, "formatProductDateTime");
  has(conversation, "Dovezi ·");
  has(orchestrator, "schimbări comerciale relevante");
  assert.doesNotMatch(conversation, /Rezultat determinist|Răspunsul generativ nu este disponibil/);
  assert.doesNotMatch(orchestrator, /\$\{index \+ 1\}\. \$\{item\.title\}/);
});

test("email presentation is source-bound, strips transport noise and keeps one opening action", () => {
  const cards = read("src/components/intelligence/CopilotResultCards.tsx");
  const inbox = read("src/components/inbox/ConnectedEmailInbox.tsx");
  has(cards, 'provider="gmail"');
  has(cards, "formatUserFacingText(email.excerpt, { stripUrls: true })");
  has(cards, "Deschide conversația");
  has(inbox, "formatUserFacingText(email.excerpt, { stripUrls: true })");
  has(inbox, "formatProductDateTime(email.sentAt)");
  assert.doesNotMatch(cards, /tracking_url|raw_mime|dangerouslySetInnerHTML/);
});

test("deterministic fallback remains intentional when generative enhancement is unavailable", () => {
  const orchestrator = read("src/lib/ai/copilot-orchestrator.ts");
  has(orchestrator, "Răspuns bazat pe date verificate.");
  assert.doesNotMatch(orchestrator, /Răspunsul generativ nu este disponibil momentan/);
});

test("Gmail capabilities distinguish reading from permission-gated sending", () => {
  const apps = read("src/components/apps/GoogleWorkspaceCard.tsx");
  const model = read("src/lib/integrations/presentation.ts");
  has(apps, "<GoogleCapabilities state={state}");
  has(model, 'label: "Citire"');
  has(model, 'label: "Trimitere"');
  has(model, "Permisiune necesară");
  has(apps, "/api/integrations/google/connect?capability=email_send");
  has(apps, "Activează trimiterea");
  has(apps, "confirmare finală");
});

test("email reader locks background scroll, restores focus and blocks repeated send mutations", () => {
  const drawer = read("src/components/intelligence/EmailDetailDrawer.tsx");
  has(drawer, 'document.body.style.overflow = "hidden"');
  has(drawer, 'aria-modal="true"');
  has(drawer, "overflow-y-auto overscroll-contain");
  has(drawer, "returnFocus.current");
  has(drawer, "mutationLock.current");
  has(drawer, 'if (!draft || mutationLock.current) return');
  has(drawer, 'event.key === "Escape"');
});

test("Today, Meetings and Sequences consume centralized presentation instead of raw states", () => {
  const today = read("src/app/(protected)/today/page.tsx");
  const meetings = read("src/app/(protected)/meetings/page.tsx");
  const sequences = read("src/app/(protected)/sequences/page.tsx");
  has(today, "formatUserFacingText(item.title)");
  has(today, "formatProductDateTime(item.created_at)");
  has(meetings, "formatProductTime(meeting.starts_at)");
  has(sequences, "presentSequenceState");
  assert.doesNotMatch(sequences, /\?\? sequence\.status|step\.label \|\| step\.type/);
});
