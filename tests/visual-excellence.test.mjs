import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

test("landing presents an evidence-led and human-controlled commercial path", () => {
  const landing = read("src/app/(marketing)/page.tsx");

  assert.match(landing, /Vezi unde se blochează venitul/);
  assert.match(landing, /Inteligență operațională/);
  assert.match(landing, /Dovezi verificabile/);
  assert.match(landing, /Aprobare umană/);
  assert.match(landing, /Valoare estimată, nu venit confirmat/);
  assert.match(landing, /Nu trimite mesaje, nu execută acțiuni externe/);
  assert.match(landing, /Audit de recuperare venituri/);
  assert.match(landing, /Pilot controlat · 14 zile/);
  assert.match(landing, /Proof-of-value/);
  assert.match(landing, /20–50 de cazuri comerciale/);
  assert.match(landing, /date anonimizate/);
  assert.doesNotMatch(landing, /ROI garantat|venit garantat|recuperare automată|Inteligență AI/i);
  assert.doesNotMatch(landing, /live Gmail|live Google Calendar|voce activă/i);
});

test("visual system keeps Champagne Gold as the restrained default and an explicit evidence rail", () => {
  const globals = read("src/app/globals.css");
  const aiPage = read("src/app/(protected)/ai/page.tsx");

  assert.match(globals, /Controlled accent roles/);
  assert.match(globals, /--rn-accent-500: 214 183 74/);
  assert.match(globals, /--brand-500: var\(--rn-accent-500\)/);
  assert.match(globals, /\.ai-evidence-rail/);
  assert.match(aiPage, /ai-evidence-rail/);
  assert.match(aiPage, /Vezi de ce/);
  assert.match(aiPage, /Verifică dovada/);
  assert.match(aiPage, /Nicio comunicare externă nu este trimisă automat/);
});

test("access and core buyer surfaces retain safe Romanian copy", () => {
  const access = read("src/app/(account)/access/page.tsx");
  const dashboard = read("src/app/(protected)/dashboard/page.tsx");
  const reports = [
    read("src/app/(protected)/reports/revenue-recovery-audit/page.tsx"),
    read("src/app/(protected)/reports/enterprise-pilot-pack/page.tsx"),
    read("src/app/(protected)/reports/pilot-proof-of-value/page.tsx")
  ].join("\n");

  assert.doesNotMatch(access, /Workspace|ownership|pending/i);
  assert.match(access, /Nicio opțiune nu promite rezultate garantate/);
  assert.match(dashboard, /nu este venit confirmat/i);
  assert.match(reports, /aprobare umană|control uman/i);
  assert.doesNotMatch(reports, /ROI garantat|venit garantat|recuperare automată/i);
});
