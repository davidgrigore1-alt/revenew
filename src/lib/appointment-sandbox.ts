export const APPOINTMENT_SANDBOX_WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
] as const;

export type AppointmentSandboxWeekday = (typeof APPOINTMENT_SANDBOX_WEEKDAYS)[number];

export type LocalTimeRange = {
  start: string;
  end: string;
};

export type WeeklyWorkingHours = Partial<Record<AppointmentSandboxWeekday, readonly LocalTimeRange[]>>;

export type AppointmentSandboxInterval = {
  start: string;
  end: string;
  reason: string;
};

export type AppointmentSandboxService = {
  id: string;
  name: string;
  durationMinutes: number;
  bufferMinutes: number;
  allowedStaffIds: readonly string[];
  price?: {
    amount: number;
    currency: string;
  };
  active: boolean;
};

export type AppointmentSandboxStaff = {
  id: string;
  name: string;
  active: boolean;
  workingHours: WeeklyWorkingHours;
  servicesAllowed: readonly string[];
  unavailableIntervals: readonly AppointmentSandboxInterval[];
};

export type ExistingSandboxAppointment = {
  id: string;
  staffId: string;
  serviceId: string;
  start: string;
  end: string;
  bufferMinutes: number;
  status: "pending" | "approved" | "cancelled";
};

export type AppointmentSandboxBookingRules = {
  slotIntervalMinutes: number;
  maxSuggestions: 1 | 2 | 3;
  searchDays: number;
};

export type SalonSandboxProfile = {
  salonId: string;
  salonName: string;
  timezone: string;
  businessHours: WeeklyWorkingHours;
  services: readonly AppointmentSandboxService[];
  staff: readonly AppointmentSandboxStaff[];
  existingAppointments: readonly ExistingSandboxAppointment[];
  unavailableIntervals: readonly AppointmentSandboxInterval[];
  bookingRules: AppointmentSandboxBookingRules;
};

export type AppointmentSandboxRequest = {
  serviceId: string;
  preferredDate: string;
  preferredTimeWindow?: LocalTimeRange;
  preferredStaffId?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
};

export type AppointmentSandboxSlot = {
  salonId: string;
  serviceId: string;
  staffId: string;
  staffName: string;
  timezone: string;
  localDate: string;
  localStart: string;
  localEnd: string;
  start: string;
  end: string;
  bufferedEnd: string;
  durationMinutes: number;
  bufferMinutes: number;
  reasons: string[];
};

export type AppointmentSandboxFailureCode =
  | "invalid_profile"
  | "invalid_request"
  | "service_not_found"
  | "service_inactive"
  | "preferred_staff_not_found"
  | "preferred_staff_inactive"
  | "preferred_staff_incompatible"
  | "no_slots_available";

export type AppointmentSandboxProposal =
  | {
      ok: true;
      timezone: string;
      serviceId: string;
      slots: AppointmentSandboxSlot[];
      message: string;
    }
  | {
      ok: false;
      timezone: string;
      serviceId: string;
      slots: [];
      code: AppointmentSandboxFailureCode;
      message: string;
    };

export type PendingSandboxBooking = {
  status: "pending_approval";
  salonId: string;
  timezone: string;
  requestedSlot: AppointmentSandboxSlot;
  customerSummary: {
    name: string | null;
    phoneProvided: boolean;
    notes: string | null;
  };
  requiresHumanApproval: true;
  externalSideEffect: false;
  auditRequired: true;
  confirmedAt: null;
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type CandidateContext = {
  fallbackFromPreferredStaff: boolean;
  preferredStaffId: string | null;
};

const MINUTE_MS = 60_000;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function failure(
  profile: Pick<SalonSandboxProfile, "timezone">,
  request: Pick<AppointmentSandboxRequest, "serviceId">,
  code: AppointmentSandboxFailureCode,
  message: string
): AppointmentSandboxProposal {
  return { ok: false, timezone: profile.timezone, serviceId: request.serviceId, slots: [], code, message };
}

function cleanText(value: string | undefined, maxLength: number) {
  const result = value?.trim().replace(/[<>]/g, "").slice(0, maxLength);
  return result || null;
}

function isValidTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

function parseDate(value: string) {
  if (!datePattern.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? { year, month, day }
    : null;
}

function minutesForTime(value: string) {
  if (!timePattern.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function timeForMinutes(value: number) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function addLocalDays(date: string, days: number) {
  const parsed = parseDate(date);
  if (!parsed) return null;
  const result = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));
  return result.toISOString().slice(0, 10);
}

function weekdayForDate(date: string): AppointmentSandboxWeekday | null {
  const parsed = parseDate(date);
  if (!parsed) return null;
  const index = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
  return APPOINTMENT_SANDBOX_WEEKDAYS[(index + 6) % 7];
}

function zonedParts(instantMs: number, timezone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(instantMs));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second
  };
}

