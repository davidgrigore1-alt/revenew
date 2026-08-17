import "server-only";

import type { Tool } from "openai/resources/responses/responses";
import type { CopilotEvidence, CopilotPageContext, CopilotToolName, CopilotToolResult } from "@/lib/ai/copilot-types";
import { getCompanyIntelligenceSnapshot } from "@/lib/company-intelligence";
import { discoverCommercialOpportunityCandidates } from "@/lib/commercial-opportunity-discovery";
import { findContextualHelp } from "@/lib/contextual-help";
import { buildExecutiveMorningBrief } from "@/lib/executive-morning-brief";
import { buildOpportunityIntelligenceTimeline } from "@/lib/opportunity-intelligence-timeline";
import { getRevenueWorkspaceSummary } from "@/lib/revenue-workspace";
import { searchWorkspace } from "@/lib/search/actions";
import { getOpportunityForCurrentBusiness } from "@/lib/supabase/data";
import { buildWorkspaceDecisionQueue } from "@/lib/workspace-decision-queue";

type ToolExecutionContext = { page: CopilotPageContext };

const idPattern = /^[0-9a-z-]{1,80}$/i;

function objectArgs(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function boundedString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.normalize("NFKC").trim().slice(0, maxLength) : "";
}

function safeId(value: unknown) {
  const id = boundedString(value, 80);
  return idPattern.test(id) ? id : "";
}

function source(input: CopilotEvidence): CopilotEvidence {
  return { ...input, fact: input.fact.slice(0, 360), label: input.label.slice(0, 160) };
}

function empty(toolName: CopilotToolName, missingInformation: string[], suggestedAction: CopilotToolResult["suggestedAction"] = null): CopilotToolResult {
  return { toolName, state: "empty", data: {}, sources: [], missingInformation, suggestedAction };
}

export const copilotToolDefinitions: Tool[] = [
  {
    type: "function",
    name: "search_commercial_context",
    description: "Caută determinist entități și situații comerciale autorizate. Returnează rezultate, rute, motivul potrivirii și dovezi. Folosește pentru rezolvare de nume, sume, lipsă responsabil, lipsă pas următor sau follow-up restant.",
    strict: true,
    parameters: { type: "object", additionalProperties: false, required: ["query"], properties: { query: { type: "string", minLength: 2, maxLength: 160 } } }
  },
  {
    type: "function",
    name: "get_daily_brief",
    description: "Returnează brief-ul executiv și cele mai importante bucle deschise deja clasificate de ReveNew. Nu recrea clasamentul independent.",
    strict: true,
    parameters: { type: "object", additionalProperties: false, required: [], properties: {} }
  },
  {
    type: "function",
    name: "get_company_context",
    description: "Returnează memoria comercială, buclele deschise, informațiile lipsă, oportunitățile și activitatea recentă pentru o companie autorizată.",
    strict: true,
    parameters: { type: "object", additionalProperties: false, required: ["organizationId"], properties: { organizationId: { type: "string", minLength: 1, maxLength: 80 } } }
  },
  {
    type: "function",
    name: "get_opportunity_context",
    description: "Returnează starea, valoarea estimată neconfirmată, responsabilul, pasul următor, dovezile și istoricul comercial pentru o oportunitate autorizată.",
    strict: true,
    parameters: { type: "object", additionalProperties: false, required: ["opportunityId"], properties: { opportunityId: { type: "string", minLength: 1, maxLength: 80 } } }
  },
  {
    type: "function",
    name: "get_commercial_discoveries",
    description: "Returnează semnale comerciale candidate și explicațiile lor. Candidatele nu sunt oportunități confirmate.",
    strict: true,
    parameters: { type: "object", additionalProperties: false, required: [], properties: {} }
  },
  {
    type: "function",
    name: "get_product_help",
    description: "Returnează ghidarea deterministă și verificată despre cum se folosește pagina sau o funcție ReveNew. Nu furnizează fapte comerciale.",
    strict: true,
    parameters: { type: "object", additionalProperties: false, required: ["question"], properties: { question: { type: "string", minLength: 2, maxLength: 240 } } }
  }
];

