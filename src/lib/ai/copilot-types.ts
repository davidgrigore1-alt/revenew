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
  | "Ghid ReveNew";

export type CopilotEvidence = {
  sourceId: string;
  label: string;
  sourceType: CopilotSourceType;
  route: string | null;
  fact: string;
};

export type CopilotSuggestedAction = {
  label: string;
  route: string;
} | null;

export type CopilotAnswer = {
  answer: string;
  summaryType: "commercial" | "product_help" | "insufficient_information" | "temporary_error";
  evidence: CopilotEvidence[];
  missingInformation: string[];
  caveats: string[];
  suggestedAction: CopilotSuggestedAction;
  followUps: string[];
  mode: "ai" | "deterministic_fallback";
  providerAvailable: boolean;
};

export type CopilotRequest = {
  question: string;
  context: CopilotPageContext;
  history: CopilotConversationTurn[];
};

export type CopilotToolName =
  | "search_commercial_context"
  | "get_daily_brief"
  | "get_company_context"
  | "get_opportunity_context"
  | "get_commercial_discoveries"
  | "get_product_help";

export type CopilotToolResult = {
  toolName: CopilotToolName;
  state: "ready" | "empty" | "forbidden" | "error";
  data: unknown;
  sources: CopilotEvidence[];
  missingInformation: string[];
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
  available(): boolean;
  model(): string;
  createTurn(input: {
    instructions: string;
    items: unknown[];
    tools: unknown[];
    requireStructuredAnswer: boolean;
  }): Promise<CopilotProviderTurn>;
};
