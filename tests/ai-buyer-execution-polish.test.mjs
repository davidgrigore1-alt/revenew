import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

test("dashboard keeps essential financial values visible and clearly separated", () => {
  const dashboard = read("src/app/(protected)/dashboard/page.tsx");
  const brief = read("src/components/dashboard/ExecutiveMorningBrief.tsx");

  assert.match(dashboard, /Indicatori financiari esențiali/);
  assert.match(dashboard, /Valoare estimată în pipeline · RON/);
  assert.match(dashboard, /Venit confirmat · RON/);
  assert.match(dashboard, /summary\.metrics\.activePipelineValue/);
  assert.match(dashboard, /responseLoop\.confirmedRevenueRon/);
  assert.match(dashboard, /pipelineValueRon=\{summary\.metrics\.activePipelineValue\}/);
  assert.match(dashboard, /confirmedRevenueRon=\{responseLoop\.confirmedRevenueRon\}/);
  assert.match(brief, /Valoare estimată expusă:/);
  assert.match(brief, /aria-label="Indicatori financiari esențiali"/);
  assert.match(brief, /nu este venit confirmat/);
  assert.match(brief, /2xl:grid 2xl:grid-cols-3/);
});

test("Inbox places compact operational intelligence before the review forms", () => {
  const inbox = read("src/components/inbox/CommercialInboxClient.tsx");
  const panel = read("src/components/signals/SignalPreparationPanel.tsx");
  const panelIndex = inbox.indexOf("<SignalPreparationPanel");
  const essentialIndex = inbox.indexOf('id="signal-essential-title"');
  const spotlightIndex = inbox.indexOf('id="signal-intelligence-spotlight"');
  const flowIndex = inbox.indexOf('aria-label="Fluxul de la semnal la oportunitate"');

  assert.ok(panelIndex > 0 && panelIndex < essentialIndex);
  assert.ok(spotlightIndex > 0 && spotlightIndex < flowIndex);
  assert.match(inbox, /signal\.analysisStatus === "completed"/);
  assert.match(inbox, /compact/);
  assert.match(panel, /Ce a înțeles ReveNew/);
  assert.match(panel, /Situație/);
  assert.match(panel, /Dovadă/);
  assert.match(panel, /Ce lipsește/);
  assert.match(panel, /Forța dovezilor/);
  assert.match(panel, /De ce acum:/);
  assert.match(panel, /Acțiune sigură recomandată/);
  assert.match(panel, /Valoare estimată, neconfirmată/);
  assert.match(panel, /Detalii de pregătire/);
  assert.match(panel, /Nimic nu este trimis extern/);
});

test("mobile execution surfaces keep precise actions and responsibility visible", () => {
  const today = read("src/components/dashboard/TodayActionCard.tsx");
  const opportunity = read("src/components/opportunities/OpportunityControlCenter.tsx");
  const access = read("src/app/(account)/access/page.tsx");

  assert.match(today, /Revizuiește acțiunea/);
  assert.doesNotMatch(today, />\s*Deschide\s*</);
  assert.match(opportunity, /Responsabil: \{ownerName \?\? "Neatribuit"\}/);
  assert.match(access, /Audit de recuperare venituri/);
});

test("postpone controls are framed, responsive and use clear Romanian choices", () => {
  const inbox = read("src/components/inbox/CommercialInboxClient.tsx");
  const postponeSection = inbox.slice(
    inbox.indexOf("Opțiuni rapide de amânare"),
    inbox.indexOf("Arhivează", inbox.indexOf("Opțiuni rapide de amânare"))
  );

  assert.match(inbox, /choosePostponeWindow/);
  assert.match(inbox, /Opțiuni rapide de amânare/);
  assert.match(inbox, /Amână \{days\}/);
  assert.match(inbox, /Alege termen/);
  assert.match(inbox, /Amână revizuirea/);
  assert.match(inbox, /lg:grid-cols-\[minmax\(0,1fr\)_minmax\(15rem,0\.72fr\)\]/);
  assert.doesNotMatch(postponeSection, /queue ID|provider|pending action/i);
});

test("operational intelligence stays contextual across daily execution", () => {
  const queue = read("src/components/dashboard/WorkspaceDecisionQueue.tsx");
  const today = read("src/components/dashboard/TodayActionCard.tsx");
  const opportunity = read("src/components/opportunities/OpportunityControlCenter.tsx");
  const approvals = read("src/components/approvals/ApprovalCenterClient.tsx");
  const ai = read("src/app/(protected)/ai/page.tsx");
  const surfaces = `${queue}\n${today}\n${opportunity}\n${approvals}\n${ai}`;

  assert.match(queue, /termen, severitate, dovadă și valoare estimată/);
  assert.match(today, /De ce contează acum/);
  assert.match(opportunity, /De ce este prioritară/);
  assert.match(approvals, /Nimic nu este trimis extern/);
  assert.match(ai, /Vezi de ce/);
  assert.doesNotMatch(surfaces, /Inteligență AI|ROI garantat|venit garantat|recuperare automată/i);
  assert.doesNotMatch(surfaces, /live Gmail|live Google Calendar|voce activă/i);
});