async function searchTool(args: Record<string, unknown>): Promise<CopilotToolResult> {
  const query = boundedString(args.query, 160);
  if (query.length < 2) return empty("search_commercial_context", ["O întrebare comercială suficient de precisă"]);
  const result = await searchWorkspace(query);
  const limited = result.results.slice(0, 12);
  const sources = limited.map((item, index) => source({
    sourceId: `search:${item.entityType}:${item.id}:${index}`,
    label: item.title,
    sourceType: item.entityType === "company" ? "Companie" : item.entityType === "contact" ? "Contact" : item.entityType === "opportunity" ? "Oportunitate" : item.entityType === "action" ? "Acțiune" : "Document",
    route: item.href,
    fact: `${item.reason} ${item.context}`
  }));
  return {
    toolName: "search_commercial_context",
    state: sources.length ? "ready" : "empty",
    data: { summary: result.summary, intent: result.intent.kind, results: limited.map((item, index) => ({ id: item.id, title: item.title, type: item.entityType, route: item.href, context: item.context, reason: item.reason, sourceId: sources[index].sourceId })) },
    sources,
    missingInformation: result.insufficientData ? ["Nu există o potrivire suficientă în datele autorizate."] : [],
    suggestedAction: limited[0] ? { label: limited[0].entityType === "opportunity" ? "Deschide oportunitatea" : "Deschide contextul", route: limited[0].href } : null
  };
}

async function dailyBriefTool(): Promise<CopilotToolResult> {
  const summary = await getRevenueWorkspaceSummary();
  const queue = buildWorkspaceDecisionQueue({ opportunities: summary.opportunities, signals: summary.signals }, { limit: 20 });
  const brief = buildExecutiveMorningBrief(queue, { actions: summary.actions, events: summary.events, signals: summary.signals, assignedToday: { dueToday: summary.workQueue.dueToday.length, overdue: summary.workQueue.overdue.length }, scope: summary.viewer.isManager ? "management" : "individual" });
  const priorities = [brief.primaryPriority, ...brief.secondaryPriorities].filter((item): item is NonNullable<typeof item> => Boolean(item)).slice(0, 5);
  const sources = priorities.flatMap((item) => item.evidence.slice(0, 2).map((evidence, index) => source({
    sourceId: `brief:${item.id}:${evidence.sourceType}:${evidence.sourceId}:${index}`,
    label: evidence.label,
    sourceType: "Brief executiv",
    route: evidence.href,
    fact: `${item.title}. ${item.reason}${item.amount && item.currency ? ` Valoare estimată ${item.amount} ${item.currency}, nu venit confirmat.` : ""}`
  }))).slice(0, 10);
  return {
    toolName: "get_daily_brief",
    state: priorities.length ? "ready" : "empty",
    data: {
      state: brief.state,
      headline: brief.headline,
      summary: brief.summary,
      scope: brief.scope,
      estimatedExposedValueByCurrency: brief.estimatedExposedValueByCurrency,
      valuesAreEstimatedAndUnconfirmed: true,
      priorities: priorities.map((item) => ({ id: item.id, title: item.title, company: item.company, opportunity: item.opportunity, reason: item.reason, whyItMatters: item.whyItMatters, supportingFacts: item.supportingFacts.slice(0, 4), amount: item.amount, currency: item.currency, dueAt: item.dueAt, safeAction: item.safeAction, evidenceSourceIds: sources.filter((evidence) => evidence.sourceId.startsWith(`brief:${item.id}:`)).map((evidence) => evidence.sourceId) })),
      recentChanges: brief.recentChanges.slice(0, 5)
    },
    sources,
    missingInformation: brief.state === "insufficient" ? ["Nu există suficiente date operaționale pentru un brief complet."] : [],
    suggestedAction: brief.primaryPriority ? { label: brief.primaryPriority.safeAction.label, route: brief.primaryPriority.safeAction.href } : null
  };
}

