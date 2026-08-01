import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

test("reusable explanation card exposes evidence, uncertainty, safe action and human control", () => {
  const card = read("src/components/intelligence/RecommendationExplanationCard.tsx");

  assert.match(card, /Recomandare explicată/);
  assert.match(card, /De ce contează acum/);
  assert.match(card, /Dovadă/);
  assert.match(card, /Ce lipsește/);
  assert.match(card, /Acțiune sigură/);
  assert.match(card, /Riscul inacțiunii/);
  assert.match(card, /Presupuneri declarate/);
  assert.match(card, /Decizie umană necesară/);
  assert.match(card, /Nu există execuție externă automată/);
  assert.match(card, /Valoare estimată, neconfirmată/);
  assert.doesNotMatch(card, /ROI garantat|venit garantat|recuperare automată/i);
});

test("AI center and opportunity detail reuse the explanation component", () => {
  const ai = read("src/app/(protected)/ai/page.tsx");
  const opportunity = read("src/app/(protected)/opportunities/[id]/page.tsx");

  assert.match(ai, /RecommendationExplanationCard/);
  assert.match(opportunity, /buildOperationalRecommendation/);
  assert.match(opportunity, /RecommendationExplanationCard/);
  assert.match(opportunity, /buildWorkspaceDecisionQueue/);
});

test("dashboard, inbox and today expose decision-quality context without new automation", () => {
  const dashboard = read("src/components/dashboard/ExecutiveMorningBrief.tsx");
  const preparation = read("src/components/signals/SignalPreparationPanel.tsx");
  const today = read("src/components/dashboard/TodayActionCard.tsx");

  assert.match(dashboard, /De ce acum:/);
  assert.match(dashboard, /Forța dovezilor:/);
  assert.match(dashboard, /Ce lipsește:/);
  assert.match(preparation, /evidenceStrengthLabel/);
  assert.match(preparation, /Riscul inacțiunii/);
  assert.match(preparation, /Necesită verificare și decizie umană/);
  assert.match(today, /Dovadă · termen înregistrat/);
});

test("reports and approvals preserve estimated-value and human-control boundaries", () => {
  const approvals = read("src/app/(protected)/approvals/page.tsx") + read("src/components/approvals/ApprovalCenterClient.tsx");
  const audit = read("src/app/(protected)/reports/revenue-recovery-audit/page.tsx");
  const pilot = read("src/app/(protected)/reports/enterprise-pilot-pack/page.tsx");

  assert.match(approvals, /aprobare|decizie umană/i);
  assert.match(approvals, /Nu se aplică și nu se trimite nimic fără aprobare|Nimic nu este trimis extern/i);
  assert.match(audit, /estimat|neconfirmat|venit confirmat/i);
  assert.match(pilot, /control uman|decizie umană|aprobare umană/i);
  assert.doesNotMatch(`${audit}\n${pilot}`, /ROI garantat|venit garantat|recuperare automată/i);
});
