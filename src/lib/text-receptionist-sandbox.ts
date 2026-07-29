import {
  createPendingSandboxBooking,
  proposeAppointmentSlots,
  type AppointmentSandboxRequest,
  type AppointmentSandboxSlot,
  type LocalTimeRange,
  type PendingSandboxBooking,
  type SalonSandboxProfile
} from "@/lib/appointment-sandbox";

export const TEXT_RECEPTIONIST_DISCLOSURE =
  "Aceasta este o simulare locală ReveNew. Nu este un recepționer telefonic live, nu este conectată la Google Calendar și nu creează sau confirmă programări reale.";

export type TextReceptionistStage =
  | "disclosure"
  | "collect_service"
  | "collect_date"
  | "collect_time_window"
  | "collect_staff_preference"
  | "collect_customer_details"
  | "propose_slots"
  | "create_pending_booking"
  | "handoff"
  | "no_slots_available";

export type ReceptionistCollectedDetails = {
  serviceId: string | null;
  preferredDate: string | null;
  preferredTimeWindow: LocalTimeRange | null;
  preferredStaffId: string | null;
  customerName: string | null;
  notes: string | null;
};

export type ReceptionistSlotProposal = {
  slotId: string;
  slot: AppointmentSandboxSlot;
  explanation: string;
  statusLabel: "Propunere neconfirmată";
};

export type ReceptionistHandoffSummary = {
  salonName: string;
  requestedService: string;
  requestedDateAndWindow: string;
  selectedSlot: string;
  staffMember: string;
  customerSummary: string;
  missingOptionalInformation: string[];
  approvalStatus: "Aprobarea operatorului este obligatorie";
  deliveryStatus: "Nu a fost trimisă nicio confirmare";
  externalEffectStatus: "Nu a fost creată nicio programare sau acțiune externă";
};

export type TextReceptionistState = {
  stage: TextReceptionistStage;
  disclosure: string;
  disclosureShown: boolean;
  collected: ReceptionistCollectedDetails;
  missingFields: Array<"service" | "preferred_date" | "preferred_time_window">;
  proposedSlots: ReceptionistSlotProposal[];
  pendingBooking: PendingSandboxBooking | null;
  handoffSummary: ReceptionistHandoffSummary | null;
  requiresHumanApproval: true;
  lastError: string | null;
};

export type ReceptionistStructuredInput = {
  acknowledgeDisclosure?: boolean;
  selectedServiceId?: string;
  preferredDate?: string;
  preferredTimeWindow?: LocalTimeRange;
  preferredStaffId?: string;
  skipStaffPreference?: boolean;
  customerName?: string;
  notes?: string;
  continueWithoutCustomerDetails?: boolean;
};

