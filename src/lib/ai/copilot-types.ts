import type { CopilotWorkflowDraftPreview } from "@/lib/workflow-drafting";
import type { MultiRecordBatchAction, MultiRecordCandidate, MultiRecordFilter, MultiRecordSort } from "@/lib/ai/multi-record-planning-core";

export const COPILOT_MAX_QUESTION_LENGTH = 3000;
export const COPILOT_MAX_HISTORY_TURNS = 8;
export const COPILOT_MAX_TOOL_CALLS = 6;
export const COPILOT_MAX_TOOL_ROUNDS = 4;

export type CopilotPageType = "dashboard" | "company" | "opportunity" | "ai" | "other";

export type CopilotPageContext = {
  route: string;
  pageType: CopilotPageType;
  organizationId?: string;
  opportunityId?: string;
  contactId?: string;
  selectedRecordId?: string;
  contextLabel?: string;
  documentSourceId?: string;
  documentVersionId?: string;
  documentComparisonScope?: "workspace";
};

export type CopilotConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export type CopilotSourceType =
  | "Companie"
  | "Contact"
  | "Oportunitate"
  | "Acțiune"
  | "Semnal comercial"
  | "Document"
  | "Aprobare"
  | "Istoric comercial"
  | "Brief executiv"
  | "Memorie comercială"
  | "Ghid ReveNew"
  | "Calendar"
  | "Email"
  | "Eveniment calendar";

export type CopilotEvidence = {
  comparisonKind?: import("./intelligence-comparison-core").ComparisonKind;
  provenance?: import("./intelligence-evidence").EvidenceEnvelope;
  sourceId: string;
  label: string;
  sourceType: CopilotSourceType;
  route: string | null;
  fact: string;
  recordId?: string;
  observedAt?: string | null;
  claimType?: "fact" | "derived";
  providerId?: string;
};

export type CopilotFinding = {
  label: string;
  detail: string;
  kind: "confirmed" | "derived" | "missing";
  sourceIds: string[];
};

export type CopilotSourceCheck = {
  providerId: string;
  label: string;
  state: "available" | "not_connected" | "unavailable" | "forbidden";
  checkedAt: string;
  detail: string;
};

export type CopilotPreparedAction = {
  id: string;
  type: "email_draft" | "task_draft" | "next_action_draft" | "record_update_draft" | "notification_draft" | "meeting_brief_draft" | "followup_plan_draft";
  title: string;
  status: "prepared_not_executed";
  editable: true;
  subject?: string;
  body?: string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  rationale: string;
  evidenceSourceIds: string[];
  executionNotice: string;
  planId?: string;
  actionType?: "create_task" | "update_next_action" | "assign_owner" | "add_note" | "prepare_email" | "update_opportunity_field" | "create_notification";
  riskLevel?: "low" | "review" | "external";
  target?: { type: "opportunity" | "organization" | "contact" | "email" | "meeting"; id: string; label: string };
  proposal?: Record<string, unknown>;
  ownerResolutionRequired?: boolean;
};

export type CopilotSuggestedAction = {
  label: string;
  route: string;
} | null;

export type CopilotEmailPresentationItem = {
  sourceId: string;
  recordId: string;
  recipients: Array<{ email: string; name: string | null }>;
  linkedContactId: string | null;
  sentAt: string;
  direction: "inbound" | "outbound";
  senderName: string | null;
  senderEmail: string | null;
  subject: string | null;
  excerpt: string | null;
  linkedOrganizationId: string | null;
  linkedOpportunityId: string | null;
};

export type CopilotMeetingPresentationItem = {
  sourceId: string;
  title: string | null;
  startsAt: string;
  endsAt: string;
  participants: Array<{ email: string; name: string | null }>;
  organizer: { email: string; name: string | null } | null;
  status: string;
  description: string | null;
  linkedOrganizationId: string | null;
  linkedOpportunityId: string | null;
};

export type CopilotRecentChangePresentationItem = {
  sourceId: string;
  recordId: string;
  title: string;
  company: string | null;
  occurredAt: string;
  status: "new" | "reviewed" | "action_generated" | "contacted" | "follow_up_needed" | "won" | "lost" | "ignored";
  route: string;
};

