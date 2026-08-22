import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

test("dashboard keeps financial semantics in contextual work rows without restoring a KPI wall", () => {
  const dashboard = read("src/app/(protected)/dashboard/page.tsx");
  const brief = read("src/components/dashboard/ExecutiveMorningBrief.tsx");
  const todayAction = read("src/components/dashboard/TodayActionCard.tsx");

  assert.match(dashboard, /<HomeAskSurface/);
  assert.match(dashboard, /home-today-title/);
  assert.match(dashboard, /home-recent-title/);
  assert.doesNotMatch(dashboard, /Potențial urmărit · RON|Câștigat confirmat · Luna curentă|activePipelineValue|confirmedRevenueRon/);
  assert.match(todayAction, /Valoare estimată, neconfirmată/);
  assert.match(brief, /valoare estimată, neconfirmată/);
  assert.doesNotMatch(brief, /pipelineValueRon|confirmedRevenueRon/);
  assert.match(brief, /primaryPriority/);
});

test("Inbox keeps compact operational intelligence inside the selected detail before its review fields", () => {
  const inbox = read("src/components/inbox/CommercialInboxClient.tsx");
  const panel = read("src/components/signals/SignalPreparationPanel.tsx");
  const panelIndex = inbox.indexOf("<SignalPreparationPanel");
  const essentialIndex = inbox.indexOf('id="signal-essential-title"');
  const listIndex = inbox.indexOf('id="signal-list-title"');
  const detailIndex = inbox.indexOf('id="signal-review-panel"');

  assert.ok(panelIndex > 0 && panelIndex < essentialIndex);
  assert.ok(listIndex > 0 && listIndex < detailIndex && detailIndex < panelIndex);
  assert.doesNotMatch(inbox, /signal-intelligence-spotlight|Fluxul de la semnal la oportunitate|Rezumat Inbox Comercial/);
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
  assert.match(panel, /<details open/);
  assert.match(panel, /Context pentru decizie/);
  assert.match(panel, /Dovezi, riscuri și informații lipsă/);
  assert.match(panel, /Dovezi din semnal/);
  assert.match(panel, /Riscuri \/ neclarități/);
  assert.match(panel, /Informații lipsă/);
  assert.match(panel, /Nimic nu este trimis extern/);
});

test("mobile execution surfaces keep precise actions and responsibility visible", () => {
  const today = read("src/components/dashboard/TodayActionCard.tsx");
  const opportunity = read("src/components/opportunities/OpportunityControlCenter.tsx");
  const access = read("src/app/(account)/access/page.tsx");

  assert.match(today, /Revizuiește acțiunea/);
  assert.doesNotMatch(today, />\s*Deschide\s*</);
  assert.match(opportunity, />Responsabil<\/dt><dd[^>]*>\{ownerName \?\? "Neatribuit"\}/);
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
  assert.match(opportunity, /Necesită verificare:/);
  assert.match(opportunity, /attention\.reasons\.slice\(0, 2\)/);
  assert.match(approvals, /Nimic nu este trimis extern/);
  assert.match(ai, /Vezi de ce/);
  assert.doesNotMatch(surfaces, /Inteligență AI|ROI garantat|venit garantat|recuperare automată/i);
  assert.doesNotMatch(surfaces, /live Gmail|live Google Calendar|voce activă/i);
});
