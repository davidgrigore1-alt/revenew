import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function loadTypeScript(relativePath, requireMap = {}) {
  const filename = path.resolve(relativePath);
  const output = ts.transpileModule(read(relativePath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    exports: module.exports,
    module,
    require: (specifier) => requireMap[specifier] ?? {}
  }, { filename });
  return module.exports;
}

const appointment = loadTypeScript("src/lib/appointment-sandbox.ts");
const fixtures = loadTypeScript("src/lib/appointment-sandbox-fixtures.ts");
const receptionist = loadTypeScript("src/lib/text-receptionist-sandbox.ts", {
  "@/lib/appointment-sandbox": appointment
});
const profile = fixtures.atelierBellezzaSandbox;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function advanceToService(state = receptionist.startReceptionistSandbox(), salon = profile) {
  return receptionist.applyReceptionistInput(salon, state, { acknowledgeDisclosure: true });
}

function advanceToProposal(salon = profile, overrides = {}) {
  let state = advanceToService(undefined, salon);
  state = receptionist.applyReceptionistInput(salon, state, { selectedServiceId: overrides.serviceId ?? "service-tuns-dama" });
  state = receptionist.applyReceptionistInput(salon, state, { preferredDate: overrides.preferredDate ?? "2026-08-04" });
  state = receptionist.applyReceptionistInput(salon, state, {
    preferredTimeWindow: overrides.preferredTimeWindow ?? { start: "09:00", end: "17:00" }
  });
  state = receptionist.applyReceptionistInput(salon, state, overrides.preferredStaffId
    ? { preferredStaffId: overrides.preferredStaffId }
    : { skipStaffPreference: true });
  state = receptionist.applyReceptionistInput(salon, state, {
    customerName: overrides.customerName ?? "Client demonstrativ",
    notes: overrides.notes ?? "Preferă o confirmare după revizuirea operatorului."
  });
  return state;
}

test("disclosure is visible and must be acknowledged before collection", () => {
  const state = receptionist.startReceptionistSandbox();
  assert.equal(state.stage, "disclosure");
  assert.equal(state.disclosureShown, true);
  assert.match(state.disclosure, /simulare locală/i);
  assert.match(state.disclosure, /Nu este un recepționer telefonic live/i);
  assert.match(state.disclosure, /nu creează sau confirmă programări reale/i);
  const blocked = receptionist.applyReceptionistInput(profile, state, {});
  assert.equal(blocked.stage, "disclosure");
  assert.match(blocked.lastError, /Confirmă disclosure-ul/i);
});

test("required information is requested step by step", () => {
  let state = advanceToService();
  assert.equal(state.stage, "collect_service");
  assert.deepEqual(Array.from(state.missingFields), ["service", "preferred_date", "preferred_time_window"]);
  assert.match(receptionist.getNextReceptionistPrompt(profile, state).prompt, /Ce serviciu/);

  state = receptionist.applyReceptionistInput(profile, state, { selectedServiceId: "service-tuns-dama" });
  assert.equal(state.stage, "collect_date");
  assert.deepEqual(Array.from(state.missingFields), ["preferred_date", "preferred_time_window"]);

  state = receptionist.applyReceptionistInput(profile, state, { preferredDate: "2026-08-04" });
  assert.equal(state.stage, "collect_time_window");
  assert.deepEqual(Array.from(state.missingFields), ["preferred_time_window"]);

  state = receptionist.applyReceptionistInput(profile, state, { preferredTimeWindow: { start: "09:00", end: "17:00" } });
  assert.equal(state.stage, "collect_staff_preference");
  assert.deepEqual(Array.from(state.missingFields), []);
});

test("invalid or inactive service and invalid date are rejected safely", () => {
  const serviceState = advanceToService();
  const invalid = receptionist.applyReceptionistInput(profile, serviceState, { selectedServiceId: "service-inexistent" });
  assert.equal(invalid.stage, "collect_service");
  assert.match(invalid.lastError, /nu există/i);

  const inactiveProfile = clone(profile);
  inactiveProfile.services.find((service) => service.id === "service-tuns-dama").active = false;
  const inactive = receptionist.applyReceptionistInput(inactiveProfile, advanceToService(undefined, inactiveProfile), {
    selectedServiceId: "service-tuns-dama"
  });
  assert.equal(inactive.stage, "collect_service");
  assert.match(inactive.lastError, /inactiv/i);

  const dateState = receptionist.applyReceptionistInput(profile, serviceState, { selectedServiceId: "service-tuns-dama" });
  const badDate = receptionist.applyReceptionistInput(profile, dateState, { preferredDate: "2026-02-30" });
  assert.equal(badDate.stage, "collect_date");
  assert.match(badDate.lastError, /YYYY-MM-DD/);
});

test("valid structured choices advance to deterministic local slot proposals", () => {
  const ready = advanceToProposal();
  assert.equal(ready.stage, "propose_slots");
  const proposed = receptionist.buildReceptionistSlotProposal(profile, ready);
  assert.equal(proposed.stage, "create_pending_booking");
  assert.ok(proposed.proposedSlots.length >= 1 && proposed.proposedSlots.length <= 3);
  for (const proposal of proposed.proposedSlots) {
    assert.equal(proposal.slot.salonId, profile.salonId);
    assert.equal(proposal.slot.serviceId, ready.collected.serviceId);
    assert.equal(proposal.statusLabel, "Propunere neconfirmată");
    assert.match(proposal.explanation, /Tuns damă/);
    assert.match(proposal.explanation, /60 min \+ 10 min buffer/);
    assert.match(proposal.explanation, /Propunerea nu este confirmată/);
    assert.ok(proposal.slot.reasons.length > 0);
  }
});