async function companyTool(args: Record<string, unknown>, context: ToolExecutionContext): Promise<CopilotToolResult> {
  const organizationId = safeId(args.organizationId) || context.page.organizationId || "";
  if (!organizationId) return empty("get_company_context", ["Compania autorizată la care se referă întrebarea"]);
  const result = await getCompanyIntelligenceSnapshot(organizationId);
  if (!result.ready || !result.snapshot) return empty("get_company_context", ["Compania nu este disponibilă în spațiul de lucru autorizat."]);
  const snapshot = result.snapshot;
  const memoryItems = [...snapshot.memory.mustRemember, ...snapshot.memory.openLoops].filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 8);
  const recent = snapshot.memory.recentEvidence.slice(0, 6);
  const sources = [
    ...memoryItems.map((item) => source({ sourceId: `company:${organizationId}:memory:${item.id}`, label: item.evidence.label, sourceType: "Memorie comercială", route: item.href ?? item.evidence.href ?? `/crm/organizations/${organizationId}`, fact: `${item.title}. ${item.description}` })),
    ...recent.map((item) => source({ sourceId: `company:${organizationId}:timeline:${item.id}`, label: item.evidence.label, sourceType: "Istoric comercial", route: item.href ?? item.evidence.href ?? `/crm/organizations/${organizationId}`, fact: `${item.label}. ${item.description}` }))
  ].slice(0, 12);
  return {
    toolName: "get_company_context",
    state: "ready",
    data: {
      company: { id: organizationId, name: snapshot.organization.name, industry: snapshot.identity.industry, location: snapshot.identity.location, primaryContact: snapshot.identity.primaryContact?.fullName ?? null },
      commercial: snapshot.commercial,
      nextSafeAction: snapshot.canonicalNextAction,
      mustRemember: memoryItems.slice(0, 5).map((item) => ({ title: item.title, description: item.description, occurredAt: item.occurredAt, route: item.href, sourceId: `company:${organizationId}:memory:${item.id}` })),
      openLoops: snapshot.memory.openLoops.slice(0, 6).map((item) => ({ title: item.title, description: item.description, occurredAt: item.occurredAt, route: item.href, sourceId: `company:${organizationId}:memory:${item.id}` })),
      criticalGaps: snapshot.memory.criticalGaps.slice(0, 6).map((gap) => gap.label),
      opportunities: snapshot.opportunities.slice(0, 8),
      recentActivity: recent.map((item) => ({ label: item.label, description: item.description, occurredAt: item.occurredAt, route: item.href, sourceId: `company:${organizationId}:timeline:${item.id}` }))
    },
    sources,
    missingInformation: snapshot.memory.criticalGaps.slice(0, 6).map((gap) => gap.label),
    suggestedAction: memoryItems[0]?.href ? { label: memoryItems[0].actionLabel, route: memoryItems[0].href } : snapshot.canonicalNextAction ? { label: "Revizuiește acțiunea", route: snapshot.canonicalNextAction.href } : { label: "Deschide Company 360", route: `/crm/organizations/${organizationId}` }
  };
}

async function opportunityTool(args: Record<string, unknown>, context: ToolExecutionContext): Promise<CopilotToolResult> {
  const opportunityId = safeId(args.opportunityId) || context.page.opportunityId || "";
  if (!opportunityId) return empty("get_opportunity_context", ["Oportunitatea autorizată la care se referă întrebarea"]);
  const opportunity = await getOpportunityForCurrentBusiness(opportunityId);
  if (!opportunity) return empty("get_opportunity_context", ["Oportunitatea nu este disponibilă în spațiul de lucru autorizat."]);
  const timeline = buildOpportunityIntelligenceTimeline({ opportunity }, { limit: 16 });
  const primaryAction = opportunity.actions.find((action) => action.status === "pending") ?? null;
  const baseRoute = `/opportunities/${opportunity.id}`;
  const sources: CopilotEvidence[] = [source({
    sourceId: `opportunity:${opportunity.id}`,
    label: opportunity.title,
    sourceType: "Oportunitate",
    route: baseRoute,
    fact: `Stare ${timeline.currentState.status}. Valoare estimată ${opportunity.estimatedValueHigh} ${opportunity.currency ?? "RON"}, nu venit confirmat. Responsabil: ${opportunity.ownerName ?? "neconfirmat"}.`
  })];
  for (const event of timeline.events.slice(0, 10)) {
    sources.push(source({ sourceId: `opportunity:${opportunity.id}:timeline:${event.id}`, label: event.title, sourceType: "Istoric comercial", route: event.source.href ?? `${baseRoute}#opportunity-evidence`, fact: `${event.title}. ${event.summary}` }));
  }
  return {
    toolName: "get_opportunity_context",
    state: "ready",
    data: {
      opportunity: { id: opportunity.id, title: opportunity.title, status: timeline.currentState.status, ownerName: opportunity.ownerName ?? null, estimatedValue: opportunity.estimatedValueHigh, currency: opportunity.currency ?? "RON", valueIsEstimatedAndUnconfirmed: true, summary: opportunity.summary, risks: opportunity.risks.slice(0, 6), recommendedAction: opportunity.recommendedAction },
      currentState: timeline.currentState,
      nextAction: primaryAction ? { id: primaryAction.id, title: primaryAction.title, dueAt: primaryAction.dueDate, status: primaryAction.status } : null,
      contact: opportunity.contacts?.find((contact) => contact.isPrimary)?.contact.fullName ?? opportunity.contacts?.[0]?.contact.fullName ?? null,
      events: timeline.events.slice(0, 10).map((event) => ({ occurredAt: event.occurredAt, title: event.title, summary: event.summary, nature: event.nature, sourceId: `opportunity:${opportunity.id}:timeline:${event.id}` }))
    },
    sources,
    missingInformation: [!opportunity.ownerName ? "Responsabil confirmat" : "", !primaryAction ? "Următoare acțiune confirmată" : "", !(opportunity.contacts?.length) ? "Contact asociat" : ""].filter(Boolean),
    suggestedAction: { label: "Revizuiește oportunitatea", route: baseRoute }
  };
}

