import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

function compileTs(relativePath, aliases = {}) {
  const filename = path.resolve(relativePath);
  const output = ts.transpileModule(read(relativePath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    Date,
    Intl,
    URL,
    exports: module.exports,
    module,
    require: (id) => aliases[id] ?? require(id)
  }, { filename });
  return module.exports;
}

const domain = compileTs("src/lib/opportunity-domain.ts");
const attention = compileTs("src/lib/opportunity-attention.ts", { "@/lib/opportunity-domain": domain });
const search = compileTs("src/lib/commercial-search.ts", {
  "@/lib/opportunity-attention": attention,
  "@/lib/opportunity-domain": domain
});
const sections = compileTs("src/lib/app-section-search.ts");

function opportunity(overrides = {}) {
  return {
    id: "opportunity-1",
    title: "Extindere Nova Medical",
    type: "manual",
    status: "follow_up_needed",
    lifecycleStatus: "open",
    ownerProfileId: "profile-1",
    ownerName: "Irina Petrescu",
    currency: "RON",
    estimatedValueLow: 38000,
    estimatedValueHigh: 42000,
    city: "București",
    county: "București",
    fitScore: 80,
    urgencyScore: 80,
    moneyScore: 80,
    confidenceScore: 75,
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-07-20T09:00:00.000Z",
    summary: "Ofertă comercială pentru Nova Medical.",
    relevance: [],
    risks: [],
    recommendedAction: "Confirmă următorul pas.",
    rawSourceText: "",
    timeline: [{ id: "event-1", type: "contacted", label: "Contact înregistrat", date: "2026-07-20T09:00:00.000Z" }],
    documents: [],
    contacts: [],
    actions: [{ id: "action-1", title: "Revino cu oferta", description: "", status: "pending", dueDate: "2026-08-01T09:00:00.000Z" }],
    ...overrides
  };
}

test("Romanian query understanding produces bounded structured intents", () => {
  const cases = [
    ["Ce știm despre Nova Medical?", "company_context"],
    ["oportunități fără responsabil", "missing_owner"],
    ["oportunitati fara urmator pas", "missing_next_action"],
    ["follow up-uri restante", "overdue_next_action"],
    ["oportunități fără activitate de 14 zile", "inactivity"],
    ["oferta de 42.000", "amount"],
    ["ce necesită atenție?", "attention"],
    ["Nova Medical", "entity_search"]
  ];
  for (const [query, kind] of cases) assert.equal(search.parseCommercialSearchIntent(query).kind, kind, query);
  assert.equal(search.parseCommercialSearchIntent("fără activitate de 30 zile").inactivityDays, 30);
  const amount = search.parseCommercialSearchIntent("oportunități peste 50.000 RON").amount;
  assert.equal(amount?.operator, "gte");
  assert.equal(amount?.value, 50000);
  assert.equal(amount?.currency, "RON");
  assert.equal(search.parseCommercialSearchIntent("Ce stim despre Nova Medical").entityQuery, "nova medical");
});

test("structured opportunity results explain the match with source-backed evidence", () => {
  const now = new Date("2026-08-17T10:00:00.000Z");
  const missingOwner = opportunity({ ownerProfileId: null, ownerName: null });
  const response = search.executeCommercialSearch(search.parseCommercialSearchIntent("oportunități fără responsabil"), { opportunities: [missingOwner] }, { now });
  assert.equal(response.results.length, 1);
  assert.equal(response.summary, "1 oportunitate nu are un responsabil confirmat.");
  assert.equal(response.results[0].href, "/opportunities/opportunity-1");
  assert.match(response.results[0].reason, /responsabil/i);
  assert.ok(response.results[0].evidence.some((item) => /responsabil/i.test(item.label)));
  assert.match(response.results[0].context, /42\.000 RON/);
  assert.match(response.results[0].context, /nu este venit confirmat/i);
});

test("overdue, inactivity and amount claims stay deterministic", () => {
  const now = new Date("2026-08-17T10:00:00.000Z");
  const item = opportunity();
  const overdue = search.executeCommercialSearch(search.parseCommercialSearchIntent("follow-up restant"), { opportunities: [item] }, { now });
  assert.match(overdue.results[0].evidence[0].label, /01 aug/i);

  const inactive = search.executeCommercialSearch(search.parseCommercialSearchIntent("fără activitate de 14 zile"), { opportunities: [item] }, { now });
  assert.match(inactive.results[0].reason, /28 de zile/i);
  assert.match(inactive.results[0].evidence[0].label, /20 iul/i);

  const amount = search.executeCommercialSearch(search.parseCommercialSearchIntent("oferta 42000 RON"), { opportunities: [item] }, { now });
  assert.equal(amount.results[0].amount, 42000);
  assert.equal(amount.results[0].currency, "RON");
});

test("unknown and incomplete data produce an honest response", () => {
  const response = search.executeCommercialSearch(search.parseCommercialSearchIntent("Companie complet necunoscută"), { records: [] });
  assert.equal(response.results.length, 0);
  assert.equal(response.insufficientData, true);
  assert.match(response.summary, /Nu am suficiente date/i);

  const noTimestamp = opportunity({ createdAt: undefined, updatedAt: undefined, timeline: [] });
  const inactive = search.executeCommercialSearch(search.parseCommercialSearchIntent("fără activitate de 14 zile"), { opportunities: [noTimestamp] });
  assert.equal(inactive.results.length, 0);
  assert.equal(inactive.insufficientData, true);
});

test("untrusted text remains bounded data and cannot select tables or routes", () => {
  const injection = search.parseCommercialSearchIntent("https://evil.example'); drop table opportunities; --");
  assert.equal(injection.kind, "entity_search");
  assert.ok(injection.rawQuery.length <= 160);
  assert.doesNotMatch(JSON.stringify(injection), /href|tableName|sql/i);
  const action = read("src/lib/search/actions.ts");
  assert.match(action, /requirePermission\("workspace\.read"\)/);
  assert.match(action, /getCurrentBusinessForUser\(\{ redirectIfMissing: true \}\)/);
  assert.match(action, /\.eq\("business_id", businessId\)/);
  assert.doesNotMatch(action, /rpc\([^)]*rawQuery|from\(rawQuery|service.role|SUPABASE_SERVICE_ROLE_KEY/i);
});

test("global search aliases and Ask ReveNew UX remain connected to one engine", () => {
  assert.equal(sections.searchAppSections("firme")[0]?.href, "/companies");
  assert.equal(sections.searchAppSections("audit controlat")[0]?.href, "/audit/start");

  const globalSearch = read("src/components/search/GlobalSearch.tsx");
  const ask = read("src/components/intelligence/AskReveNew.tsx");
  const aiPage = read("src/app/(protected)/ai/page.tsx");
  for (const source of [globalSearch, ask]) assert.match(source, /searchWorkspace/);
  assert.match(aiPage, /AskReveNew/);
  assert.match(ask, /Întreabă ReveNew/);
  assert.match(ask, /suggestedCommercialQueries\.map/);
  assert.match(globalSearch, /De ce apare/);
  assert.match(ask, /Dovezi/);
  assert.doesNotMatch(`${globalSearch}\n${ask}`, /Ask anything|ChatGPT|răspuns garantat|ROI garantat/i);
});