test("no slots result explains why without manufacturing a booking", () => {
  const unavailable = clone(profile);
  unavailable.bookingRules.searchDays = 1;
  unavailable.unavailableIntervals = [{
    start: "2026-08-04T06:00:00.000Z",
    end: "2026-08-04T15:00:00.000Z",
    reason: "Salon indisponibil"
  }];
  const state = advanceToProposal(unavailable);
  const result = receptionist.buildReceptionistSlotProposal(unavailable, state);
  assert.equal(result.stage, "no_slots_available");
  assert.deepEqual(Array.from(result.proposedSlots), []);
  assert.equal(result.pendingBooking, null);
  assert.match(result.lastError, /Nu există intervale valide/);
});

test("selected slot creates only a pending booking and a safe handoff", () => {
  const proposed = receptionist.buildReceptionistSlotProposal(profile, advanceToProposal());
  const completed = receptionist.createReceptionistPendingBooking(profile, proposed, proposed.proposedSlots[0].slotId);
  assert.equal(completed.stage, "handoff");
  assert.equal(completed.pendingBooking.status, "pending_approval");
  assert.equal(completed.pendingBooking.requiresHumanApproval, true);
  assert.equal(completed.pendingBooking.externalSideEffect, false);
  assert.equal(completed.pendingBooking.auditRequired, true);
  assert.equal(completed.pendingBooking.confirmedAt, null);
  assert.equal(completed.requiresHumanApproval, true);
  assert.equal(completed.handoffSummary.approvalStatus, "Aprobarea operatorului este obligatorie");
  assert.equal(completed.handoffSummary.deliveryStatus, "Nu a fost trimisă nicio confirmare");
  assert.equal(completed.handoffSummary.externalEffectStatus, "Nu a fost creată nicio programare sau acțiune externă");
});

test("handoff reports optional gaps without exposing phone, email or secrets", () => {
  let state = advanceToService();
  state = receptionist.applyReceptionistInput(profile, state, { selectedServiceId: "service-manichiura" });
  state = receptionist.applyReceptionistInput(profile, state, { preferredDate: "2026-08-04" });
  state = receptionist.applyReceptionistInput(profile, state, { preferredTimeWindow: { start: "10:00", end: "18:00" } });
  state = receptionist.applyReceptionistInput(profile, state, { skipStaffPreference: true });
  state = receptionist.applyReceptionistInput(profile, state, { continueWithoutCustomerDetails: true });
  state = receptionist.buildReceptionistSlotProposal(profile, state);
  state = receptionist.createReceptionistPendingBooking(profile, state, state.proposedSlots[0].slotId);
  assert.ok(state.handoffSummary.missingOptionalInformation.length === 3);
  const serialized = JSON.stringify(state.handoffSummary);
  assert.doesNotMatch(serialized, /@|password|secret|token|telefon|phone/i);
  assert.match(serialized, /Fără detalii despre client/);
});

test("fixtures and implementation remain local-only and free of forbidden identity markers", () => {
  const source = [
    read("src/lib/text-receptionist-sandbox.ts"),
    read("src/lib/appointment-sandbox.ts"),
    read("src/lib/appointment-sandbox-fixtures.ts")
  ].join("\n");
  assert.doesNotMatch(source, /fetch\s*\(|https?:\/\/|googleapis|gmail|twilio|openai|realtime|oauth|access_token|refresh_token|createClient\s*\(/i);
  assert.doesNotMatch(source, /@gmail\.com|testdavid|davidtest|TEST DATA|\bE2E\b/i);
  assert.doesNotMatch(source, /\b(?:\+?40)?7\d{8}\b|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|RESEND_API_KEY/i);
});

test("live Calendar, Gmail and voice capabilities remain blocked", () => {
  const registry = read("src/lib/ai-capabilities.ts");
  for (const id of [
    "calendar.googleFreeBusyPlanned",
    "calendar.createEventAfterApproval",
    "gmail.sendAfterApproval",
    "voice.realPhoneReceptionistPlanned"
  ]) {
    const start = registry.indexOf(`id: "${id}"`);
    const end = registry.indexOf("\n  },", start);
    const definition = registry.slice(start, end);
    assert.match(definition, /status: "blocked_until_security_review"/);
    assert.match(definition, /allowedExecutionMode: "blocked"/);
  }
});

test("protected demo route is small, explicit and has no persistence or external connector", () => {
  const page = read("src/app/(protected)/demo/appointment-control/page.tsx");
  const client = read("src/components/demo/AppointmentControlSandbox.tsx");
  const engine = read("src/lib/text-receptionist-sandbox.ts");
  const demo = read("src/app/(protected)/demo/page.tsx");
  const policies = read("src/lib/authz/route-policies.ts");
  assert.match(page, /requirePermission\("platform\.internal_tools\.access"\)/);
  assert.match(policies, /prefix: "\/demo", permission: "platform\.internal_tools\.access"/);
  assert.match(page, /Controlul programărilor ReveNew — sandbox local/);
  assert.match(page, /fără efecte externe/);
  assert.match(client, /Google Calendar[\s\S]*Neconectat/);
  assert.match(client, /Programare reală[\s\S]*Nu este creată/);
  assert.match(client, /Aprobare[\s\S]*Obligatorie/);
  assert.match(engine, /statusLabel: "Propunere neconfirmată"/);
  assert.match(engine, /deliveryStatus: "Nu a fost trimisă nicio confirmare"/);
  assert.match(demo, /requirePermission\("platform\.internal_tools\.access"\)/);
  assert.match(demo, /Demo controlat ReveNew/);
  assert.doesNotMatch(`${page}\n${client}\n${demo}`, /server action|fetch\s*\(|createSupabase|\.from\(|googleapis|twilio|openai|oauth/i);
});