async function discoveriesTool(): Promise<CopilotToolResult> {
  const summary = await getRevenueWorkspaceSummary();
  const discovery = discoverCommercialOpportunityCandidates({ opportunities: summary.opportunities, signals: summary.signals });
  const candidates = discovery.candidates.slice(0, 8);
  const sources = candidates.map((candidate) => source({ sourceId: `discovery:${candidate.id}`, label: candidate.sourceTitle, sourceType: "Semnal comercial", route: candidate.sourceHref, fact: `${candidate.reason} ${candidate.whyItMatters}` }));
  return {
    toolName: "get_commercial_discoveries",
    state: candidates.length ? "ready" : "empty",
    data: { state: discovery.state, candidates: candidates.map((candidate) => ({ id: candidate.id, sourceTitle: candidate.sourceTitle, companyName: candidate.companyName, reason: candidate.reason, whyItMatters: candidate.whyItMatters, evidenceStrength: candidate.evidenceStrength, missingInformation: candidate.missingInformation.slice(0, 4), explicitAmount: candidate.explicitAmount, currency: candidate.currency, valuesAreNotConfirmedOpportunities: true, reviewRoute: candidate.reviewHref, sourceId: `discovery:${candidate.id}` })) },
    sources,
    missingInformation: discovery.state === "insufficient_data" ? ["Nu există suficiente semnale comerciale pentru analiză."] : [],
    suggestedAction: candidates[0] ? { label: candidates[0].safeNextAction, route: candidates[0].reviewHref } : null
  };
}

function productHelpTool(args: Record<string, unknown>, context: ToolExecutionContext): CopilotToolResult {
  const question = boundedString(args.question, 240);
  const result = findContextualHelp(question, context.page.route);
  if (!result.matched || !result.entry) return empty("get_product_help", ["Nu există încă o instrucțiune verificată pentru această întrebare."], { label: "Deschide Ajutor", route: "/help" });
  const entry = result.entry;
  const route = entry.routes.find((candidate) => context.page.route === candidate || context.page.route.startsWith(`${candidate}/`)) ?? entry.routes[0];
  const evidence = source({ sourceId: `help:${entry.id}`, label: entry.title, sourceType: "Ghid ReveNew", route, fact: `${entry.shortAnswer} Pași: ${entry.steps.slice(0, 5).join(" ")}` });
  return { toolName: "get_product_help", state: "ready", data: { title: entry.title, answer: entry.shortAnswer, steps: entry.steps.slice(0, 5), safetyNote: entry.safetyNote ?? null, sourceId: evidence.sourceId }, sources: [evidence], missingInformation: [], suggestedAction: { label: entry.primaryActionLabel ?? "Deschide pagina", route } };
}

export async function executeCopilotTool(name: string, rawArguments: unknown, context: ToolExecutionContext): Promise<CopilotToolResult> {
  const args = objectArgs(rawArguments);
  try {
    if (name === "search_commercial_context") return await searchTool(args);
    if (name === "get_daily_brief") return await dailyBriefTool();
    if (name === "get_company_context") return await companyTool(args, context);
    if (name === "get_opportunity_context") return await opportunityTool(args, context);
    if (name === "get_commercial_discoveries") return await discoveriesTool();
    if (name === "get_product_help") return productHelpTool(args, context);
    return { toolName: "get_product_help", state: "forbidden", data: {}, sources: [], missingInformation: ["Instrumentul solicitat nu este permis."], suggestedAction: null };
  } catch (error) {
    console.warn("copilot_tool_failed", { tool: name, errorType: error instanceof Error ? error.name : "UnknownError" });
    return { toolName: (copilotToolDefinitions.some((tool) => tool.type === "function" && tool.name === name) ? name : "get_product_help") as CopilotToolName, state: "error", data: {}, sources: [], missingInformation: ["Sursa nu a putut fi verificată temporar."], suggestedAction: null };
  }
}
