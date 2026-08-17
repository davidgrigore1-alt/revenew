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
const allowedRoutePattern = /^\/(?:dashboard|ai|today|approvals|inbox|companies|contacts|opportunities(?:\/[0-9a-z-]+)?|crm\/organizations\/[0-9a-z-]+|reports(?:\/[0-9a-z-]+)?|help)(?:#[0-9a-z-]+)?$/i;

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
  const inferredType = route.startsWith("/crm/organizations/") ? "company"
    : route.startsWith("/opportunities/") ? "opportunity"
      : route === "/dashboard" ? "dashboard"
        : route === "/ai" ? "ai" : "other";
  return {
    route,
    pageType: inferredType,
    ...(organizationId && identifierPattern.test(organizationId) ? { organizationId } : {}),
    ...(opportunityId && identifierPattern.test(opportunityId) ? { opportunityId } : {})
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
  return { ok: true, value: { question, context: parseCopilotPageContext(candidate.context), history } };
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
        label: text(source.label, 160)
      });
    }
  }
  return sources;
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
  return {
    answer: safeAnswer,
    summaryType,
    evidence,
    missingInformation: Array.from(new Set([...missing, ...toolMissing])).slice(0, 6),
    caveats: stringArray(candidate.caveats, 5),
    suggestedAction,
    followUps: stringArray(candidate.followUps, 3, 120),
    mode: "ai",
    providerAvailable
  };
}