function localDateTimeToIso(date: string, time: string, timezone: string) {
  const parsedDate = parseDate(date);
  const localMinutes = minutesForTime(time);
  if (!parsedDate || localMinutes === null || !isValidTimeZone(timezone)) return null;

  const target = Date.UTC(
    parsedDate.year,
    parsedDate.month - 1,
    parsedDate.day,
    Math.floor(localMinutes / 60),
    localMinutes % 60,
    0
  );
  let candidate = target;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const parts = zonedParts(candidate, timezone);
    const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const next = candidate + (target - representedAsUtc);
    if (next === candidate) break;
    candidate = next;
  }

  const verified = zonedParts(candidate, timezone);
  const expectedHour = Math.floor(localMinutes / 60);
  const expectedMinute = localMinutes % 60;
  if (
    verified.year !== parsedDate.year
    || verified.month !== parsedDate.month
    || verified.day !== parsedDate.day
    || verified.hour !== expectedHour
    || verified.minute !== expectedMinute
  ) {
    return null;
  }
  return new Date(candidate).toISOString();
}

function validRange(range: LocalTimeRange) {
  const start = minutesForTime(range.start);
  const end = minutesForTime(range.end);
  return start !== null && end !== null && start < end ? { start, end } : null;
}

function normalizedRanges(ranges: readonly LocalTimeRange[] | undefined) {
  return (ranges ?? [])
    .map(validRange)
    .filter((range): range is { start: number; end: number } => range !== null)
    .sort((left, right) => left.start - right.start || left.end - right.end);
}

function intersectRanges(
  leftRanges: Array<{ start: number; end: number }>,
  rightRanges: Array<{ start: number; end: number }>
) {
  const intersections: Array<{ start: number; end: number }> = [];
  for (const left of leftRanges) {
    for (const right of rightRanges) {
      const start = Math.max(left.start, right.start);
      const end = Math.min(left.end, right.end);
      if (start < end) intersections.push({ start, end });
    }
  }
  return intersections;
}

function overlaps(start: number, end: number, otherStart: number, otherEnd: number) {
  return start < otherEnd && otherStart < end;
}

function intervalConflicts(start: number, bufferedEnd: number, interval: AppointmentSandboxInterval) {
  const intervalStart = Date.parse(interval.start);
  const intervalEnd = Date.parse(interval.end);
  return Number.isFinite(intervalStart)
    && Number.isFinite(intervalEnd)
    && intervalStart < intervalEnd
    && overlaps(start, bufferedEnd, intervalStart, intervalEnd);
}

function appointmentConflicts(
  start: number,
  bufferedEnd: number,
  appointment: ExistingSandboxAppointment,
  staffId: string
) {
  if (appointment.staffId !== staffId || appointment.status === "cancelled") return false;
  const appointmentStart = Date.parse(appointment.start);
  const appointmentEnd = Date.parse(appointment.end);
  if (!Number.isFinite(appointmentStart) || !Number.isFinite(appointmentEnd) || appointmentStart >= appointmentEnd) return false;
  return overlaps(start, bufferedEnd, appointmentStart, appointmentEnd + Math.max(0, appointment.bufferMinutes) * MINUTE_MS);
}

function staffCanPerformService(staff: AppointmentSandboxStaff, service: AppointmentSandboxService) {
  return staff.active
    && service.allowedStaffIds.includes(staff.id)
    && staff.servicesAllowed.includes(service.id);
}

function validateProfile(profile: SalonSandboxProfile) {
  return Boolean(
    profile.salonId.trim()
    && profile.salonName.trim()
    && isValidTimeZone(profile.timezone)
    && Number.isInteger(profile.bookingRules.slotIntervalMinutes)
    && profile.bookingRules.slotIntervalMinutes >= 5
    && profile.bookingRules.slotIntervalMinutes <= 120
    && Number.isInteger(profile.bookingRules.searchDays)
    && profile.bookingRules.searchDays >= 1
    && profile.bookingRules.searchDays <= 31
    && [1, 2, 3].includes(profile.bookingRules.maxSuggestions)
  );
}

