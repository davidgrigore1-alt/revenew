import {
  COPILOT_MAX_HISTORY_TURNS,
  COPILOT_MAX_QUESTION_LENGTH,
  type CopilotAnswer,
  type CopilotConversationTurn,
  type CopilotEvidence,
  type CopilotPageContext,
  type CopilotRequest,
  type CopilotToolResult
} from "@/lib/ai/copilot-types";

const identifierPattern = /^[0-9a-z-]{1,80}$/i;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedRoutePattern = /^\/(?:documents\/local\/[0-9a-f-]{36}(?:\/versions\/[0-9a-f-]{36})?|dashboard|ai|today|approvals|inbox|companies|contacts|apps|opportunities(?:\/[0-9a-z-]+)?|crm\/(?:organizations|contacts)\/[0-9a-z-]+|reports(?:\/[0-9a-z-]+)?|help)(?:#[0-9a-z-]+)?$/i;

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.normalize("NFKC").trim().slice(0, maxLength) : "";
}

export function isSafeCopilotRoute(value: unknown): value is string {
  return typeof value === "string" && value.length <= 180 && allowedRoutePattern.test(value);
}

export function parseCopilotPageContext(value: unknown): CopilotPageContext {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const routeCandidate = text(candidate.route, 180);
  const route = isSafeCopilotRoute(routeCandidate) ? routeCandidate : "/dashboard";
  const organizationId = text(candidate.organizationId, 80);
  const opportunityId = text(candidate.opportunityId, 80);
  const contactId = text(candidate.contactId, 80);
  const selectedRecordId = text(candidate.selectedRecordId, 80);
  const contextLabel = text(candidate.contextLabel, 100);
  const inferredType = route.startsWith("/crm/organizations/") ? "company"
    : route.startsWith("/opportunities/") ? "opportunity"
      : route === "/dashboard" ? "dashboard"
        : route === "/ai" ? "ai" : "other";
  return {
    route,
    pageType: inferredType,
    ...(typeof candidate.documentSourceId === "string" && uuidPattern.test(candidate.documentSourceId) && typeof candidate.documentVersionId === "string" && uuidPattern.test(candidate.documentVersionId) ? { documentSourceId: candidate.documentSourceId, documentVersionId: candidate.documentVersionId, ...(candidate.documentComparisonScope === "workspace" ? {documentComparisonScope:"workspace" as const} : {}) } : {}),
    ...(organizationId && identifierPattern.test(organizationId) ? { organizationId } : {}),
    ...(opportunityId && identifierPattern.test(opportunityId) ? { opportunityId } : {}),
    ...(contactId && identifierPattern.test(contactId) ? { contactId } : {}),
    ...(selectedRecordId && identifierPattern.test(selectedRecordId) ? { selectedRecordId } : {}),
    ...(contextLabel ? { contextLabel } : {})
  };
}

export function parseCopilotRequest(value: unknown): { ok: true; value: CopilotRequest } | { ok: false; error: string } {
  if (!value || typeof value !== "object") return { ok: false, error: "Cererea nu este validă." };
  const candidate = value as Record<string, unknown>;
  const question = text(candidate.question, COPILOT_MAX_QUESTION_LENGTH + 1);
  if (question.length < 2) return { ok: false, error: "Formulează o întrebare de cel puțin două caractere." };
  if (question.length > COPILOT_MAX_QUESTION_LENGTH) return { ok: false, error: `Întrebarea poate avea cel mult ${COPILOT_MAX_QUESTION_LENGTH} de caractere.` };
  const rawHistory = Array.isArray(candidate.history) ? candidate.history.slice(-COPILOT_MAX_HISTORY_TURNS) : [];
  const history = rawHistory.flatMap((turn): CopilotConversationTurn[] => {
    if (!turn || typeof turn !== "object") return [];
    const item = turn as Record<string, unknown>;
    const role = item.role === "user" || item.role === "assistant" ? item.role : null;
    const content = text(item.content, 1200);
    return role && content ? [{ role, content }] : [];
  });
  const rawSelection = candidate.selection && typeof candidate.selection === "object" && !Array.isArray(candidate.selection) ? candidate.selection as Record<string, unknown> : null;
  const resultSetId = text(rawSelection?.resultSetId, 80);
  const selectedRecordIds = Array.from(new Set((Array.isArray(rawSelection?.selectedRecordIds) ? rawSelection.selectedRecordIds : []).map((item) => text(item, 80)).filter((item) => uuidPattern.test(item)))).slice(0, 25);
  const selection = resultSetId && uuidPattern.test(resultSetId) ? { resultSetId, selectedRecordIds } : undefined;
  return { ok: true, value: { question, context: parseCopilotPageContext(candidate.context), history, preparationIntent: candidate.preparationIntent === true, ...(selection ? { selection } : {}) } };
}

