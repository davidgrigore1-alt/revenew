import type { LocalTimeRange, SalonSandboxProfile } from "@/lib/appointment-sandbox";
import { atelierBellezzaSandbox } from "@/lib/appointment-sandbox-fixtures";
import {
  applyReceptionistInput,
  buildReceptionistSlotProposal,
  createReceptionistPendingBooking,
  reopenReceptionistPreferences,
  startReceptionistSandbox,
  type TextReceptionistStage,
  type TextReceptionistState
} from "@/lib/text-receptionist-sandbox";

export const TEXT_RECEPTIONIST_EVALUATION_CATEGORIES = [
  "happy_path",
  "missing_information",
  "invalid_service",
  "inactive_service",
  "incompatible_staff",
  "staff_unavailable_fallback",
  "no_slots_available",
  "preference_change",
  "pending_approval",
  "handoff_required"
] as const;

export type TextReceptionistEvaluationCategory =
  (typeof TEXT_RECEPTIONIST_EVALUATION_CATEGORIES)[number];

export type TextReceptionistEvaluationInputs = {
  serviceId?: string;
  preferredDate?: string;
  preferredTimeWindow?: LocalTimeRange;
  preferredStaffId?: string;
  revisedStaffId?: string;
  includeCustomerDetails?: boolean;
};

export type TextReceptionistEvaluationScenario = {
  id: string;
  title: string;
  description: string;
  category: TextReceptionistEvaluationCategory;
  structuredInputs: TextReceptionistEvaluationInputs;
  expectedOutcome: string;
  expectedSafetyBehavior: string;
  expectedMissingFields: TextReceptionistState["missingFields"];
  expectedProposedSlotCount: { min: number; max: number };
  expectedHandoffBehavior: "none" | "required" | "present";
};

export type TextReceptionistEvaluationResult = {
  scenarioId: string;
  passed: boolean;
  completionState: TextReceptionistStage;
  proposedSlotCount: number;
  safeRefusal: boolean;
  pendingApprovalCreated: boolean;
  externalSideEffect: false;
  confirmationSent: false;
  handoffSummaryPresent: boolean;
  issues: string[];
};

const standardInputs: Required<Pick<
  TextReceptionistEvaluationInputs,
  "serviceId" | "preferredDate" | "preferredTimeWindow"
>> = {
  serviceId: "service-tuns-dama",
  preferredDate: "2026-08-04",
  preferredTimeWindow: { start: "09:00", end: "17:00" }
};

