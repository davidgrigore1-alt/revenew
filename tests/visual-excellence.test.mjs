import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

test("landing presents an evidence-led and human-controlled commercial path", () => {
  const landing = read("src/app/(marketing)/page.tsx");
  const visuals = read("src/components/marketing/LandingV3Visuals.tsx");
  const source = `${landing}\n${visuals}`;

  assert.match(landing, /Vezi ce trebuie făcut înainte să pierzi oportunitatea/);
  assert.match(landing, /AI-ul explică\. Echipa decide\./);
  assert.match(source, /Dovadă lângă decizie/);
  assert.match(source, /Control înainte de efect/);
  assert.match(landing, /Estimările rămân separate de venitul confirmat/);
  assert.match(source, /Nu pornește o execuție externă și nu ocolește aprobarea/);
  assert.match(source, /Disponibil acum/);
  assert.match(source, /Disponibil prin implementare/);
  assert.match(source, /Un logo din ecosistem nu înseamnă automat că integrarea este deja activă/);
  assert.doesNotMatch(source, /ROI garantat|venit garantat|recuperare automată|Inteligență AI/i);
  assert.doesNotMatch(source, /live Gmail|live Google Calendar|voce activă/i);
});

test("landing workflow and relationship visuals preserve visible human-controlled semantics", () => {
  const landing = read("src/app/(marketing)/page.tsx");
  const visuals = read("src/components/marketing/LandingV3Visuals.tsx");
  const globals = read("src/app/globals.css");

  assert.match(landing, /SectionHeading compact eyebrow="Procese repetabile"/);
  assert.match(visuals, /Construcția workflow-ului/);
  assert.match(visuals, /Follow-up depășit/);
  assert.match(visuals, /Revizuire necesară/);
  assert.match(visuals, /Pregătește revenirea/);
  assert.match(visuals, /Solicită context/);
  assert.match(visuals, /Pregătit pentru revizuire · neexecutat/);
  assert.match(visuals, /Patru relații verificate converg într-o singură decizie/);
  assert.match(visuals, /Relație → context → decizie/);
  assert.match(globals, /landing-v3-workflow-connectors/);
  assert.match(globals, /landing-v3-workflow-build-node/);
  assert.match(globals, /prefers-reduced-motion: reduce[\s\S]*landing-v3-workflow-build-node/);
  assert.doesNotMatch(visuals, /Email sent|Sequence launched|Automatically executed/);
});

test("visual system keeps the Attio-led foundation restrained while using a branded evidence rail", () => {
  const globals = read("src/app/globals.css");
  const aiPage = read("src/app/(protected)/ai/page.tsx");

  assert.match(globals, /Controlled accent roles/);
  assert.match(globals, /--rn-accent-500: 76 151 129/);
  assert.match(globals, /--focus-ring: var\(--rn-accent-ring\)/);
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
  assert.match(dashboard, /HomeAskSurface/);
  assert.doesNotMatch(dashboard, /MetricCard|venit confirmat|valoare estimată/i);
  assert.match(reports, /aprobare umană|control uman/i);
  assert.doesNotMatch(reports, /ROI garantat|venit garantat|recuperare automată/i);
});
