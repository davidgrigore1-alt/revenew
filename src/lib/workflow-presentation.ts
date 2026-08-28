import type { SafeWorkflowAction, WorkflowConditionField, WorkflowConditionOperator, WorkflowTrigger } from "@/lib/workflow-foundation";
import { workflowTriggerRegistry, workflowTriggerCapability } from "@/lib/workflow-trigger-registry";
export { workflowTriggerCapability };


export type WorkflowCatalogItem<T extends string> = { value: T; label: string; description: string; group?: string };

export const workflowTriggerCatalog: WorkflowCatalogItem<WorkflowTrigger>[] = Object.values(workflowTriggerRegistry);
export type WorkflowTriggerRuntimeCapability = ReturnType<typeof workflowTriggerCapability>;

export const workflowConditionCatalog: WorkflowCatalogItem<WorkflowConditionField>[] = [
  { value: "owner", label: "Responsabil", description: "Responsabilul actual al oportunității." },
  { value: "stage", label: "Etapă", description: "Etapa comercială actuală." },
  { value: "execution_state", label: "Stare de execuție", description: "Interpretarea comercială calculată de ReveNew." },
  { value: "severity", label: "Severitate", description: "Nivelul de atenție necesar." },
  { value: "company", label: "Companie", description: "Compania legată de oportunitate." },
  { value: "estimated_value", label: "Expunere estimată", description: "Valoarea estimată, distinctă de venitul confirmat." },
  { value: "currency", label: "Monedă", description: "Moneda oportunității." },
  { value: "waiting_state", label: "Stare de așteptare", description: "Motivul legitim pentru care ReveNew recomandă așteptarea." }
];

export const workflowOperatorCatalog: WorkflowCatalogItem<WorkflowConditionOperator>[] = [
  { value: "equals", label: "este", description: "Valoarea trebuie să fie identică." },
  { value: "not_equals", label: "nu este", description: "Valoarea trebuie să fie diferită." },
  { value: "greater_than", label: "este mai mare decât", description: "Comparație numerică." },
  { value: "less_than", label: "este mai mică decât", description: "Comparație numerică." },
  { value: "is_empty", label: "lipsește", description: "Câmpul nu are o valoare confirmată." },
  { value: "is_not_empty", label: "este confirmat", description: "Câmpul are o valoare confirmată." }
];

export const workflowActionCatalog: WorkflowCatalogItem<SafeWorkflowAction>[] = [
  { value: "create_internal_task", label: "Pregătește task intern", description: "Propune un task comercial pentru revizuire umană.", group: "Lucru pregătit" },
  { value: "prepare_email", label: "Pregătește email", description: "Pregătește un draft. Nu trimite niciun mesaj automat.", group: "Lucru pregătit" },
  { value: "request_approval", label: "Pregătește revizuire pentru aprobare", description: "Pregătește un task de revizuire; nu creează singur o cerere de aprobare.", group: "Control uman" },
  { value: "update_internal_next_action", label: "Propune acțiunea următoare", description: "Pregătește actualizarea pasului următor, fără aplicare automată.", group: "Lucru pregătit" },
  { value: "assign_review", label: "Atribuie o revizuire", description: "Ridică situația pentru o verificare internă controlată.", group: "Control uman" },
  { value: "create_notification", label: "Creează notificare internă", description: "Informează responsabilul în interiorul ReveNew.", group: "Acțiuni interne" }
];

const label = <T extends string>(catalog: WorkflowCatalogItem<T>[], value: T) => catalog.find((item) => item.value === value)?.label ?? "De verificat";
export const presentWorkflowTrigger = (value: WorkflowTrigger) => label(workflowTriggerCatalog, value);
export const presentWorkflowConditionField = (value: WorkflowConditionField) => label(workflowConditionCatalog, value);
export const presentWorkflowOperator = (value: WorkflowConditionOperator) => label(workflowOperatorCatalog, value);
export const presentWorkflowAction = (value: SafeWorkflowAction) => label(workflowActionCatalog, value);

export const workflowOperatorsForField = (field: WorkflowConditionField): WorkflowConditionOperator[] =>
  field === "estimated_value" ? ["equals", "not_equals", "greater_than", "less_than", "is_empty", "is_not_empty"] : ["equals", "not_equals", "is_empty", "is_not_empty"];

export const workflowGuardCopy = {
  title: "ReveNew verifică situația comercială actuală",
  summary: "Workflow-ul continuă numai când acțiunea rămâne utilă și sigură în contextul curent.",
  details: [
    "Oprește follow-up-ul dacă există deja un răspuns relevant.",
    "Respectă fereastra legitimă de așteptare a clientului.",
    "Evită outreach-ul redundant când există o întâlnire apropiată.",
    "Nu presupune un responsabil și nu ocolește aprobarea umană."
  ]
};

export function presentGuardDecision(value?: string | null) {
  const states: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
    proceed: { label: "Poate continua în siguranță", tone: "success" },
    waiting: { label: "Așteptare legitimă", tone: "neutral" },
    stop: { label: "Oprit în siguranță", tone: "neutral" },
    blocked: { label: "Necesită verificare", tone: "warning" },
    conditions_not_met: { label: "Condiții neîndeplinite", tone: "neutral" }
  };
  return states[value ?? ""] ?? { label: "Decizie neconfirmată", tone: "neutral" as const };
}