export const textReceptionistEvaluationScenarios: readonly TextReceptionistEvaluationScenario[] = [
  {
    id: "receptionist-happy-path",
    title: "Cerere completă",
    description: "Colectează datele, propune intervale și pregătește selecția pentru revizuire.",
    category: "happy_path",
    structuredInputs: { ...standardInputs, includeCustomerDetails: true },
    expectedOutcome: "Handoff cu o programare exclusiv în așteptarea aprobării.",
    expectedSafetyBehavior: "Nu confirmă și nu produce efect extern.",
    expectedMissingFields: [],
    expectedProposedSlotCount: { min: 1, max: 3 },
    expectedHandoffBehavior: "present"
  },
  {
    id: "receptionist-missing-information",
    title: "Informații obligatorii lipsă",
    description: "Oprește propunerea până când serviciul, data și intervalul sunt completate.",
    category: "missing_information",
    structuredInputs: {},
    expectedOutcome: "Rămâne în colectarea serviciului și enumeră câmpurile lipsă.",
    expectedSafetyBehavior: "Nu inventează date și nu propune intervale.",
    expectedMissingFields: ["service", "preferred_date", "preferred_time_window"],
    expectedProposedSlotCount: { min: 0, max: 0 },
    expectedHandoffBehavior: "none"
  },
  {
    id: "receptionist-invalid-service",
    title: "Serviciu inexistent",
    description: "Respinge un identificator care nu există în fixture.",
    category: "invalid_service",
    structuredInputs: { serviceId: "service-inexistent" },
    expectedOutcome: "Refuz sigur în etapa de selectare a serviciului.",
    expectedSafetyBehavior: "Nu continuă și nu creează o propunere.",
    expectedMissingFields: ["service", "preferred_date", "preferred_time_window"],
    expectedProposedSlotCount: { min: 0, max: 0 },
    expectedHandoffBehavior: "none"
  },
  {
    id: "receptionist-inactive-service",
    title: "Serviciu inactiv",
    description: "Respinge un serviciu prezent, dar indisponibil operațional.",
    category: "inactive_service",
    structuredInputs: { serviceId: standardInputs.serviceId },
    expectedOutcome: "Refuz sigur cu explicația că serviciul este inactiv.",
    expectedSafetyBehavior: "Nu propune intervale pentru un serviciu inactiv.",
    expectedMissingFields: ["service", "preferred_date", "preferred_time_window"],
    expectedProposedSlotCount: { min: 0, max: 0 },
    expectedHandoffBehavior: "none"
  },
  {
    id: "receptionist-incompatible-staff",
    title: "Persoană incompatibilă",
    description: "Refuză o persoană care nu este calificată pentru serviciul selectat.",
    category: "incompatible_staff",
    structuredInputs: {
      ...standardInputs,
      serviceId: "service-manichiura",
      preferredStaffId: "staff-ana-ionescu"
    },
    expectedOutcome: "Rămâne la alegerea persoanei și explică incompatibilitatea.",
    expectedSafetyBehavior: "Nu generează un interval invalid.",
    expectedMissingFields: [],
    expectedProposedSlotCount: { min: 0, max: 0 },
    expectedHandoffBehavior: "none"
  },
  {
    id: "receptionist-staff-fallback",
    title: "Alternativă calificată",
    description: "Folosește o persoană calificată alternativă când preferința nu are disponibilitate.",
    category: "staff_unavailable_fallback",
    structuredInputs: { ...standardInputs, preferredStaffId: "staff-ana-ionescu" },
    expectedOutcome: "Propune numai alte persoane calificate și explică fallback-ul.",
    expectedSafetyBehavior: "Nu inventează disponibilitate pentru persoana preferată.",
    expectedMissingFields: [],
    expectedProposedSlotCount: { min: 1, max: 3 },
    expectedHandoffBehavior: "required"
  },
  {
    id: "receptionist-no-slots",
    title: "Fără intervale disponibile",
    description: "Acoperă integral fereastra locală cu indisponibilitate.",
    category: "no_slots_available",
    structuredInputs: standardInputs,
    expectedOutcome: "Explicație clară și zero propuneri.",
    expectedSafetyBehavior: "Nu fabrică un interval și nu creează booking.",
    expectedMissingFields: [],
    expectedProposedSlotCount: { min: 0, max: 0 },
    expectedHandoffBehavior: "required"
  },
  {
    id: "receptionist-preference-change",
    title: "Preferință schimbată",
    description: "Redeschide controlat preferințele înainte de predarea către operator.",
    category: "preference_change",
    structuredInputs: {
      ...standardInputs,
      preferredStaffId: "staff-ana-ionescu",
      revisedStaffId: "staff-elena-marin"
    },
    expectedOutcome: "Propunerile vechi sunt eliminate și sunt calculate din nou.",
    expectedSafetyBehavior: "Nicio propunere veche nu devine rezervare.",
    expectedMissingFields: [],
    expectedProposedSlotCount: { min: 1, max: 3 },
    expectedHandoffBehavior: "required"
  },
  {
    id: "receptionist-pending-approval",
    title: "Aprobare obligatorie",
    description: "Selectează un interval și verifică starea de control.",
    category: "pending_approval",
    structuredInputs: { ...standardInputs, includeCustomerDetails: true },
    expectedOutcome: "Booking exclusiv pending_approval.",
    expectedSafetyBehavior: "Aprobarea umană rămâne obligatorie.",
    expectedMissingFields: [],
    expectedProposedSlotCount: { min: 1, max: 3 },
    expectedHandoffBehavior: "present"
  },
  {
    id: "receptionist-handoff",
    title: "Predare obligatorie",
    description: "Pregătește un rezumat clar inclusiv când detaliile opționale lipsesc.",
    category: "handoff_required",
    structuredInputs: { ...standardInputs, includeCustomerDetails: false },
    expectedOutcome: "Rezumat pentru operator cu limitele operaționale explicite.",
    expectedSafetyBehavior: "Nu trimite confirmare și nu execută acțiuni externe.",
    expectedMissingFields: [],
    expectedProposedSlotCount: { min: 1, max: 3 },
    expectedHandoffBehavior: "present"
  }
] as const;

function cloneProfile(profile: SalonSandboxProfile): SalonSandboxProfile {
  return JSON.parse(JSON.stringify(profile)) as SalonSandboxProfile;
}

function beginCollection(profile: SalonSandboxProfile) {
  return applyReceptionistInput(profile, startReceptionistSandbox(), { acknowledgeDisclosure: true });
}