function stringArray(value: unknown, limit: number, maxLength = 240) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => text(item, maxLength)).filter(Boolean).slice(0, limit);
}

export function collectAuthorizedSources(results: CopilotToolResult[]) {
  const sources = new Map<string, CopilotEvidence>();
  for (const result of results) {
    for (const source of result.sources) {
      if (!source.sourceId || sources.has(source.sourceId)) continue;
      sources.set(source.sourceId, {
        ...source,
        route: isSafeCopilotRoute(source.route) ? source.route : null,
        fact: text(source.fact, 360),
        label: text(source.label, 160),
        ...(source.recordId && identifierPattern.test(source.recordId) ? { recordId: source.recordId } : {}),
        observedAt: source.observedAt && !Number.isNaN(Date.parse(source.observedAt)) ? source.observedAt : null,
        claimType: source.claimType === "derived" ? "derived" : "fact"
      });
    }
  }
  return sources;
}

function collectCheckedSources(results: CopilotToolResult[]) {
  const checked = new Map<string, CopilotAnswer["checkedSources"][number]>();
  for (const result of results) {
    for (const item of result.checkedSources ?? []) {
      if (!item.providerId || checked.has(item.providerId)) continue;
      checked.set(item.providerId, {
        providerId: text(item.providerId, 80),
        label: text(item.label, 100),
        state: item.state,
        checkedAt: !Number.isNaN(Date.parse(item.checkedAt)) ? item.checkedAt : new Date(0).toISOString(),
        detail: text(item.detail, 220)
      });
    }
  }
  return Array.from(checked.values()).slice(0, 8);
}

function collectPresentation(results: CopilotToolResult[], sources: Map<string, CopilotEvidence>): CopilotAnswer["presentation"] {
  const result = results.find((item) => item.toolName === "get_external_context" && item.data && typeof item.data === "object");
  if (!result) return null;
  const data = result.data as Record<string, unknown>;
  const clean = (value: unknown, limit: number) => text(value, limit) || null;
  const emails = (Array.isArray(data.emails) ? data.emails : []).flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    const sourceId = clean(item.sourceId, 180);
    const recordId = clean(item.recordId, 80);
    const sentAt = clean(item.sentAt, 40);
    if (!sourceId || !sources.has(sourceId) || !recordId || !identifierPattern.test(recordId) || !sentAt || Number.isNaN(Date.parse(sentAt))) return [];
    const recipients = (Array.isArray(item.recipients) ? item.recipients : []).flatMap((party) => {
      if (!party || typeof party !== "object") return [];
      const record = party as Record<string, unknown>;
      const email = clean(record.email, 180);
      return email ? [{ email, name: clean(record.name, 120) }] : [];
    }).slice(0, 12);
    return [{
      sourceId, recordId, recipients, sentAt, direction: item.direction === "outbound" ? "outbound" as const : "inbound" as const,
      senderName: clean(item.senderName, 120), senderEmail: clean(item.senderEmail, 180), subject: clean(item.subject, 180), excerpt: clean(item.excerpt, 320),
      linkedContactId: clean(item.linkedContactId, 80), linkedOrganizationId: clean(item.linkedOrganizationId, 80), linkedOpportunityId: clean(item.linkedOpportunityId, 80)
    }];
  }).slice(0, 8);
  const meetings = (Array.isArray(data.meetings) ? data.meetings : []).flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    const sourceId = clean(item.sourceId, 180);
    const startsAt = clean(item.startsAt, 40);
    const endsAt = clean(item.endsAt, 40);
    if (!sourceId || !sources.has(sourceId) || !startsAt || !endsAt || Number.isNaN(Date.parse(startsAt)) || Number.isNaN(Date.parse(endsAt))) return [];
    const participants = (Array.isArray(item.participants) ? item.participants : []).flatMap((party) => {
      if (!party || typeof party !== "object") return [];
      const record = party as Record<string, unknown>;
      const email = clean(record.email, 180);
      return email ? [{ email, name: clean(record.name, 120) }] : [];
    }).slice(0, 12);
    const organizerRecord = item.organizer && typeof item.organizer === "object" ? item.organizer as Record<string, unknown> : null;
    const organizerEmail = organizerRecord ? clean(organizerRecord.email, 180) : null;
    return [{ sourceId, startsAt, endsAt, title: clean(item.title, 180), participants, organizer: organizerEmail ? { email: organizerEmail, name: clean(organizerRecord?.name, 120) } : null, status: clean(item.status, 40) ?? "confirmed", description: clean(item.description, 280), linkedOrganizationId: clean(item.linkedOrganizationId, 80), linkedOpportunityId: clean(item.linkedOpportunityId, 80) }];
  }).slice(0, 10);
  const range = data.checkedInterval && typeof data.checkedInterval === "object" ? data.checkedInterval as Record<string, unknown> : null;
  const from = range ? clean(range.from, 40) : null;
  const to = range ? clean(range.to, 40) : null;
  const calendarWindow = from && to && !Number.isNaN(Date.parse(from)) && !Number.isNaN(Date.parse(to)) ? { from, to, confirmedEmpty: data.confirmedEmpty === true } : null;
  if (!emails.length && !meetings.length && !calendarWindow) return null;
  return { kind: emails.length && meetings.length ? "mixed" : emails.length ? "email" : "calendar", emails, meetings, changes: [], calendarWindow };
}

