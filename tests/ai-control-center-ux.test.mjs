import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const nodeRequire = createRequire(import.meta.url);
const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

function loadTsModule(relativePath) {
  const filename = path.resolve(relativePath);
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, module, require: nodeRequire }, { filename });
  return module.exports;
}

test("AI Control Center is protected by the existing app shell and derives claims from the capability registry", () => {
  const page = read("src/app/(protected)/ai/page.tsx");
  const layout = read("src/app/(protected)/layout.tsx");

  assert.match(page, /aiCapabilities/);
  assert.match(page, /Inteligență operațională/);
  assert.match(page, /Capabilitate disponibilă intern/);
  assert.match(page, /Mediu demonstrativ/);
  assert.match(page, /Blocat până la revizuire de securitate/);
  assert.match(page, /Niciunul/);
  assert.match(page, /Aprobare necesară/);
  assert.match(page, /Indisponibil în versiunea curentă/);
  assert.match(page, /nu promite disponibilitate viitoare/i);
  assert.match(layout, /requireActivePaidAccess/);
});

test("sidebar exposes one permission-aware AI route and active-route mapping remains stable", () => {
  const navigation = read("src/lib/navigation.ts");
  assert.equal((navigation.match(/href: "\/ai"/g) ?? []).length, 1);
  assert.match(navigation, /name: "Inteligență operațională".+permission: "dashboard\.read"/);
  const { groupNavigationItems, primaryNavigation } = loadTsModule("src/lib/navigation.ts");
  const home = groupNavigationItems(primaryNavigation).find((group) => group.id === "home");
  assert.equal(home.items[1].href, "/ai");
});

test("reusable toast feedback is bounded, accessible and provides precise safe routes", () => {
  const provider = read("src/components/ui/ToastProvider.tsx");
  const workflow = read("src/components/opportunities/OpportunityWorkflow.tsx");
  const approvals = read("src/components/approvals/ApprovalCenterClient.tsx");

  assert.match(provider, /aria-live="polite"/);
  assert.match(provider, /items\.slice\(-2\)/);
  assert.match(provider, /Închide notificarea/);
  assert.match(workflow, /Deschide Activitatea mea/);
  assert.match(approvals, /Revizuiește oportunitatea/);
});

test("raw permission and database failures become operational messages", () => {
  const { toUserFacingActionError } = loadTsModule("src/lib/user-facing-errors.ts");
  assert.match(toUserFacingActionError({ code: "42501", message: "permission denied for table secrets" }), /Nu ai permisiunea necesară/);
  assert.match(toUserFacingActionError({ code: "23505", message: "duplicate key value" }), /există deja/);
  assert.doesNotMatch(toUserFacingActionError({ code: "42501", message: "permission denied for table secrets" }), /secrets|42501/);
  assert.doesNotMatch(toUserFacingActionError("relation internal_events does not exist", "relation internal_events does not exist"), /internal_events|relation/);
});

test("input guidance distinguishes required context from optional execution data", () => {
  const inbox = read("src/app/(protected)/inbox/page.tsx");
  const inboxClient = read("src/components/inbox/CommercialInboxClient.tsx");
  const importPage = read("src/app/(protected)/inbox/import/page.tsx");

  assert.match(inbox, /<CommercialInboxClient/);
  assert.match(inboxClient, /required \? "Obligatoriu" : "Opțional"/);
  assert.match(inboxClient, /Păstrează proveniența dovezii/);
  assert.doesNotMatch(inboxClient, /ownership/i);
  assert.match(importPage, /Opțional, dar util:/);
  assert.match(importPage, /importul nu aprobă oportunități/);
});

test("access surface uses the warm palette and keeps activation safety explicit", () => {
  const access = read("src/app/(account)/access/page.tsx");
  const pricing = read("src/components/access/PricingCard.tsx");

  assert.doesNotMatch(access, /#12b981|#087354|Workspace|ownership/);
  assert.doesNotMatch(access, /Mediu local de testare|Mod de testare activ|Acces local de testare/);
  assert.doesNotMatch(access, /server-side/i);
  assert.doesNotMatch(pricing, /#12b981/);
  assert.match(access, /nu inițiază plăți și nu creează abonamente/i);
  assert.match(access, /Nicio opțiune nu promite rezultate garantate/);
});

test("acceptance copy removes technical English from the verified Romanian surfaces", () => {
  const approvals = read("src/app/(protected)/approvals/page.tsx");
  const appointmentPage = read("src/app/(protected)/demo/appointment-control/page.tsx");
  const appointmentSandbox = read("src/components/demo/AppointmentControlSandbox.tsx");
  const toast = read("src/components/ui/ToastProvider.tsx");

  assert.doesNotMatch(approvals, /description="[^"]*workspace/i);
  assert.doesNotMatch(appointmentPage, /fixture|Appointment Control/i);
  assert.doesNotMatch(appointmentSandbox, />[^<{]*fixture|fixture[^>}]*</i);
  assert.match(appointmentPage, /Controlul programărilor ReveNew/);
  assert.match(toast, /success: "text-\[rgb\(var\(--success-text\)\)\]"/);
});