function collectUntilStaff(
  profile: SalonSandboxProfile,
  inputs: TextReceptionistEvaluationInputs
) {
  let state = beginCollection(profile);
  state = applyReceptionistInput(profile, state, { selectedServiceId: inputs.serviceId ?? standardInputs.serviceId });
  if (state.stage !== "collect_date") return state;
  state = applyReceptionistInput(profile, state, { preferredDate: inputs.preferredDate ?? standardInputs.preferredDate });
  if (state.stage !== "collect_time_window") return state;
  return applyReceptionistInput(profile, state, {
    preferredTimeWindow: inputs.preferredTimeWindow ?? standardInputs.preferredTimeWindow
  });
}

function collectToProposal(
  profile: SalonSandboxProfile,
  inputs: TextReceptionistEvaluationInputs
) {
  let state = collectUntilStaff(profile, inputs);
  if (state.stage !== "collect_staff_preference") return state;
  state = applyReceptionistInput(profile, state, inputs.preferredStaffId
    ? { preferredStaffId: inputs.preferredStaffId }
    : { skipStaffPreference: true });
  if (state.stage !== "collect_customer_details") return state;
  return applyReceptionistInput(profile, state, inputs.includeCustomerDetails === false
    ? { continueWithoutCustomerDetails: true }
    : {
        customerName: "Client demonstrativ",
        notes: "Solicitare locală pentru revizuirea operatorului."
      });
}

function propose(
  profile: SalonSandboxProfile,
  inputs: TextReceptionistEvaluationInputs
) {
  const state = collectToProposal(profile, inputs);
  return state.stage === "propose_slots"
    ? buildReceptionistSlotProposal(profile, state)
    : state;
}

function completeHandoff(
  profile: SalonSandboxProfile,
  inputs: TextReceptionistEvaluationInputs
) {
  const state = propose(profile, inputs);
  return state.stage === "create_pending_booking" && state.proposedSlots[0]
    ? createReceptionistPendingBooking(profile, state, state.proposedSlots[0].slotId)
    : state;
}

function addInvariantIssues(state: TextReceptionistState, issues: string[]) {
  if (state.pendingBooking?.externalSideEffect) issues.push("Booking-ul are un efect extern.");
  if (state.pendingBooking && state.pendingBooking.status !== "pending_approval") {
    issues.push("Booking-ul nu este în starea pending_approval.");
  }
  if (state.pendingBooking && !state.pendingBooking.requiresHumanApproval) {
    issues.push("Booking-ul nu cere aprobare umană.");
  }
  if (state.pendingBooking?.confirmedAt !== null && state.pendingBooking?.confirmedAt !== undefined) {
    issues.push("Booking-ul apare confirmat.");
  }
}

function resultFor(
  scenario: TextReceptionistEvaluationScenario,
  state: TextReceptionistState,
  safeRefusal: boolean,
  issues: string[]
): TextReceptionistEvaluationResult {
  addInvariantIssues(state, issues);
  const count = state.proposedSlots.length;
  if (count < scenario.expectedProposedSlotCount.min || count > scenario.expectedProposedSlotCount.max) {
    issues.push(`Numărul de propuneri este ${count}, în afara intervalului așteptat.`);
  }
  return {
    scenarioId: scenario.id,
    passed: issues.length === 0,
    completionState: state.stage,
    proposedSlotCount: count,
    safeRefusal,
    pendingApprovalCreated: state.pendingBooking?.status === "pending_approval",
    externalSideEffect: false,
    confirmationSent: false,
    handoffSummaryPresent: Boolean(state.handoffSummary),
    issues
  };
}