export type CopilotPresentation = {
  kind: "email" | "calendar" | "mixed" | "recent_changes" | "interventions";
  interventions?: import("@/lib/commercial-interventions-server").InterventionView[];
  emails: CopilotEmailPresentationItem[];
  meetings: CopilotMeetingPresentationItem[];
  changes: CopilotRecentChangePresentationItem[];
  calendarWindow: { from: string; to: string; confirmedEmpty: boolean } | null;
};

export type CopilotMultiRecordResult = {
  resultSetId: string;
  title: string;
  summary: string;
  records: MultiRecordCandidate[];
  totals: Array<{ currency: string; estimatedValue: number }>;
  filters: MultiRecordFilter;
  sort: MultiRecordSort;
  maxSelection: number;
  expiresAt: string;
};

export type CopilotMultiRecordPlanPreview = {
  resultSetId: string;
  confirmationId: string;
  actionType: MultiRecordBatchAction;
  selectedRecordIds: string[];
  records: MultiRecordCandidate[];
  summary: string;
  externalSend: false;
};
export type CopilotAnswer = {
  analysisToken?: string;
  comparisons?: import("./intelligence-comparison-core").IntelligenceComparison[];
  clarification?: {question:string;candidates:import("./intelligence-comparison-core").IdentityCandidate[]};
  calculations?: import("./intelligence-evidence").Calculation[];
  answer: string;
  summaryType: "commercial" | "product_help" | "insufficient_information" | "temporary_error";
  findings: CopilotFinding[];
  evidence: CopilotEvidence[];
  checkedSources: CopilotSourceCheck[];
  missingInformation: string[];
  caveats: string[];
  preparedAction: CopilotPreparedAction | null;
  suggestedAction: CopilotSuggestedAction;
  followUps: string[];
  mode: "ai" | "deterministic_fallback";
  providerAvailable: boolean;
  commercialTruth?: import("@/lib/ai/commercial-truth-answer").CommercialTruthAnswer;
  presentation?: CopilotPresentation | null;
  workflowDraft?: CopilotWorkflowDraftPreview | null;
  multiRecordResult?: CopilotMultiRecordResult | null;
  multiRecordPlan?: CopilotMultiRecordPlanPreview | null;
};

export type CopilotSelectionContext = {
  resultSetId: string;
  selectedRecordIds: string[];
};

export type CopilotRequest = {
  analysisToken?: string;
  candidateSelectionId?: string;
  analysisIntent?: import("./intelligence-analysis-state").AnalysisIntent;
  preparationIntent?: boolean;
  question: string;
  context: CopilotPageContext;
  history: CopilotConversationTurn[];
  selection?: CopilotSelectionContext;
};

export type CopilotToolName =
  | "get_document_context"
  | "get_commercial_truth"
  | "search_commercial_context"
  | "get_daily_brief"
  | "get_execution_context"
  | "get_company_context"
  | "get_opportunity_context"
  | "prepare_followup_draft"
  | "get_commercial_discoveries"
  | "get_product_help"
  | "get_external_context";

export type CopilotToolResult = {
  toolName: CopilotToolName;
  state: "ready" | "empty" | "forbidden" | "error";
  data: unknown;
  sources: CopilotEvidence[];
  checkedSources?: CopilotSourceCheck[];
  missingInformation: string[];
  preparedAction?: CopilotPreparedAction | null;
  suggestedAction: CopilotSuggestedAction;
};

export type CopilotProviderToolCall = {
  callId: string;
  name: string;
  argumentsJson: string;
};

export type CopilotProviderTurn = {
  responseId: string;
  output: unknown[];
  toolCalls: CopilotProviderToolCall[];
  outputText: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  model: string;
};

export type CopilotProvider = {
  kind: "openai" | "ollama";
  deterministicFirst: boolean;
  available(): boolean;
  model(): string;
  createTurn(input: {
    signal?: AbortSignal;
    instructions: string;
    items: unknown[];
    tools: unknown[];
    requireStructuredAnswer: boolean;
    responseSchema?: unknown;
  }): Promise<CopilotProviderTurn>;
};
