import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("first-run guide explains the complete ReveNew flow and stays optional", () => {
  const tour = read("src/components/guidance/GuidedProductTour.tsx");
  const flow = read("src/components/guidance/ReveNewFlowMap.tsx");

  assert.match(flow, /label: "Semnal"[\s\S]*label: "Dovezi"[\s\S]*label: "Recomandare"[\s\S]*full: "Decizie umană"[\s\S]*full: "Acțiune sigură"[\s\S]*label: "Audit \/ Pilot"/);
  assert.match(tour, /Începe turul/);
  assert.match(tour, /Sari peste/);
  assert.match(tour, /Revizuiește mai târziu/);
  assert.match(tour, /Continuă/);
  assert.match(tour, /Începe în Dashboard/);
  assert.match(tour, /window\.localStorage\.setItem/);
  assert.match(tour, /role="dialog"/);
  assert.match(tour, /aria-modal="true"/);
});

test("guide makes AI assistance evidence-led and explicitly non-automatic", () => {
  const tour = read("src/components/guidance/GuidedProductTour.tsx");
  const guidance = read("src/components/guidance/ContextualPageGuide.tsx");
  const buyerCopy = `${tour}\n${guidance}`;

  assert.match(tour, /AI-ul structurează și explică\. Nu execută\./);
  assert.match(tour, /nu trimit mesaje automat/);
  assert.match(guidance, /AI-ul explică; echipa decide și execută\./);
  assert.match(guidance, /Nimic nu este trimis automat\./);
  assert.match(guidance, /Fără ROI garantat sau recuperare automată/);
  assert.doesNotMatch(buyerCopy, /garantează venit|recuperează automat|ROI de \d/i);
  assert.doesNotMatch(buyerCopy, /Gmail|Google Calendar|receptionist|voice/i);
});

test("contextual guidance covers the buyer journey routes", () => {
  const guidance = read("src/components/guidance/ContextualPageGuide.tsx");

  for (const route of ["/dashboard", "/ai", "/inbox", "/today", "/approvals", "/recoverable", "/opportunities/", "/reports"]) {
    assert.match(guidance, new RegExp(route.replaceAll("/", "\\/")));
  }

  assert.match(guidance, /Începe cu decizia critică/);
  assert.match(guidance, /Lista de execuție, nu încă un dashboard/);
  assert.match(guidance, /Aprobarea rămâne la echipă/);
  assert.match(guidance, /Estimarea rămâne separată de venitul confirmat/);
  assert.match(guidance, /Fără ROI garantat sau recuperare automată/);
});

test("shared shell exposes first-run and replay guidance without changing server persistence", () => {
  const shell = read("src/components/dashboard/AppShell.tsx");
  const header = read("src/components/dashboard/AppHeader.tsx");
  const pageShell = read("src/components/dashboard/PageShell.tsx");
  const help = read("src/app/(protected)/help/page.tsx");

  assert.match(shell, /<GuidedProductTour \/>/);
  assert.match(header, /<AssistantButton/);
  assert.match(shell, /<ContextualAssistant \/>/);
  assert.match(pageShell, /<ContextualPageGuide/);
  assert.match(help, /<GuideReplayButton \/>/);
  assert.match(help, /<ReveNewFlowMap/);
  assert.doesNotMatch(shell + header + pageShell, /supabase|server action|database/i);
});

test("dashboard guidance preserves visible estimated and confirmed financial indicators", () => {
  const dashboard = read("src/app/(protected)/dashboard/page.tsx");
  const brief = read("src/components/dashboard/ExecutiveMorningBrief.tsx");
  assert.match(dashboard, /<ContextualPageGuide showFlow \/>/);
  assert.match(dashboard, /Potențial urmărit · RON/);
  assert.match(dashboard, /Câștigat confirmat · Luna curentă/);
  assert.match(dashboard, /Estimare activă; nu este venit confirmat/);
  assert.match(brief, /valoare estimată, neconfirmată/);
});