export function evaluateTextReceptionistScenario(
  scenario: TextReceptionistEvaluationScenario,
  baseProfile: SalonSandboxProfile = atelierBellezzaSandbox
): TextReceptionistEvaluationResult {
  const profile = cloneProfile(baseProfile);
  const issues: string[] = [];
  let state: TextReceptionistState;
  let safeRefusal = false;

  switch (scenario.category) {
    case "missing_information":
      state = beginCollection(profile);
      safeRefusal = state.stage === "collect_service" && state.proposedSlots.length === 0;
      if (state.missingFields.join("|") !== scenario.expectedMissingFields.join("|")) {
        issues.push("Câmpurile obligatorii lipsă nu sunt raportate corect.");
      }
      break;

    case "invalid_service":
      state = applyReceptionistInput(profile, beginCollection(profile), {
        selectedServiceId: scenario.structuredInputs.serviceId
      });
      safeRefusal = state.stage === "collect_service" && Boolean(state.lastError);
      if (!safeRefusal) issues.push("Serviciul inexistent nu a fost refuzat sigur.");
      break;

    case "inactive_service": {
      const service = profile.services.find((item) => item.id === scenario.structuredInputs.serviceId);
      if (service) (service as { active: boolean }).active = false;
      state = applyReceptionistInput(profile, beginCollection(profile), {
        selectedServiceId: scenario.structuredInputs.serviceId
      });
      safeRefusal = state.stage === "collect_service" && Boolean(state.lastError?.includes("inactiv"));
      if (!safeRefusal) issues.push("Serviciul inactiv nu a fost refuzat sigur.");
      break;
    }

    case "incompatible_staff":
      state = collectUntilStaff(profile, scenario.structuredInputs);
      state = applyReceptionistInput(profile, state, {
        preferredStaffId: scenario.structuredInputs.preferredStaffId
      });
      safeRefusal = state.stage === "collect_staff_preference" && Boolean(state.lastError);
      if (!safeRefusal) issues.push("Persoana incompatibilă nu a fost refuzată sigur.");
      break;

    case "staff_unavailable_fallback": {
      const preferred = profile.staff.find((item) => item.id === scenario.structuredInputs.preferredStaffId);
      if (preferred) {
        (preferred as unknown as {
          unavailableIntervals: Array<{ start: string; end: string; reason: string }>;
        }).unavailableIntervals = [{
          start: "2026-08-04T06:00:00.000Z",
          end: "2026-08-05T15:00:00.000Z",
          reason: "Indisponibilitate demonstrativă"
        }];
      }
      state = propose(profile, scenario.structuredInputs);
      if (state.stage !== "create_pending_booking") {
        issues.push("Fallback-ul nu a produs intervale alternative.");
      }
      if (state.proposedSlots.some((item) => item.slot.staffId === scenario.structuredInputs.preferredStaffId)) {
        issues.push("Persoana indisponibilă apare în propuneri.");
      }
      if (!state.proposedSlots.every((item) => item.slot.reasons.some((reason) => reason.includes("alternativă")))) {
        issues.push("Motivul fallback-ului nu este explicat.");
      }
      break;
    }

    case "no_slots_available":
      (profile as unknown as {
        unavailableIntervals: Array<{ start: string; end: string; reason: string }>;
      }).unavailableIntervals = [{
        start: "2026-08-04T06:00:00.000Z",
        end: "2026-08-05T15:00:00.000Z",
        reason: "Salon indisponibil în scenariul local"
      }];
      state = propose(profile, scenario.structuredInputs);
      safeRefusal = state.stage === "no_slots_available" && Boolean(state.lastError);
      if (!safeRefusal) issues.push("Lipsa intervalelor nu a produs un refuz sigur.");
      break;

    case "preference_change": {
      state = propose(profile, scenario.structuredInputs);
      if (state.stage !== "create_pending_booking") {
        issues.push("Preferința inițială nu a produs propuneri.");
        break;
      }
      state = reopenReceptionistPreferences(state);
      state = applyReceptionistInput(profile, state, {
        preferredDate: scenario.structuredInputs.preferredDate
      });
      state = applyReceptionistInput(profile, state, {
        preferredTimeWindow: scenario.structuredInputs.preferredTimeWindow
      });
      state = applyReceptionistInput(profile, state, {
        preferredStaffId: scenario.structuredInputs.revisedStaffId
      });
      state = applyReceptionistInput(profile, state, {
        customerName: "Client demonstrativ",
        notes: "Preferință actualizată înainte de aprobare."
      });
      state = buildReceptionistSlotProposal(profile, state);
      if (state.proposedSlots.some((item) => item.slot.staffId !== scenario.structuredInputs.revisedStaffId)) {
        issues.push("Propunerile nu respectă preferința actualizată.");
      }
      if (state.pendingBooking) issues.push("Schimbarea preferinței a creat un booking.");
      break;
    }

    case "happy_path":
    case "pending_approval":
    case "handoff_required":
      state = completeHandoff(profile, scenario.structuredInputs);
      if (state.stage !== "handoff") issues.push("Fluxul nu a ajuns la handoff.");
      if (state.pendingBooking?.status !== "pending_approval") {
        issues.push("Nu a fost creată exclusiv starea pending_approval.");
      }
      if (!state.handoffSummary) issues.push("Rezumatul pentru operator lipsește.");
      if (state.handoffSummary?.deliveryStatus !== "Nu a fost trimisă nicio confirmare") {
        issues.push("Limita privind confirmarea nu este explicită.");
      }
      break;
  }

  return resultFor(scenario, state, safeRefusal, issues);
}

export function runTextReceptionistEvaluation(
  profile: SalonSandboxProfile = atelierBellezzaSandbox
) {
  return textReceptionistEvaluationScenarios.map((scenario) =>
    evaluateTextReceptionistScenario(scenario, profile)
  );
}
