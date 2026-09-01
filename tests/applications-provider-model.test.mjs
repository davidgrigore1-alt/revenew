import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");
function loadModule(file) {
  const code = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports }, { filename: file });
  return module.exports;
}
const model = loadModule("src/lib/integrations/presentation.ts");
const { integrationCatalog } = loadModule("src/lib/integrations/catalog.ts");
const plain = (value) => JSON.parse(JSON.stringify(value));
function fixture() {
  return {
    configured: true,
    connection: {
      id: "fixture-account", email: "owner@example.test", status: "connected",
      gmailStatus: "connected", calendarStatus: "connected",
      connectedAt: "2026-08-01T08:00:00Z", lastSuccessfulSyncAt: "2026-08-27T10:00:00Z",
      gmailLastSyncAt: "2026-08-27T10:00:00Z", calendarLastSyncAt: "2026-08-27T09:59:00Z",
      gmailError: null, calendarError: null, syncing: false,
      capabilities: { gmail: true, calendar: true, emailRead: true, emailSend: false, calendarRead: true, calendarWrite: false },
      counts: { emails: 12, calendarEvents: 2 }, latestRun: null
    }
  };
}
const operations = (state, id) => model.googleCapabilities(state).find((capability) => capability.id === id).operations;

test("Applications catalog has exactly one Google provider and no top-level Google services", () => {
  assert.deepEqual(plain(integrationCatalog.map((item) => item.id)).sort(),
    ["google-workspace", "microsoft-365", "hubspot", "pipedrive", "slack", "salesforce", "docusign", "webhooks-api"].sort());
  const google = integrationCatalog.find((item) => item.id === "google-workspace");
  assert.equal(google.stage, "implemented");
  assert.deepEqual(plain(google.capabilities), ["Gmail", "Calendar", "Drive", "Docs", "Sheets", "Meet"]);
  assert.equal(integrationCatalog.filter((item) => item.stage === "implemented").length, 1);
  assert.equal(google.logoUrl, "/brands/applications/google-symbol.svg");
});

test("Google provider connection does not imply Gmail send or other service authorization", () => {
  const state = fixture();
  assert.equal(model.googleProviderPresentation(state).label, "Conectat");
  assert.equal(operations(state, "gmail")[0].status, "active");
  assert.equal(operations(state, "gmail")[1].status, "requires_authorization");
  state.connection.capabilities.emailSend = true;
  assert.equal(operations(state, "gmail")[1].status, "controlled");
  assert.match(operations(state, "gmail")[1].detail, /Confirmare explicită/);
  state.connection.capabilities.emailRead = false;
  assert.equal(operations(state, "gmail")[0].status, "requires_authorization");
  assert.equal(model.googleContextHealthy(state), false);
});

test("Partial Gmail failure leaves Calendar active and overall health incomplete", () => {
  const state = fixture();
  state.connection.status = "error";
  state.connection.gmailStatus = "error";
  state.connection.gmailError = "provider_timeout";
  assert.equal(operations(state, "gmail")[0].status, "error");
  assert.equal(operations(state, "google-calendar")[0].status, "active");
  assert.equal(model.googleContextHealthy(state), false);
  assert.equal(model.googleProviderPresentation(state).status, "error");
});

test("Disconnected, revoked and unconfigured sources cannot be presented as active", () => {
  for (const status of ["disconnected", "action_required"]) {
    const state = fixture();
    state.connection.status = status;
    state.connection.capabilities.emailSend = true;
    const expected = status === "disconnected" ? "unavailable" : "requires_authorization";
    assert.equal(operations(state, "gmail")[0].status, expected);
    assert.equal(operations(state, "gmail")[1].status, expected);
    assert.equal(operations(state, "google-calendar")[0].status, expected);
    assert.equal(model.googleContextHealthy(state), false);
  }
  const state = fixture();
  state.configured = false;
  assert.equal(operations(state, "gmail")[0].status, "unavailable");
  assert.equal(model.googleProviderPresentation(state).label, "Configurare necesară");
  assert.equal(model.googleProviderPresentation({ configured: true, connection: null }).label, "Neconectat");
});

test("Sync states and authorization-before-sync remain distinct", () => {
  const state = fixture();
  assert.equal(model.googleContextHealthy(state), true);
  state.connection.syncing = true;
  assert.equal(operations(state, "gmail")[0].status, "syncing");
  assert.equal(model.googleProviderPresentation(state).status, "syncing");
  assert.equal(model.googleContextHealthy(state), false);
  state.connection.syncing = false;
  state.connection.gmailStatus = "not_connected";
  assert.equal(operations(state, "gmail")[0].status, "connected");
  assert.equal(model.googleContextHealthy(state), false);
});

test("Drive Docs Sheets require explicit authorization; Meet remains planned", () => {
  for (const state of [fixture(), { configured: false, connection: null }]) {
    for (const id of ["google-drive", "google-docs", "google-sheets"]) {
      assert.equal(operations(state, id)[0].status, "requires_authorization");
    }
    assert.equal(operations(state, "google-meet")[0].status, "planned");
  }
  const state = fixture(); state.connection.capabilities.drive = true;
  assert.equal(operations(state, "google-drive")[0].status, "active");
  for (const id of ["google-docs", "google-sheets"]) {
    assert.equal(operations(state, id)[0].status, "controlled");
    assert.equal(operations(state, id)[0].label, "Disponibil prin Google Drive");
  }
  assert.match(operations(state, "google-sheets")[0].detail, /nu întregul registru/);
});