function candidatesForStaff(
  profile: SalonSandboxProfile,
  service: AppointmentSandboxService,
  staff: AppointmentSandboxStaff,
  request: AppointmentSandboxRequest,
  context: CandidateContext
) {
  const candidates: AppointmentSandboxSlot[] = [];
  const totalMinutes = service.durationMinutes + service.bufferMinutes;

  for (let offset = 0; offset < profile.bookingRules.searchDays; offset += 1) {
    const date = addLocalDays(request.preferredDate, offset);
    const weekday = date ? weekdayForDate(date) : null;
    if (!date || !weekday) continue;

    let availability = intersectRanges(
      normalizedRanges(profile.businessHours[weekday]),
      normalizedRanges(staff.workingHours[weekday])
    );
    if (offset === 0 && request.preferredTimeWindow) {
      const preferred = validRange(request.preferredTimeWindow);
      availability = preferred ? intersectRanges(availability, [preferred]) : [];
    }

    for (const range of availability) {
      for (
        let startMinute = range.start;
        startMinute + totalMinutes <= range.end;
        startMinute += profile.bookingRules.slotIntervalMinutes
      ) {
        const localStart = timeForMinutes(startMinute);
        const localEnd = timeForMinutes(startMinute + service.durationMinutes);
        const localBufferedEnd = timeForMinutes(startMinute + totalMinutes);
        const startIso = localDateTimeToIso(date, localStart, profile.timezone);
        const endIso = localDateTimeToIso(date, localEnd, profile.timezone);
        const bufferedEndIso = localDateTimeToIso(date, localBufferedEnd, profile.timezone);
        if (!startIso || !endIso || !bufferedEndIso) continue;

        const start = Date.parse(startIso);
        const end = Date.parse(endIso);
        const bufferedEnd = Date.parse(bufferedEndIso);
        if (
          end - start !== service.durationMinutes * MINUTE_MS
          || bufferedEnd - end !== service.bufferMinutes * MINUTE_MS
        ) {
          continue;
        }
        if (profile.existingAppointments.some((appointment) => appointmentConflicts(start, bufferedEnd, appointment, staff.id))) {
          continue;
        }
        if (profile.unavailableIntervals.some((interval) => intervalConflicts(start, bufferedEnd, interval))) {
          continue;
        }
        if (staff.unavailableIntervals.some((interval) => intervalConflicts(start, bufferedEnd, interval))) {
          continue;
        }

        const reasons = [
          `Intervalul respectă programul salonului și programul ${staff.name}.`,
          `${service.name} folosește ${service.durationMinutes} minute și un buffer de ${service.bufferMinutes} minute.`,
          `${staff.name} este activă și calificată pentru serviciul solicitat.`,
          "Intervalul nu se suprapune peste programări sau indisponibilități locale."
        ];
        if (context.preferredStaffId === staff.id) {
          reasons.push("Persoana preferată este disponibilă.");
        } else if (context.fallbackFromPreferredStaff) {
          reasons.push("Persoana preferată nu are un interval valid; este propusă o persoană calificată alternativă.");
        }

        candidates.push({
          salonId: profile.salonId,
          serviceId: service.id,
          staffId: staff.id,
          staffName: staff.name,
          timezone: profile.timezone,
          localDate: date,
          localStart,
          localEnd,
          start: startIso,
          end: endIso,
          bufferedEnd: bufferedEndIso,
          durationMinutes: service.durationMinutes,
          bufferMinutes: service.bufferMinutes,
          reasons
        });
      }
    }
  }

  return candidates;
}

function selectDistinctSuggestions(candidates: AppointmentSandboxSlot[], limit: number) {
  const selected: AppointmentSandboxSlot[] = [];
  for (const candidate of candidates) {
    const candidateStart = Date.parse(candidate.start);
    const candidateEnd = Date.parse(candidate.bufferedEnd);
    const conflictsWithProposal = selected.some((slot) => overlaps(
      candidateStart,
      candidateEnd,
      Date.parse(slot.start),
      Date.parse(slot.bufferedEnd)
    ));
    if (conflictsWithProposal) continue;
    selected.push(candidate);
    if (selected.length === limit) break;
  }
  return selected;
}

