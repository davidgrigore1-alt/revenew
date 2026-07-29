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

const engine = loadTypeScript("src/lib/appointment-sandbox.ts");
const fixtures = loadTypeScript("src/lib/appointment-sandbox-fixtures.ts");
const baseProfile = fixtures.atelierBellezzaSandbox;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function request(overrides = {}) {
  return {
    serviceId: "service-tuns-dama",
    preferredDate: "2026-08-03",
    customerName: "Client demonstrativ",
    ...overrides
  };
}

function proposal(profile = baseProfile, overrides = {}) {
  return engine.proposeAppointmentSlots(profile, request(overrides));
}

function intervalOverlaps(start, end, otherStart, otherEnd) {
  return Date.parse(start) < Date.parse(otherEnd) && Date.parse(otherStart) < Date.parse(end);
}

test("available services produce exactly one to three deterministic slots", () => {
  const result = proposal();
  assert.equal(result.ok, true);
  assert.ok(result.slots.length >= 1 && result.slots.length <= 3);
  assert.equal(result.slots.length, baseProfile.bookingRules.maxSuggestions);
  assert.equal(result.timezone, "Europe/Bucharest");
  assert.ok(result.slots.every((slot) => slot.serviceId === "service-tuns-dama"));
});

test("slots stay inside business and staff hours with duration and buffer intact", () => {
  const result = proposal();
  assert.equal(result.ok, true);
  for (const slot of result.slots) {
    const staff = baseProfile.staff.find((item) => item.id === slot.staffId);
    const businessRanges = baseProfile.businessHours.monday;
    const staffRanges = staff.workingHours.monday;
    const startMinutes = Number(slot.localStart.slice(0, 2)) * 60 + Number(slot.localStart.slice(3));
    const bufferedLocalEnd = new Intl.DateTimeFormat("en-GB", {
      timeZone: slot.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).format(new Date(slot.bufferedEnd));
    const bufferedEndMinutes = Number(bufferedLocalEnd.slice(0, 2)) * 60 + Number(bufferedLocalEnd.slice(3));
    assert.ok(businessRanges.some((range) => startMinutes >= Number(range.start.slice(0, 2)) * 60 && bufferedEndMinutes <= Number(range.end.slice(0, 2)) * 60));
    assert.ok(staffRanges.some((range) => startMinutes >= Number(range.start.slice(0, 2)) * 60 && bufferedEndMinutes <= Number(range.end.slice(0, 2)) * 60));
    assert.equal(Date.parse(slot.end) - Date.parse(slot.start), slot.durationMinutes * 60_000);
    assert.equal(Date.parse(slot.bufferedEnd) - Date.parse(slot.end), slot.bufferMinutes * 60_000);
  }
});

test("proposals exclude existing appointments and all unavailable intervals", () => {
  const result = proposal();
  assert.equal(result.ok, true);
  for (const slot of result.slots) {
    for (const appointment of baseProfile.existingAppointments.filter((item) => item.staffId === slot.staffId && item.status !== "cancelled")) {
      const occupiedEnd = new Date(Date.parse(appointment.end) + appointment.bufferMinutes * 60_000).toISOString();
      assert.equal(intervalOverlaps(slot.start, slot.bufferedEnd, appointment.start, occupiedEnd), false);
    }
    for (const interval of baseProfile.unavailableIntervals) {
      assert.equal(intervalOverlaps(slot.start, slot.bufferedEnd, interval.start, interval.end), false);
    }
    const staff = baseProfile.staff.find((item) => item.id === slot.staffId);
    for (const interval of staff.unavailableIntervals) {
      assert.equal(intervalOverlaps(slot.start, slot.bufferedEnd, interval.start, interval.end), false);
    }
  }
  for (let left = 0; left < result.slots.length; left += 1) {
    for (let right = left + 1; right < result.slots.length; right += 1) {
      assert.equal(intervalOverlaps(result.slots[left].start, result.slots[left].bufferedEnd, result.slots[right].start, result.slots[right].bufferedEnd), false);
    }
  }
});

test("requested staff is preferred whenever that person has valid availability", () => {
  const result = proposal(baseProfile, {
    preferredDate: "2026-08-04",
    preferredStaffId: "staff-elena-marin"
  });
  assert.equal(result.ok, true);
  assert.ok(result.slots.every((slot) => slot.staffId === "staff-elena-marin"));
  assert.ok(result.slots.every((slot) => slot.reasons.some((reason) => /Persoana preferată este disponibilă/.test(reason))));
});

test("another qualified staff member is proposed when preferred staff has no valid slot", () => {
  const profile = clone(baseProfile);
  profile.bookingRules.searchDays = 1;
  const ana = profile.staff.find((staff) => staff.id === "staff-ana-ionescu");
  ana.unavailableIntervals.push({
    start: "2026-08-04T06:00:00.000Z",
    end: "2026-08-04T14:00:00.000Z",
    reason: "Indisponibilă"
  });
  const result = proposal(profile, {
    preferredDate: "2026-08-04",
    preferredStaffId: "staff-ana-ionescu"
  });
  assert.equal(result.ok, true);
  assert.ok(result.slots.every((slot) => slot.staffId !== "staff-ana-ionescu"));
  assert.ok(result.slots.every((slot) => slot.reasons.some((reason) => /persoană calificată alternativă/i.test(reason))));
});

test("inactive services and incompatible preferred staff fail with precise reasons", () => {
  const inactive = clone(baseProfile);
  inactive.services.find((service) => service.id === "service-tuns-dama").active = false;
  const inactiveResult = proposal(inactive);
  assert.equal(inactiveResult.ok, false);
  assert.equal(inactiveResult.code, "service_inactive");
  assert.match(inactiveResult.message, /nu este activ/i);

  const incompatible = proposal(baseProfile, {
    serviceId: "service-tuns-barbati",
    preferredStaffId: "staff-maria-popa"
  });
  assert.equal(incompatible.ok, false);
  assert.equal(incompatible.code, "preferred_staff_incompatible");
  assert.match(incompatible.message, /nu este calificată/i);
});

test("no availability returns an explicit operational reason", () => {
  const profile = clone(baseProfile);
  profile.bookingRules.searchDays = 1;
  profile.unavailableIntervals = [{
    start: "2026-08-04T06:00:00.000Z",
    end: "2026-08-04T15:00:00.000Z",
    reason: "Salon indisponibil"
  }];
  const result = proposal(profile, { preferredDate: "2026-08-04" });
  assert.equal(result.ok, false);
  assert.equal(result.code, "no_slots_available");
  assert.match(result.message, /Nu există intervale valide/);
  assert.match(result.message, /Ajustează data, intervalul sau persoana preferată/);
});

test("booking creation remains pending, auditable and without an external side effect", () => {
  const result = proposal(baseProfile, {
    customerPhone: "număr furnizat local",
    notes: "Preferă prima parte a zilei."
  });
  assert.equal(result.ok, true);
  const booking = engine.createPendingSandboxBooking(baseProfile, request({
    customerPhone: "număr furnizat local",
    notes: "Preferă prima parte a zilei."
  }), result.slots[0]);
  assert.equal(booking.status, "pending_approval");
  assert.equal(booking.requiresHumanApproval, true);
  assert.equal(booking.externalSideEffect, false);
  assert.equal(booking.auditRequired, true);
  assert.equal(booking.confirmedAt, null);
  assert.equal(booking.customerSummary.phoneProvided, true);
  assert.equal("phone" in booking.customerSummary, false);
  assert.equal("customerPhone" in booking.customerSummary, false);
});

test("timezone and fixture identity remain stable and strictly fictional", () => {
  assert.equal(baseProfile.timezone, "Europe/Bucharest");
  assert.equal(baseProfile.salonName, "Atelier Bellezza Demo");
  const source = read("src/lib/appointment-sandbox-fixtures.ts");
  assert.doesNotMatch(source, /@gmail\.com|testdavid|davidtest|TEST DATA|\bE2E\b/i);
  assert.doesNotMatch(source, /\b(?:\+?40)?7\d{8}\b|email\s*:/i);
});

test("live Calendar, Gmail and voice remain blocked and the sandbox has no external API path", () => {
  const registry = read("src/lib/ai-capabilities.ts");
  const source = `${read("src/lib/appointment-sandbox.ts")}\n${read("src/lib/appointment-sandbox-fixtures.ts")}`;
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
  assert.doesNotMatch(source, /fetch\s*\(|https?:\/\/|googleapis|gmail|twilio|openai|realtime|oauth|access_token|refresh_token|createClient\s*\(/i);
});
