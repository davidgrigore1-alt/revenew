import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const code = ts.transpileModule(fs.readFileSync("src/components/outreach/FollowUpStudio.tsx", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;

function harness() {
  const state = [], refs = [];
  let cursor = 0, refCursor = 0;
  const calls = [];
  let releaseSend;
  const readiness = { ready: true, revisionMatches: true, mode: "test", recipient: "fixture@example.invalid", checks: [] };
  const actions = {
    async openFollowUpSendConfirmation(id) { calls.push(["readiness", id]); return { readiness }; },
    async getFollowUpSendReadiness() { return readiness; },
    async sendApprovedFollowUp(...args) { calls.push(["send", ...args]); await new Promise(resolve => { releaseSend = resolve; }); return { ok: true, status: "test_completed" }; }
  };
  const react = {
    ...require("react"),
    useState(initial) { const key = cursor++; if (!(key in state)) state[key] = initial; return [state[key], value => { state[key] = typeof value === "function" ? value(state[key]) : value; }]; },
    useMemo(fn) { return fn(); },
    useRef(value) { const key = refCursor++; return refs[key] ??= { current: value }; }
  };
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: id => {
    if (id === "react") return react;
    if (id === "next/link") return "a";
    if (id === "@/components/ui/Modal") return { Dialog: "test-dialog" };
    if (id === "@/components/ui/Button") return { Button: "test-button" };
    if (id === "@/lib/actions") return { updateGeneratedDocument: () => { throw new Error("unexpected mutation"); } };
    if (id === "@/lib/follow-up-send-actions") return actions;
    if (id === "@/lib/follow-up-studio") return { assessFollowUpDraft: () => ({ missingInformation: [], warnings: [] }), followUpStatusLabels: { approved: "Aprobat" } };
    if (id === "@/lib/utils") return { formatDateTimeWithSeconds: String };
    return require(id);
  }});
  const props = { initialDraft: { id: "draft-1", subject: "Subiect", body: "Mesaj", status: "approved" }, timeline: [], initialReadiness: readiness };
  return { calls, render() { cursor = 0; refCursor = 0; return module.exports.FollowUpStudio(props); }, release() { releaseSend(); } };
}
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join("");
  if (node && typeof node === "object") return text(node.props?.children);
  return typeof node === "string" ? node : "";
}
function action(tree, label) { return nodes(tree).find(node => ["button", "test-button"].includes(node.type) && text(node) === label); }

test("opening and dismissing the actual Studio confirmation never execute a send", async () => {
  const h = harness();
  await action(h.render(), "Verifică și confirmă trimiterea").props.onClick();
  const dialog = nodes(h.render()).find(node => node.type === "test-dialog");
  assert.equal(dialog.props.labelledBy, "send-confirmation-title");
  assert.equal(dialog.props.describedBy, "send-confirmation-description");
  assert.notEqual(dialog.props.closeOnBackdrop, true);
  assert.deepEqual(h.calls, [["readiness", "draft-1"]]);
  dialog.props.onClose();
  assert.equal(nodes(h.render()).some(node => node.type === "test-dialog"), false);
  assert.equal(h.calls.some(call => call[0] === "send"), false);
  await action(h.render(), "Verifică și confirmă trimiterea").props.onClick();
  action(h.render(), "Renunță").props.onClick();
  assert.equal(h.calls.some(call => call[0] === "send"), false);
});

test("only the final explicit action calls the existing send boundary and becomes disabled/busy", async () => {
  const h = harness();
  await action(h.render(), "Verifică și confirmă trimiterea").props.onClick();
  const pending = action(h.render(), "Confirm explicit").props.onClick();
  assert.deepEqual(h.calls.filter(call => call[0] === "send"), [["send", "draft-1", true]]);
  const busy = action(h.render(), "Confirm explicit");
  assert.equal(busy.props.disabled, true);
  assert.equal(busy.props.loading, true);
  h.release(); await pending;
  assert.equal(nodes(h.render()).some(node => node.type === "test-dialog"), false);
});