export function proposeAppointmentSlots(
  profile: SalonSandboxProfile,
  request: AppointmentSandboxRequest
): AppointmentSandboxProposal {
  if (!validateProfile(profile)) {
    return failure(profile, request, "invalid_profile", "Configurația locală a salonului este invalidă sau incompletă.");
  }
  if (!parseDate(request.preferredDate) || (request.preferredTimeWindow && !validRange(request.preferredTimeWindow))) {
    return failure(profile, request, "invalid_request", "Data sau intervalul preferat nu are un format local valid.");
  }

  const service = profile.services.find((item) => item.id === request.serviceId);
  if (!service) {
    return failure(profile, request, "service_not_found", "Serviciul solicitat nu există în configurația locală.");
  }
  if (!service.active) {
    return failure(profile, request, "service_inactive", "Serviciul solicitat nu este activ și nu poate primi propuneri.");
  }
  if (
    !Number.isInteger(service.durationMinutes)
    || service.durationMinutes <= 0
    || !Number.isInteger(service.bufferMinutes)
    || service.bufferMinutes < 0
  ) {
    return failure(profile, request, "invalid_profile", "Durata sau bufferul serviciului este invalid.");
  }

  const qualifiedStaff = profile.staff.filter((staff) => staffCanPerformService(staff, service));
  let candidates: AppointmentSandboxSlot[] = [];

  if (request.preferredStaffId) {
    const preferred = profile.staff.find((staff) => staff.id === request.preferredStaffId);
    if (!preferred) {
      return failure(profile, request, "preferred_staff_not_found", "Persoana preferată nu există în configurația locală.");
    }
    if (!preferred.active) {
      return failure(profile, request, "preferred_staff_inactive", "Persoana preferată nu este activă.");
    }
    if (!staffCanPerformService(preferred, service)) {
      return failure(profile, request, "preferred_staff_incompatible", "Persoana preferată nu este calificată pentru serviciul solicitat.");
    }

    candidates = candidatesForStaff(profile, service, preferred, request, {
      fallbackFromPreferredStaff: false,
      preferredStaffId: preferred.id
    });
    if (candidates.length === 0) {
      candidates = qualifiedStaff
        .filter((staff) => staff.id !== preferred.id)
        .flatMap((staff) => candidatesForStaff(profile, service, staff, request, {
          fallbackFromPreferredStaff: true,
          preferredStaffId: preferred.id
        }));
    }
  } else {
    candidates = qualifiedStaff.flatMap((staff) => candidatesForStaff(profile, service, staff, request, {
      fallbackFromPreferredStaff: false,
      preferredStaffId: null
    }));
  }

  candidates.sort((left, right) => (
    left.start.localeCompare(right.start)
    || left.staffName.localeCompare(right.staffName, "ro-RO")
    || left.staffId.localeCompare(right.staffId)
  ));
  const slots = selectDistinctSuggestions(candidates, profile.bookingRules.maxSuggestions);
  if (slots.length === 0) {
    return failure(
      profile,
      request,
      "no_slots_available",
      `Nu există intervale valide pentru ${service.name} în fereastra locală verificată. Ajustează data, intervalul sau persoana preferată.`
    );
  }

  return {
    ok: true,
    timezone: profile.timezone,
    serviceId: service.id,
    slots,
    message: `${slots.length} ${slots.length === 1 ? "interval valid este propus" : "intervale valide sunt propuse"} pentru aprobare umană.`
  };
}

export function createPendingSandboxBooking(
  profile: SalonSandboxProfile,
  request: AppointmentSandboxRequest,
  slot: AppointmentSandboxSlot
): PendingSandboxBooking {
  if (
    slot.salonId !== profile.salonId
    || slot.timezone !== profile.timezone
    || slot.serviceId !== request.serviceId
    || !profile.staff.some((staff) => staff.id === slot.staffId)
  ) {
    throw new Error("Intervalul nu aparține solicitării și configurației locale curente.");
  }

  return {
    status: "pending_approval",
    salonId: profile.salonId,
    timezone: profile.timezone,
    requestedSlot: slot,
    customerSummary: {
      name: cleanText(request.customerName, 120),
      phoneProvided: Boolean(request.customerPhone?.trim()),
      notes: cleanText(request.notes, 500)
    },
    requiresHumanApproval: true,
    externalSideEffect: false,
    auditRequired: true,
    confirmedAt: null
  };
}