export type ReceptionistPrompt = {
  stage: TextReceptionistStage;
  title: string;
  prompt: string;
  required: boolean;
  options: Array<{ value: string; label: string }>;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function cleanText(value: string | undefined, maxLength: number) {
  const result = value?.trim().replace(/[<>]/g, "").slice(0, maxLength);
  return result || null;
}

function validDate(value: string | undefined) {
  if (!value || !datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function validTimeWindow(value: LocalTimeRange | undefined) {
  if (!value || !timePattern.test(value.start) || !timePattern.test(value.end)) return false;
  return value.start < value.end;
}

function missingFields(collected: ReceptionistCollectedDetails): TextReceptionistState["missingFields"] {
  const missing: TextReceptionistState["missingFields"] = [];
  if (!collected.serviceId) missing.push("service");
  if (!collected.preferredDate) missing.push("preferred_date");
  if (!collected.preferredTimeWindow) missing.push("preferred_time_window");
  return missing;
}

function withState(
  state: TextReceptionistState,
  updates: Partial<Omit<TextReceptionistState, "requiresHumanApproval">>
): TextReceptionistState {
  const collected = updates.collected ?? state.collected;
  return {
    ...state,
    ...updates,
    collected,
    missingFields: missingFields(collected),
    requiresHumanApproval: true
  };
}

function requestFromState(state: TextReceptionistState): AppointmentSandboxRequest | null {
  if (!state.collected.serviceId || !state.collected.preferredDate || !state.collected.preferredTimeWindow) return null;
  return {
    serviceId: state.collected.serviceId,
    preferredDate: state.collected.preferredDate,
    preferredTimeWindow: state.collected.preferredTimeWindow,
    preferredStaffId: state.collected.preferredStaffId ?? undefined,
    customerName: state.collected.customerName ?? undefined,
    notes: state.collected.notes ?? undefined
  };
}

function serviceForState(profile: SalonSandboxProfile, state: TextReceptionistState) {
  return profile.services.find((service) => service.id === state.collected.serviceId) ?? null;
}

export function startReceptionistSandbox(): TextReceptionistState {
  const collected: ReceptionistCollectedDetails = {
    serviceId: null,
    preferredDate: null,
    preferredTimeWindow: null,
    preferredStaffId: null,
    customerName: null,
    notes: null
  };
  return {
    stage: "disclosure",
    disclosure: TEXT_RECEPTIONIST_DISCLOSURE,
    disclosureShown: true,
    collected,
    missingFields: missingFields(collected),
    proposedSlots: [],
    pendingBooking: null,
    handoffSummary: null,
    requiresHumanApproval: true,
    lastError: null
  };
}

export function getNextReceptionistPrompt(
  profile: SalonSandboxProfile,
  state: TextReceptionistState
): ReceptionistPrompt {
  if (state.stage === "disclosure") {
    return {
      stage: state.stage,
      title: "Simulare locală",
      prompt: `${state.disclosure} Confirmă că ai înțeles înainte de a continua.`,
      required: true,
      options: [{ value: "acknowledged", label: "Am înțeles · continuă simularea" }]
    };
  }
  if (state.stage === "collect_service") {
    return {
      stage: state.stage,
      title: "Serviciu",
      prompt: "Ce serviciu dorește clientul?",
      required: true,
      options: profile.services.filter((service) => service.active).map((service) => ({
        value: service.id,
        label: `${service.name} · ${service.durationMinutes} min + ${service.bufferMinutes} min buffer`
      }))
    };
  }
  if (state.stage === "collect_date") {
    return { stage: state.stage, title: "Data preferată", prompt: "Pentru ce dată este solicitată programarea?", required: true, options: [] };
  }
  if (state.stage === "collect_time_window") {
    return { stage: state.stage, title: "Interval preferat", prompt: "În ce interval local este disponibil clientul?", required: true, options: [] };
  }
  if (state.stage === "collect_staff_preference") {
    const service = serviceForState(profile, state);
    return {
      stage: state.stage,
      title: "Persoană preferată",
      prompt: "Există o preferință pentru o anumită persoană? Acest câmp este opțional.",
      required: false,
      options: profile.staff
        .filter((staff) => staff.active && service?.allowedStaffIds.includes(staff.id) && staff.servicesAllowed.includes(service.id))
        .map((staff) => ({ value: staff.id, label: staff.name }))
    };
  }
  if (state.stage === "collect_customer_details") {
    return {
      stage: state.stage,
      title: "Detalii opționale",
      prompt: "Adaugă numele clientului și o notă scurtă sau continuă fără ele.",
      required: false,
      options: []
    };
  }
  if (state.stage === "propose_slots") {
    return {
      stage: state.stage,
      title: "Verifică disponibilitatea",
      prompt: "Datele obligatorii sunt complete. Generează propunerile locale.",
      required: true,
      options: []
    };
  }
  if (state.stage === "create_pending_booking") {
    return {
      stage: state.stage,
      title: "Selectează o propunere",
      prompt: "Alege un interval pentru a pregăti solicitarea în așteptarea aprobării.",
      required: true,
      options: state.proposedSlots.map((proposal) => ({ value: proposal.slotId, label: proposal.explanation }))
    };
  }
  if (state.stage === "no_slots_available") {
    return {
      stage: state.stage,
      title: "Niciun interval disponibil",
      prompt: state.lastError ?? "Nu există intervale valide. Modifică preferințele și reia simularea.",
      required: false,
      options: []
    };
  }
  return {
    stage: state.stage,
    title: "Predare către operator",
    prompt: "Propunerea este pregătită pentru revizuire umană. Nu a fost creată sau confirmată o programare.",
    required: false,
    options: []
  };
}

export function applyReceptionistInput(
  profile: SalonSandboxProfile,
  state: TextReceptionistState,
  input: ReceptionistStructuredInput
): TextReceptionistState {
  if (state.stage === "disclosure") {
    return input.acknowledgeDisclosure === true
      ? withState(state, { stage: "collect_service", disclosureShown: true, lastError: null })
      : withState(state, { lastError: "Confirmă disclosure-ul simulării înainte de a continua." });
  }

  if (state.stage === "collect_service") {
    const service = profile.services.find((item) => item.id === input.selectedServiceId);
    if (!service) return withState(state, { lastError: "Serviciul selectat nu există în fixture-ul local." });
    if (!service.active) return withState(state, { lastError: "Serviciul selectat este inactiv și nu poate fi propus." });
    return withState(state, {
      stage: "collect_date",
      collected: { ...state.collected, serviceId: service.id, preferredStaffId: null },
      lastError: null
    });
  }

  if (state.stage === "collect_date") {
    if (!validDate(input.preferredDate)) {
      return withState(state, { lastError: "Data trebuie să fie calendaristică și să folosească formatul YYYY-MM-DD." });
    }
    return withState(state, {
      stage: "collect_time_window",
      collected: { ...state.collected, preferredDate: input.preferredDate ?? null },
      lastError: null
    });
  }

  if (state.stage === "collect_time_window") {
    if (!validTimeWindow(input.preferredTimeWindow)) {
      return withState(state, { lastError: "Intervalul local trebuie să aibă ore valide și începutul înaintea sfârșitului." });
    }
    return withState(state, {
      stage: "collect_staff_preference",
      collected: { ...state.collected, preferredTimeWindow: input.preferredTimeWindow ?? null },
      lastError: null
    });
  }

  if (state.stage === "collect_staff_preference") {
    if (input.skipStaffPreference === true) {
      return withState(state, {
        stage: "collect_customer_details",
        collected: { ...state.collected, preferredStaffId: null },
        lastError: null
      });
    }
    const service = serviceForState(profile, state);
    const staff = profile.staff.find((item) => item.id === input.preferredStaffId);
    if (!staff || !staff.active || !service?.allowedStaffIds.includes(staff.id) || !staff.servicesAllowed.includes(service.id)) {
      return withState(state, { lastError: "Persoana selectată nu este activă și calificată pentru serviciul curent." });
    }
    return withState(state, {
      stage: "collect_customer_details",
      collected: { ...state.collected, preferredStaffId: staff.id },
      lastError: null
    });
  }

  if (state.stage === "collect_customer_details") {
    if (!input.continueWithoutCustomerDetails && !input.customerName?.trim() && !input.notes?.trim()) {
      return withState(state, { lastError: "Adaugă cel puțin un detaliu opțional sau confirmă continuarea fără detalii." });
    }
    return withState(state, {
      stage: "propose_slots",
      collected: {
        ...state.collected,
        customerName: cleanText(input.customerName, 120),
        notes: cleanText(input.notes, 500)
      },
      lastError: null
    });
  }

  return withState(state, { lastError: "Etapa curentă nu acceptă acest tip de informație." });
}

export function receptionistSlotId(slot: AppointmentSandboxSlot) {
  return `slot:${slot.serviceId}:${slot.staffId}:${slot.start}`;
}

export function buildReceptionistSlotProposal(
  profile: SalonSandboxProfile,
  state: TextReceptionistState
): TextReceptionistState {
  if (state.stage !== "propose_slots") {
    return withState(state, { lastError: "Propunerile pot fi generate numai după completarea câmpurilor obligatorii." });
  }
  const request = requestFromState(state);
  if (!request) {
    return withState(state, { lastError: "Serviciul, data și intervalul preferat sunt obligatorii." });
  }
  const service = serviceForState(profile, state);
  const result = proposeAppointmentSlots(profile, request);
  if (!result.ok || !service) {
    return withState(state, {
      stage: "no_slots_available",
      proposedSlots: [],
      lastError: result.message
    });
  }
  const proposedSlots = result.slots.map((slot): ReceptionistSlotProposal => ({
    slotId: receptionistSlotId(slot),
    slot,
    explanation: `${service.name} · ${slot.localDate}, ${slot.localStart}–${slot.localEnd} · ${slot.staffName} · ${service.durationMinutes} min + ${service.bufferMinutes} min buffer. ${slot.reasons[0]} Propunerea nu este confirmată.`,
    statusLabel: "Propunere neconfirmată"
  }));
  return withState(state, {
    stage: "create_pending_booking",
    proposedSlots,
    lastError: null
  });
}

export function reopenReceptionistPreferences(state: TextReceptionistState): TextReceptionistState {
  if (state.stage !== "create_pending_booking" && state.stage !== "no_slots_available") {
    return withState(state, {
      lastError: state.stage === "handoff"
        ? "Propunerea a fost deja predată operatorului. Pornește o simulare nouă pentru alte preferințe."
        : "Preferințele pot fi schimbate după verificarea disponibilității."
    });
  }

  return withState(state, {
    stage: "collect_date",
    collected: {
      ...state.collected,
      preferredDate: null,
      preferredTimeWindow: null,
      preferredStaffId: null
    },
    proposedSlots: [],
    pendingBooking: null,
    handoffSummary: null,
    lastError: null
  });
}

export function buildReceptionistHandoffSummary(
  profile: SalonSandboxProfile,
  state: TextReceptionistState,
  booking: PendingSandboxBooking
): ReceptionistHandoffSummary {
  const service = serviceForState(profile, state);
  const window = state.collected.preferredTimeWindow;
  const missingOptionalInformation: string[] = [];
  if (!state.collected.preferredStaffId) missingOptionalInformation.push("Fără preferință inițială pentru o persoană.");
  if (!state.collected.customerName) missingOptionalInformation.push("Numele clientului nu a fost furnizat.");
  if (!state.collected.notes) missingOptionalInformation.push("Nu au fost adăugate note.");

  return {
    salonName: profile.salonName,
    requestedService: service?.name ?? "Serviciu neidentificat",
    requestedDateAndWindow: `${state.collected.preferredDate ?? "Dată lipsă"} · ${window ? `${window.start}–${window.end}` : "interval lipsă"} · ${profile.timezone}`,
    selectedSlot: `${booking.requestedSlot.localDate}, ${booking.requestedSlot.localStart}–${booking.requestedSlot.localEnd}`,
    staffMember: booking.requestedSlot.staffName,
    customerSummary: booking.customerSummary.name
      ? `${booking.customerSummary.name}${booking.customerSummary.notes ? ` · ${booking.customerSummary.notes}` : ""}`
      : booking.customerSummary.notes ?? "Fără detalii despre client",
    missingOptionalInformation,
    approvalStatus: "Aprobarea operatorului este obligatorie",
    deliveryStatus: "Nu a fost trimisă nicio confirmare",
    externalEffectStatus: "Nu a fost creată nicio programare sau acțiune externă"
  };
}

export function createReceptionistPendingBooking(
  profile: SalonSandboxProfile,
  state: TextReceptionistState,
  selectedSlotId: string
): TextReceptionistState {
  if (state.stage !== "create_pending_booking") {
    return withState(state, { lastError: "Selectarea intervalului este permisă numai după generarea propunerilor." });
  }
  const proposal = state.proposedSlots.find((item) => item.slotId === selectedSlotId);
  const request = requestFromState(state);
  if (!proposal || !request) {
    return withState(state, { lastError: "Intervalul selectat nu aparține propunerilor curente." });
  }
  const pendingBooking = createPendingSandboxBooking(profile, request, proposal.slot);
  const handoffSummary = buildReceptionistHandoffSummary(profile, state, pendingBooking);
  return withState(state, {
    stage: "handoff",
    pendingBooking,
    handoffSummary,
    lastError: null
  });
}
