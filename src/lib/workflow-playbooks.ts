import type { WorkflowAction, WorkflowCondition, WorkflowTrigger } from "@/lib/workflow-foundation";
export type WorkflowPlaybook = {
  id: string; name: string; description: string; when: string; control: string;
  trigger: WorkflowTrigger; conditions: WorkflowCondition[]; actions: Array<Omit<WorkflowAction, "requiresHumanApproval">>;
};
export const workflowPlaybooks: WorkflowPlaybook[] = [
  { id: "new-opportunity-triage", name: "Triajul oportunității noi", description: "Clarifică responsabilitatea și pasul următor pentru fiecare oportunitate creată din CRM.", when: "La crearea unei oportunități din CRM.", control: "Pregătește revizuirea; nu atribuie automat un responsabil.",
    trigger: "opportunity_created", conditions: [], actions: [
      { type: "assign_review", description: "Verifică responsabilul și confirmă următorul pas comercial.", configuration: { title: "Revizuiește oportunitatea nouă" } },
      { type: "create_notification", description: "Oportunitate nouă: verifică responsabilul și următoarea acțiune." }
    ] },
  { id: "stage-advancement-review", name: "Revizuire după avansarea etapei", description: "Leagă intrarea în etapa Contactat de un pas comercial explicit.", when: "La o tranziție reală în etapa Contactat, salvată din controlul pipeline.", control: "Propune următorul pas și un email; nimic nu este trimis automat.",
    trigger: "stage_changed", conditions: [{ field: "stage", operator: "equals", value: "contacted" }], actions: [
      { type: "update_internal_next_action", description: "Confirmă pasul și termenul după contactarea clientului.", configuration: { title: "Stabilește următorul pas după contactare" } },
      { type: "prepare_email", description: "Pregătește confirmarea următorului pas pentru revizuire.", configuration: { subject: "Confirmarea următorului pas", body: "Completează mesajul pe baza discuției confirmate cu clientul. Revizuiește conținutul și destinatarul înainte de trimitere." } }
    ] },
  { id: "approval-follow-through", name: "Continuare după aprobare", description: "Pregătește verificarea următorului pas după o decizie de aprobare.", when: "După aprobarea explicită a unei cereri cu oportunitate asociată.", control: "Aprobarea nu execută operațiunea protejată; continuarea rămâne sub control uman.",
    trigger: "approval_completed", conditions: [], actions: [
      { type: "assign_review", description: "Verifică aprobarea și confirmă următorul pas permis.", configuration: { title: "Continuă controlat după aprobare" } },
      { type: "create_notification", description: "O aprobare a fost confirmată. Verifică următorul pas înainte de aplicare." }
    ] }
];
export function workflowPlaybook(id: string) { return workflowPlaybooks.find((item) => item.id === id) ?? null; }
