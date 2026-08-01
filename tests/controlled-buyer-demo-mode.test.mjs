import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

test("buyer demo remains protected and presents the complete commercial route", () => {
  const page = read("src/app/(protected)/demo/page.tsx");
  const model = read("src/lib/buyer-demo.ts");

  assert.match(page, /requirePermission\("platform\.internal_tools\.access"\)/);
  assert.match(page, /Demo controlat ReveNew/);
  assert.equal((model.match(/id: "/g) ?? []).length, 10);
  for (const route of [
    "/dashboard",
    "/ai",
    "/inbox",
    "/opportunities/de300006-0000-4000-8000-000000000006",
    "/today",
    "/approvals",
    "/reports/revenue-recovery-audit",
    "/reports/enterprise-pilot-pack",
    "/reports/pilot-proof-of-value"
  ]) assert.match(model, new RegExp(route.replaceAll("/", "\\/")));
});

test("every demo step contains a buyer question and a concise presentation purpose", () => {
  const model = read("src/lib/buyer-demo.ts");

  assert.equal((model.match(/buyerQuestion: "/g) ?? []).length, 10);
  assert.equal((model.match(/understanding: "/g) ?? []).length, 10);
  assert.equal((model.match(/show: "/g) ?? []).length, 10);
  assert.match(model, /Ce trebuie înțeles|understanding/);
});

test("demo closing preserves controlled-audit and commercial safety boundaries", () => {
  const page = read("src/app/(protected)/demo/page.tsx");
  const model = read("src/lib/buyer-demo.ts");
  const copy = `${page}\n${model}`;

  assert.match(copy, /audit controlat pe 20–50 cazuri comerciale recente/i);
  assert.match(copy, /nu necesită acces complet la inbox/i);
  assert.match(copy, /pot fi anonimizate/i);
  assert.match(copy, /Nicio comunicare externă nu este trimisă automat/i);
  assert.match(copy, /Valoarea estimată nu este venit confirmat/i);
  assert.match(copy, /Decizia umană rămâne obligatorie/i);
  assert.doesNotMatch(copy, /ROI garantat|venit garantat|recuperare automată|Gmail live|Calendar live|voce live|local demo|fixture|workspace|pending|ownership/i);
});

test("demo progress is opt-in, hydration-safe and can stop without covering product content", () => {
  const rail = read("src/components/demo/BuyerDemoRail.tsx");
  const shell = read("src/components/dashboard/AppShell.tsx");

  assert.match(shell, /<BuyerDemoRail \/>/);
  assert.match(rail, /useState\(false\)/);
  assert.match(rail, /useEffect/);
  assert.match(rail, /window\.localStorage\.setItem/);
  assert.match(rail, /window\.localStorage\.removeItem/);
  assert.match(rail, /Oprește/);
  assert.match(rail, /Următorul:/);
  assert.match(rail, /sticky top-0/);
  assert.doesNotMatch(rail, /fixed|absolute inset|createPortal/);
});

test("dashboard and help expose subtle demo entry points while guided understanding remains mounted", () => {
  const dashboard = read("src/app/(protected)/dashboard/page.tsx");
  const help = read("src/app/(protected)/help/page.tsx");
  const shell = read("src/components/dashboard/AppShell.tsx");
  const recommendation = read("src/components/intelligence/RecommendationExplanationCard.tsx");

  assert.match(dashboard, /Pregătește prezentarea/);
  assert.match(help, /Traseu demo/);
  assert.match(help, /GuideReplayButton/);
  assert.match(shell, /GuidedProductTour/);
  assert.match(recommendation, /Dovadă/);
  assert.match(recommendation, /Decizie umană necesară/);
});