test("Activity separates retained source counts from the latest real run", () => {
  const state = fixture();
  state.connection.latestRun = {
    source: "google_workspace", status: "partial", processedCount: 3,
    startedAt: "2026-08-27T10:01:00Z", completedAt: "2026-08-27T10:01:12Z",
    safeErrorCode: "partial_provider_failure"
  };
  const events = model.googleActivity(state);
  assert.equal(events.length, 3);
  assert.equal(events[0].result, "partial");
  assert.equal(events[0].count, 3);
  assert.equal(events[0].durationSeconds, 12);
  assert.ok(events[0].warning);
  assert.equal(events[1].result, "snapshot");
  assert.equal(events[1].count, 12);
  assert.equal(events[1].countLabel, "emailuri în context");
  assert.equal(events[2].capability, "Google Calendar");
  assert.equal(events[2].count, 2);
  assert.deepEqual(plain(events), plain(model.googleActivity(state)));
});

test("Activity does not invent events, successful runs or missing durations", () => {
  assert.equal(model.googleActivity({ configured: true, connection: null }).length, 0);
  const state = fixture();
  state.connection.gmailLastSyncAt = null;
  state.connection.calendarLastSyncAt = null;
  assert.equal(model.googleActivity(state).length, 0);
  state.connection.latestRun = {
    source: "gmail", status: "running", processedCount: 0,
    startedAt: "2026-08-27T10:01:00Z", completedAt: null, safeErrorCode: null
  };
  assert.equal(model.googleActivity(state)[0].durationSeconds, null);
  for (const completedAt of ["invalid", "2026-08-27T09:00:00Z"]) {
    state.connection.latestRun.completedAt = completedAt;
    assert.equal(model.googleActivity(state)[0].durationSeconds, null);
  }
  state.connection.status = "disconnected";
  assert.equal(model.googleActivity(state).length, 0);
});

test("Unknown sync errors never disclose raw codes or provider content", () => {
  assert.equal(model.integrationErrorMessage(null), null);
  assert.match(model.integrationErrorMessage("provider_timeout"), /nu a răspuns/);
  for (const value of ["raw secret payload", "__proto__", "constructor"]) {
    const message = model.integrationErrorMessage(value);
    assert.equal(typeof message, "string");
    assert.ok(!message.includes(value));
  }
});

test("Application modal retains portal, top-layer focus isolation, scroll and restoration", () => {
  const modal = read("src/components/apps/IntegrationDetailDrawer.tsx");
  for (const fragment of ["createPortal(", "document.body", "dialog.showModal()", "dialog.close()",
    'aria-modal="true"', "onCancel=", "onClose()", "overflow-y-auto overscroll-contain",
    "returnFocus.focus({ preventScroll: true })", "document.body.style.overflow = previousOverflow",
    "document.documentElement.style.overflow = previousRootOverflow", "max-h-[calc(100dvh-1rem)]",
    "sm:max-h-[calc(100dvh-3rem)]", "w-[calc(100vw-1rem)]", "rounded-overlay"]) {
    assert.ok(modal.includes(fragment), fragment);
  }
  assert.match(modal, /onManageGoogle/);
  assert.match(modal, /Capabilități planificate/);
  assert.match(modal, /Integrarea nu este activă/);
});

test("Local compact Google symbol preserves official colors and has no runtime references", () => {
  const svg = read("public/brands/applications/google-symbol.svg");
  for (const color of ["#4285F4", "#34A853", "#FBBC04", "#E94235"]) assert.ok(svg.includes(color));
  assert.doesNotMatch(svg, /<script|<image|(?:href|src)=|url\(["']?https?:/i);
  const logo = read("src/components/apps/ApplicationLogo.tsx");
  assert.match(logo, /google-symbol\.svg/);
  assert.match(logo, /variant = "symbol"/);
  assert.match(logo, /item.id === "google-workspace" && variant === "provider" \? workspaceWordmark/);
  const card = read("src/components/apps/GoogleWorkspaceCard.tsx");
  assert.equal((card.match(/<ProviderMark connected \/>/g) ?? []).length, 1);
  assert.doesNotMatch(read("src/components/apps/IntegrationCatalog.tsx"), /variant="provider"/);
});

test("Provider optical sizing centers Salesforce without changing its artwork or other wordmarks", () => {
  const logo = read("src/components/apps/ApplicationLogo.tsx");
  const svg = read("public/brands/applications/salesforce.svg");
  assert.match(svg, /viewBox="0 0 205.73 144"/);
  assert.match(logo, /height: 44 \* 144 \/ 205.73, objectPosition: "50% 50%"/);
  assert.match(logo, /inline-grid shrink-0 place-items-center/);
  assert.match(logo, /object-contain/);
  assert.doesNotMatch(logo, /translate|scale\(|object-cover/);
  for (const name of ["pipedrive", "docusign"]) assert.match(logo, new RegExp(name + ': .*wide: true \\}'));
});

test("All capabilities have the same icon slot and sync feedback has no champagne outline", () => {
  const rows = read("src/components/apps/GoogleCapabilities.tsx");
  assert.match(rows, /<ApplicationLogo item=\{capability\} size="compact" \/>/);
  assert.doesNotMatch(rows, /sm:pl-11|const live/);
  const card = read("src/components/apps/GoogleWorkspaceCard.tsx");
  const notice = card.match(/<div role="status"[\s\S]*?<\/div>/)?.[0];
  assert.ok(notice);
  assert.doesNotMatch(notice, /primary-border|primary-soft|warning/);
});

test("Existing connection endpoints remain the only Google actions in the card", () => {
  const card = read("src/components/apps/GoogleWorkspaceCard.tsx");
  for (const route of ["/api/integrations/google/connect", "/api/integrations/google/sync",
    "/api/integrations/google/disconnect", "/api/integrations/google/connect?capability=email_send"]) {
    assert.ok(card.includes(route));
  }
  assert.doesNotMatch(card, /googleapis\.com|refresh_token|access_token|service_role|gmail\.send|calendar\.events\.insert/);
});