export function validateCopilotAnswer(value: unknown, toolResults: CopilotToolResult[], providerAvailable = true): CopilotAnswer {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const sources = collectAuthorizedSources(toolResults);
  const requestedEvidence = Array.isArray(candidate.evidence) ? candidate.evidence : [];
  const evidence = requestedEvidence.flatMap((item): CopilotEvidence[] => {
    if (!item || typeof item !== "object") return [];
    const sourceId = text((item as Record<string, unknown>).sourceId, 180);
    const source = sources.get(sourceId);
    return source ? [source] : [];
  }).slice(0, 8);
  const sourceBacked = evidence.length > 0;
  const proposedType = candidate.summaryType;
  const summaryType = proposedType === "product_help" || proposedType === "insufficient_information" || proposedType === "temporary_error" || proposedType === "commercial"
    ? proposedType : sourceBacked ? "commercial" : "insufficient_information";
  const answer = text(candidate.answer, 1800);
  const safeAnswer = summaryType === "commercial" && !sourceBacked
    ? "Nu am suficiente informații în ReveNew pentru a confirma asta."
    : answer || "Nu am suficiente informații în ReveNew pentru a confirma asta.";
  const proposedAction = candidate.suggestedAction && typeof candidate.suggestedAction === "object"
    ? candidate.suggestedAction as Record<string, unknown> : null;
  const allowedActionRoutes = new Set(toolResults.flatMap((result) => [result.suggestedAction?.route, ...result.sources.map((source) => source.route)].filter((route): route is string => Boolean(route))));
  const actionRoute = proposedAction ? text(proposedAction.route, 180) : "";
  const suggestedAction = proposedAction && isSafeCopilotRoute(actionRoute) && allowedActionRoutes.has(actionRoute)
    ? { label: text(proposedAction.label, 80) || "Deschide contextul", route: actionRoute }
    : toolResults.find((result) => result.suggestedAction)?.suggestedAction ?? null;
  const missing = stringArray(candidate.missingInformation, 6);
  const toolMissing = toolResults.flatMap((result) => result.missingInformation).filter(Boolean);
  const preparedActionCandidate = toolResults.find((result) => result.preparedAction)?.preparedAction ?? null;
  const preparedAction = preparedActionCandidate
    ? { ...preparedActionCandidate, evidenceSourceIds: preparedActionCandidate.evidenceSourceIds.filter((sourceId) => sources.has(sourceId)).slice(0, 6) }
    : null;
  const findings = evidence.slice(0, 5).map((item) => ({
    label: item.label,
    detail: item.fact,
    kind: item.claimType === "derived" ? "derived" as const : "confirmed" as const,
    sourceIds: [item.sourceId]
  }));
  return {
    answer: safeAnswer,
    summaryType,
    findings,
    evidence,
    checkedSources: collectCheckedSources(toolResults),
    missingInformation: Array.from(new Set([...missing, ...toolMissing])).slice(0, 6),
    caveats: stringArray(candidate.caveats, 5),
    preparedAction,
    suggestedAction,
    followUps: stringArray(candidate.followUps, 3, 120),
    mode: "ai",
    providerAvailable,
    presentation: collectPresentation(toolResults, sources)
  };
}
