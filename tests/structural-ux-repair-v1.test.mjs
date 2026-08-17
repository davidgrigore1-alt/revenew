import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

test("opportunity exposes compact contextual navigation and a discoverable commercial history", () => {
  const page = read("src/app/(protected)/opportunities/[id]/page.tsx");
  const navigation = read("src/components/opportunities/OpportunityContextNavigation.tsx");
  const timeline = read("src/components/opportunities/OpportunityIntelligenceTimeline.tsx");
  const workflow = read("src/components/opportunities/OpportunityWorkflow.tsx");
  const sidebar = read("src/lib/navigation.ts");

  assert.match(page, /OpportunityContextNavigation showEvidence=/);
  for (const destination of ["Rezumat", "Acțiune", "Istoric", "Documente", "Contacte"]) {
    assert.match(navigation, new RegExp(destination));
  }
  assert.match(navigation, /href: "#opportunity-timeline", label: "Istoric"/);
  assert.match(timeline, /id="opportunity-timeline"/);
  assert.match(timeline, /Istoric comercial/);
  assert.match(timeline, /Fapte înregistrate și interpretări ReveNew în ordine cronologică/);
  assert.match(timeline, /tabIndex=\{-1\}/);
  assert.match(navigation, /target\.focus\(\{ preventScroll: true \}\)/);
  assert.match(navigation, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(workflow, /aria-label="Secțiuni oportunitate"/);
  assert.doesNotMatch(sidebar, /name: "(?:Timeline|Istoric comercial|Memorie companie|Ask Company)"/);
});

test("intelligence hierarchy is Ask then Discover then Decide", () => {
  const page = read("src/app/(protected)/ai/page.tsx");
  const askIndex = page.indexOf("<AskReveNew />");
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
  assert.match(assistant, /CopilotConversation autoFocus/);
  assert.match(read("src/lib/ai/copilot-tools.ts"), /get_product_help/);
});
