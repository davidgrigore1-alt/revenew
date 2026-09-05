import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";

const code = ts.transpileModule(fs.readFileSync("src/app/(protected)/ai/page.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
}).outputText;
function pageHarness(failure) {
  let reads = 0;
  const empty = () => ({ state: "unavailable", estimatedExposedValueByCurrency: [], recommendations: [], safeActionHref: "/inbox", safeActionLabel: "Verifică sursele" });
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, console: { error() {} },
    require(id) {
      if (id === "react/jsx-runtime") return jsx;
      if (id === "@/lib/recovery") return { getRecoverySummary: async () => { reads++; if (failure) throw failure; return { opportunities: [], signals: [] }; } };
      if (id === "@/lib/ai-capabilities") return { aiCapabilities: [] };
      if (id === "@/lib/operational-intelligence") return { buildOperationalIntelligenceCenter: empty, unavailableOperationalIntelligence: empty };
      if (id === "@/lib/commercial-opportunity-discovery") return { discoverCommercialOpportunityCandidates: () => ({ state: "insufficient_data", candidates: [] }) };
      if (id === "@/lib/workspace-decision-queue") return { buildWorkspaceDecisionQueue: () => ({}) };
      if (id.includes("redirect-error")) return { isRedirectError: e => e.redirect === true };
      return new Proxy({}, { get: (_, name) => String(name) });
    }
  });
  return { page: module.exports.default, reads: () => reads };
}
function nodes(value) {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object") return [];
  return [value, ...nodes(value.props?.children)];
}
for (const tab of ["ask", "discoveries", "recommendations", "capabilities", "unknown"]) {
  test(`URL tab ${tab} renders exactly its own section and selected link`, async () => {
    const harness = pageHarness();
    const tree = nodes(await harness.page({ searchParams: Promise.resolve({ tab }) }));
    const expected = tab === "unknown" ? "ask" : tab;
    const selected = tree.filter(n => n.props?.["aria-current"] === "page");
    assert.equal(selected.length, 1);
    assert.equal(selected[0].props.href, `/ai?tab=${expected}`);
    assert.equal(tree.some(n => n.type === "AskReveNew"), expected === "ask");
    assert.equal(tree.some(n => n.type === "CommercialDiscoveries"), expected === "discoveries");
    assert.equal(tree.some(n => n.props?.["aria-labelledby"] === "operational-recommendations"), expected === "recommendations");
    assert.equal(tree.some(n => n.props?.["aria-labelledby"] === "ai-governance-title"), expected === "capabilities");
    assert.equal(harness.reads(), ["recommendations", "discoveries"].includes(expected) ? 1 : 0);
  });
}
test("discovery load failure remains an error, not empty results", async () => {
  const harness = pageHarness(new Error("unavailable"));
  const tree = nodes(await harness.page({ searchParams: Promise.resolve({ tab: "discoveries" }) }));
  assert.equal(tree.find(n => n.type === "CommercialDiscoveries").props.error, true);
});
test("recommendation authorization redirects are preserved", async () => {
  const failure = Object.assign(new Error("redirect"), { redirect: true });
  const harness = pageHarness(failure);
  await assert.rejects(harness.page({ searchParams: Promise.resolve({ tab: "recommendations" }) }), e => e === failure);
});

test("a cancelled response cannot replace a newer answer or stop its loading state", async () => {
  const source = fs.readFileSync("src/components/intelligence/CopilotConversation.tsx", "utf8");
  const askSource = source.slice(source.indexOf("  async function ask("), source.indexOf("  function submit("));
  const deferred = [];
  const scope = {
    loading: false, abortRef: { current: null }, conversation: [], context: {}, selection: undefined,
    AbortController, Date,
    setQuestion() {}, setError() {}, setPrepareReview() {}, setSelection() {},
    setLoading(value) { scope.loading = value; },
    setConversation(update) { scope.conversation = update(scope.conversation); },
    fetch: async () => ({ ok: true, json: () => new Promise(resolve => deferred.push(resolve)) })
  };
  vm.createContext(scope);
  vm.runInContext(ts.transpileModule(askSource + "\nthis.ask = ask;", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 }
  }).outputText, scope);
  const oldRequest = scope.ask("Old question");
  await new Promise(setImmediate);
  scope.abortRef.current.abort();
  scope.abortRef.current = null;
  scope.loading = false;
  const currentRequest = scope.ask("Current question");
  await new Promise(setImmediate);
  deferred[0]({ answer: "stale" });
  await oldRequest;
  assert.equal(scope.loading, true);
  assert.equal(scope.conversation.length, 0);
  deferred[1]({ answer: "current" });
  await currentRequest;
  assert.equal(scope.loading, false);
  assert.equal(scope.conversation.length, 1);
  assert.equal(scope.conversation[0].answer.answer, "current");
});
