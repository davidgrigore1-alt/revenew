import {
  safeWorkflowActions,
  workflowConditions,
  workflowConditionOperators,
  workflowTriggers,
  createWorkflowDraft,
  validateWorkflowDefinition,
  type SafeWorkflowAction,
  type WorkflowCondition,
  type WorkflowTrigger,
  type WorkflowDefinition,
} from "@/lib/workflow-foundation";

const MAX_REQUEST_LENGTH = 1_000;

export type WorkflowDraftInterpretationState =
  | "ready"
  | "partial"
  | "clarification"
  | "unsupported";

export type WorkflowDraftInterpretation = {
  state: WorkflowDraftInterpretationState;
  originalRequest: string;
  title: string;
  summary: string;
  definition: WorkflowDefinition | null;
  unsupportedIntents: string[];
  clarification: string | null;
  assumptions: string[];
  safeguards: string[];
};

export type CopilotWorkflowDraftPreview = WorkflowDraftInterpretation & {
  confirmationId: string;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function includesAny(value: string, fragments: string[]) {
  return fragments.some((fragment) => value.includes(fragment));
}

function extractAmount(question: string) {
  const value = normalize(question);
  const match = value.match(
    /(?:peste|mai mare de|>=?|above|over|(?:expunere|valoare)(?:a)?(?: estimata)?(?: de| peste| mai mare de)?)[ :]*(\d+(?:[.,]\d+)*)\s*(EUR|RON|USD|GBP)?\b/i,
  );
  if (!match) return { explicit: false, value: null, currency: null } as const;
  const amount = Number(match[1].replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."));
  return {
    explicit: true,
    value: Number.isFinite(amount) && amount > 0 ? amount : null,
    currency: match[2]?.toUpperCase() ?? null,
  } as const;
}

function hasMissingNextAction(value: string) {
  return includesAny(value, [
    "fara next action",
    "fara urmatoarea actiune",
    "fara actiune urmatoare",
    "next action lipseste",
    "lipseste next action",
    "lipseste urmatoarea actiune",
    "lipsa actiunii urmatoare",
    "lipsa urmatoarei actiuni",
  ]);
}

function titleForRequest(value: string) {
  if (includesAny(value, ["raspunde", "reply received", "email primit"])) return "Răspuns nou de la client";
  if (includesAny(value, ["intalnire", "meeting"])) return "Pregătire înainte de întâlnire";
  if (includesAny(value, ["fara owner", "owner lipsa", "neasignat"])) return "Revizuire oportunități fără responsabil";
  if (includesAny(value, ["restant", "overdue", "follow-up"])) return "Follow-up comercial restant";
  if (includesAny(value, ["next action", "actiune urmatoare"])) return "Acțiune următoare lipsă";
  return "Workflow comercial pregătit din Ask ReveNew";
}

function collectUnsupportedIntents(value: string) {
  const items: string[] = [];
  if (includesAny(value, ["slack", "teams", "microsoft 365", "outlook"])) {
    items.push("Notificările externe către Slack, Teams, Microsoft 365 sau Outlook nu sunt disponibile în acest workflow.");
  }
  if (includesAny(value, ["sms", "whatsapp"])) items.push("Trimiterea prin SMS sau WhatsApp nu este disponibilă.");
  if (includesAny(value, ["webhook", "ruleaza cod", "executa cod", "script", "sql"])) {
    items.push("Execuția de cod, SQL, scripturi sau webhook-uri nu este permisă.");
  }
  if (includesAny(value, ["trimite automat", "send automatically", "auto-send", "fara aprobare", "without approval"])) {
    items.push("Trimiterea automată nu este permisă. ReveNew poate doar pregăti emailul pentru revizuire umană.");
  }
  return items;
}

export function isWorkflowDraftRequest(question: string) {
  const value = normalize(question);
  if (!value) return false;
  if (includesAny(value, ["workflow", "flux comercial", "automatizare", "regula comerciala", "regula recurenta"])) return true;
  const scope = includesAny(value, ["oportunitat", "follow-up", "client", "intalnire", "owner", "next action", "actiune urmatoare"]);
  const conditionalRule = includesAny(value, ["cand ", "daca ", "de fiecare data", "ori de cate ori", "whenever"]);
  const collectionRule = /pentru oportunitat(?:i|ile)\b/.test(value)
    && (hasMissingNextAction(value) || includesAny(value, ["restant", "overdue", "follow-up", "oportunitati mari", "oportunitatile mari", "valoare mare"]) || extractAmount(value).explicit);
  return scope && (conditionalRule || collectionRule);
}

function buildTrigger(value: string): WorkflowTrigger | null {
  if (hasMissingNextAction(value)) return "scheduled_review";
  if (includesAny(value, ["raspunde", "reply received", "email primit"])) return "reply_received";
  if (includesAny(value, ["intalnire apropiata", "intalnire viitoare", "meeting upcoming"])) return "meeting_upcoming";
  if (includesAny(value, ["next action", "actiune urmatoare", "follow-up restant", "restant", "overdue"])) return "next_action_overdue";
  if (includesAny(value, ["oportunitate creata", "opportunity created"])) return "opportunity_created";
  if (includesAny(value, ["schimba etapa", "stage changed", "etapa se schimba"])) return "stage_changed";
  if (includesAny(value, ["aprobare finalizata", "approval completed"])) return "approval_completed";
  if (includesAny(value, ["revizuire programata", "scheduled review"])) return "scheduled_review";
  return null;
}

function buildConditions(value: string, amount: ReturnType<typeof extractAmount>) {
  const conditions: WorkflowCondition[] = [];


  if (amount.value && amount.currency) {
    conditions.push({ field: "estimated_value", operator: "greater_than", value: amount.value });
    conditions.push({ field: "currency", operator: "equals", value: amount.currency });
  }
  if (includesAny(value, ["fara owner", "owner lipsa", "neasignat"])) conditions.push({ field: "owner", operator: "is_empty", value: null });
  if (hasMissingNextAction(value)) {
    conditions.push({ field: "execution_state", operator: "equals", value: "next_action_missing" });
  }
  if (includesAny(value, ["restant", "overdue"])) conditions.push({ field: "execution_state", operator: "equals", value: "overdue" });
  return conditions;
}

function buildActions(value: string) {
  const actions: Array<{ type: SafeWorkflowAction; description: string; configuration?: Record<string, string | number | boolean | null> }> = [];
  if (includesAny(value, ["pregateste un email", "pregateste email", "draft email", "trimite email", "trimite automat email", "email de follow-up"])) {
    actions.push({ type: "prepare_email", description: "Pregătește un email pentru revizuire umană." });
  }
  if (includesAny(value, ["creeaza un task", "creeaza task", "sarcina", "task de review"])) {
    actions.push({ type: "create_internal_task", description: "Pregătește un task comercial intern." });
  }
  if (includesAny(value, ["anunta owner", "notifica owner", "notificare"])) {
    actions.push({ type: "create_notification", description: "Informează responsabilul în interiorul ReveNew.", configuration: { audience: "opportunity_owner" } });
  }
  if (includesAny(value, ["review", "revizuire", "atribuie", "fara owner"])) {
    actions.push({ type: "assign_review", description: "Atribuie o revizuire comercială internă." });
  }
  if (actions.length === 0) actions.push({ type: "create_internal_task", description: "Pregătește un task comercial intern." });
  return actions;
}

function canonicalDefinition(
  trigger: WorkflowTrigger,
  conditions: WorkflowCondition[],
  actions: ReturnType<typeof buildActions>,
  title: string,
) {
  if (!workflowTriggers.includes(trigger)) throw new Error("Trigger workflow neacceptat.");
  for (const condition of conditions) {
    if (!workflowConditions.includes(condition.field) || !workflowConditionOperators.includes(condition.operator)) {
      throw new Error("Condiție workflow neacceptată.");
    }
  }
  for (const action of actions) {
    if (!safeWorkflowActions.includes(action.type)) throw new Error("Acțiune workflow neacceptată.");
  }
  const draft = createWorkflowDraft({
    id: "00000000-0000-5000-8000-000000000000",
    name: title,
    description: "Workflow pregătit prin Ask ReveNew. Necesită verificare și activare explicită în builder.",
    trigger,
    conditions,
    actions,
    createdBy: "ask-preview",
    source: "ai_assisted",
  });
  validateWorkflowDefinition(draft);
  return draft;
}

export function interpretCommercialWorkflowRequest(question: string): WorkflowDraftInterpretation {
  const originalRequest = question.trim().slice(0, MAX_REQUEST_LENGTH);
  const value = normalize(originalRequest);
  const unsupported = collectUnsupportedIntents(value);
  const amount = extractAmount(originalRequest);
  const trigger = buildTrigger(value);
  const title = titleForRequest(value);
  const base = {
    originalRequest,
    title,
    unsupportedIntents: unsupported,
    assumptions: [] as string[],
    safeguards: [] as string[],
  };

  if (!originalRequest || !isWorkflowDraftRequest(originalRequest)) {
    return { ...base, state: "unsupported", summary: "Cererea nu descrie încă un workflow comercial.", definition: null, clarification: "Descrie situația care pornește workflow-ul și rezultatul intern dorit." };
  }
  if (includesAny(value, ["oportunitati mari", "oportunitatile mari", "oportunitati cu valoare mare", "valoare mare", "large opportunities"]) && !amount.explicit) {
    return { ...base, state: "clarification", summary: "Pragul comercial trebuie confirmat înainte de pregătirea workflow-ului.", definition: null, clarification: "Ce prag și ce monedă definesc o oportunitate mare? Exemplu: peste 25.000 EUR." };
  }
  if (amount.explicit && (!amount.value || !amount.currency)) {
    return { ...base, state: "clarification", summary: "Constrângerea comercială trebuie confirmată înainte de pregătirea workflow-ului.", definition: null, clarification: amount.currency ? "Confirmă pragul numeric pentru expunerea estimată." : "Ce monedă se aplică pragului comercial explicit?" };
  }
  if (!trigger) {
    return { ...base, state: unsupported.length ? "unsupported" : "clarification", summary: "Nu am identificat un declanșator comercial suportat.", definition: null, clarification: "Când trebuie să pornească workflow-ul: la follow-up restant, răspuns primit, întâlnire apropiată sau lipsa acțiunii următoare?" };
  }

  const actions = buildActions(value);
  const definition = canonicalDefinition(trigger, buildConditions(value, amount), actions, title);
  const safeguards = [
    "Workflow-ul este creat doar ca Draft.",
    "Activarea rămâne o acțiune separată și explicită în builder.",
    "Nicio acțiune externă nu este executată din Ask ReveNew.",
  ];
  if (actions.some((action) => action.type === "prepare_email")) {
    safeguards.push("Emailul este doar pregătit; trimiterea necesită revizuire și confirmare umană.");
  }

  return {
    ...base,
    state: unsupported.length ? "partial" : "ready",
    summary: unsupported.length
      ? "Am pregătit partea suportată și am păstrat explicit limitările cererii."
      : "Cererea a fost tradusă într-o definiție comercială verificată.",
    definition,
    clarification: null,
    assumptions: [
      ...(amount.value && amount.currency ? ["Pragul este " + amount.value.toLocaleString("ro-RO") + " " + amount.currency + "."] : []),
      ...(includesAny(value, ["oportunitatile active", "oportunitati active"]) ? ["Oportunitățile închise sunt excluse de gardul comercial canonic."] : []),
    ],
    safeguards,
  };
}

export function validateWorkflowDraftInterpretation(value: WorkflowDraftInterpretation) {
  if (!value.definition || !["ready", "partial"].includes(value.state)) {
    return { valid: false, errors: ["Workflow-ul nu este pregătit pentru creare."] };
  }
  try {
    validateWorkflowDefinition(value.definition);
    return { valid: true, errors: [] as string[] };
  } catch (error) {
    return { valid: false, errors: [error instanceof Error ? error.message : "workflow_definition_invalid"] };
  }
}
