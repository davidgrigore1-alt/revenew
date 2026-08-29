import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

test("opportunity exposes semantic URL tabs and renders only the active panel", () => {
  const page = read("src/app/(protected)/opportunities/[id]/page.tsx");
  const timeline = read("src/components/opportunities/OpportunityIntelligenceTimeline.tsx");
  const workflow = read("src/components/opportunities/OpportunityWorkflow.tsx");
  const sidebar = read("src/lib/navigation.ts");

  for (const destination of ["Context", "Responsabilitate", "Răspuns", "Programează", "Istoric", "Flux"]) {
    assert.match(page, new RegExp(destination));
  }
  assert.match(page, /href=\{`\?tab=\$\{tab\.id\}`\}/);
  assert.match(page, /activeTab === "context"/);
  assert.match(page, /activeTab === "history"/);
  assert.match(page, /\{ id: "history", label: "Semnale" \}/);
  assert.match(page, /Istoricul verificabil rămâne disponibil în Context/);
  assert.match(page, /activeTab === "workflow"/);
  assert.doesNotMatch(page, /target:block|className="hidden scroll-mt-24|\border-\d+|flex-row-reverse/);
  assert.match(timeline, /id="opportunity-timeline"/);
  assert.match(timeline, /Istoric comercial/);
  assert.match(timeline, /Fapte înregistrate și interpretări cu momentul evaluării explicit/);
  assert.match(timeline, /tabIndex=\{-1\}/);
  assert.match(page, /aria-label="Secțiunile oportunității"/);
  assert.doesNotMatch(sidebar, /name: "(?:Timeline|Istoric comercial|Memorie companie|Ask Company)"/);
});

test("intelligence hierarchy is Ask then Discover then Decide", () => {
  const page = read("src/app/(protected)/ai/page.tsx");
  const askIndex = page.indexOf("<AskReveNew ");
  const discoveryIndex = page.indexOf("<CommercialDiscoveries");
  const passiveIndex = page.indexOf('data-guide-anchor="ai-recommendation"');
  const recommendationIndex = page.indexOf('aria-labelledby="operational-recommendations"');

  assert.ok(askIndex > 0);
  assert.ok(discoveryIndex > askIndex);
  assert.ok(passiveIndex > discoveryIndex);
  assert.ok(recommendationIndex > passiveIndex);
  assert.match(read("src/components/intelligence/CopilotConversation.tsx"), /Ce oportunități nu au următor pas/);
  assert.match(read("src/components/intelligence/CommercialDiscoveries.tsx"), /Descoperiri comerciale/);
});

test("contextual explanations cover the product map and explain Companies specifically", () => {
  const help = read("src/lib/contextual-help.ts");
  const assistant = read("src/components/guidance/ContextualAssistant.tsx");
  const companies = read("src/app/(protected)/companies/page.tsx");

  for (const route of ["/dashboard", "/today", "/inbox", "/approvals", "/opportunities", "/recoverable", "/pipeline", "/ai", "/companies", "/crm/organizations", "/contacts", "/outreach", "/reports", "/audit/start", "/settings", "/help"]) {
    assert.match(help, new RegExp(`routes: \\[\\"${route.replaceAll("/", "\\/")}`));
  }
  assert.match(help, /registrul organizațiilor comerciale din spațiul de lucru/);
  assert.match(help, /punctul de intrare către contextul și istoricul unei organizații/);
  assert.match(help, /currentActionLabel: "Arată companiile"/);
  assert.match(companies, /data-guide-anchor="companies-register"/);
  assert.match(assistant, /<CopilotConversation\b[^\n]*\bautoFocus\b/);
  assert.match(read("src/lib/ai/copilot-tools.ts"), /get_product_help/);
});

test("core record registries use native tables and compact operational disclosures", () => {
  const crm = read("src/components/crm/CrmWorkspaceClient.tsx");
  const opportunities = read("src/components/opportunities/OpportunitiesExplorer.tsx");
  const filters = read("src/components/filters/OpportunityFilters.tsx");
  const savedViews = read("src/components/filters/SavedViewControls.tsx");

  for (const registry of [crm, opportunities]) {
    assert.match(registry, /<table[\s\S]*?<caption[\s\S]*?<thead[\s\S]*?<tbody/);
    assert.match(registry, /<th scope="col"/);
    assert.doesNotMatch(registry, /role="row"/);
  }

  assert.match(crm, /<Link href=\{`\/crm\/organizations\/\$\{organization\.id\}`\}/);
  assert.match(opportunities, /<Link href=\{"\/opportunities\/" \+ opportunity\.id\}/);
  assert.match(filters, /<form method="get"/);
  assert.match(filters, /<details[\s\S]*Filtre avansate/);
  assert.match(savedViews, /return <details[\s\S]*Vizualizări private/);
  assert.doesNotMatch(filters + savedViews, /\border-\d+|flex-row-reverse|target:block/);
});
