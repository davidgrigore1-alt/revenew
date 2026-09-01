import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("A4.4 Meetings remains a truthful preparation surface", () => {
  const page = read("src/app/(protected)/meetings/page.tsx");

  assert.match(page, /RecordSummaryBar/);
  assert.match(page, /Ora a trecut/);
  assert.match(page, /ora trecută nu confirmă participarea sau un rezultat comercial/);
  assert.match(page, /Pregătește brief/);
  assert.match(page, /Pregătește follow-up/);
  assert.match(page, /&meeting=\$\{encodeURIComponent\(\s*meeting\.id,?\s*\)\}/s);
  assert.doesNotMatch(page, /participare confirmată|rezultat confirmat/i);
});

test("A4.4 Sequences exposes controlled steps, enrollment and truthful sending", () => {
  const page = read("src/app/(protected)/sequences/page.tsx");
  const builder = read("src/components/communication/SequenceStepBuilder.tsx");

  assert.match(page, /RecordSummaryBar/);
  assert.match(page, /Pașii secvenței/);
  assert.match(page, /Confirmă înrolarea/);
  assert.match(page, /Activează pregătirea/);
  assert.match(page, /nu le trimite autonom/);
  assert.match(builder, /mode: "prepare_only"/);
  assert.match(builder, /Doar pregătire/);
  assert.doesNotMatch(page, /rată de conversie|contactat automat/i);
});

test("A4.4 Workflow registry communicates state, trigger, control and audit", () => {
  const page = read("src/app/(protected)/workflows/page.tsx");

  assert.match(page, /RecordSummaryBar/);
  assert.match(page, /Când · \{presentWorkflowTrigger/);
  assert.match(page, /Control · \{workflowTriggerCapability/);
  assert.match(page, /Acțiunile externe rămân sub control uman/);
  assert.match(page, /Istoric de evaluare/);
  assert.match(page, /Test · /);
});

test("A4.4 Workflow editor stays linear, content-driven and explicit about test effects", () => {
  const page = read("src/app/(protected)/workflows/[workflowId]/page.tsx");
  const builder = read("src/components/workflows/WorkflowBuilder.tsx");

  assert.match(builder, /Când · Declanșator/);
  assert.match(builder, /Dacă · Condiție/);
  assert.match(builder, /ReveNew verifică · Gard comercial/);
  assert.match(builder, /Atunci · Acțiunea/);
  assert.match(builder, /Testează fără mutații/);
  assert.match(builder, /Emailurile nu sunt trimise automat/);
  assert.match(builder, /xl:max-h-\[min\(43rem,calc\(100dvh-12rem\)\)\]/);
  assert.doesNotMatch(builder, /min-h-\[660px\]/);
  assert.match(page, /Nicio acțiune nu a fost executată în acest test/);
  assert.match(page, /efectele confirmate sunt păstrate/);
});
