import { describeCurrentCommercialState, type RevenueCommand, type CommandDecision } from "@/lib/revenue-command";

const definitions = {
 pending_approval: { kind: "approval_required", label: "Aprobarea comercială necesită decizie", done: "Toate aprobările care blochează cazul primesc o decizie umană în fluxul de aprobare." },
 outreach_restricted: { kind: "outreach_restricted", label: "Contactarea necesită verificare", done: "Restricția de contactare este clarificată prin procedura autorizată. Revizuirea nu o elimină." },
 overdue_next_action: { kind: "critical_action_overdue", label: "O acțiune comercială este restantă", done: "Acțiunea restantă este finalizată, anulată sau reprogramată legitim în viitor. Orice altă restanță rămâne vizibilă." },
 unassigned_owner: { kind: "owner_missing", label: "Lipsește responsabilul", done: "Un responsabil valid este atribuit oportunității." },
 missing_next_action: { kind: "next_action_missing", label: "Lipsește următorul pas", done: "Există un pas comercial cu responsabil și termen viitor confirmate." },
 proposal_without_follow_up: { kind: "next_action_missing", label: "Propunerea necesită un pas de urmărire", done: "Există un pas de urmărire cu responsabil și termen viitor confirmate." },
 prepared_document_not_advanced: { kind: "intervention_confirmation_required", label: "Intervenția necesită confirmare", done: "Utilizarea materialului este confirmată în documentul sau acțiunea de origine. Pregătirea nu dovedește execuția." },
 intervention_confirmation_required: { kind: "intervention_confirmation_required", label: "Intervenția necesită confirmare", done: "Intervenția este confirmată prin dovada acceptată în registrul impactului." },
 result_verification_required: { kind: "result_verification_required", label: "Rezultatul necesită verificare", done: "Rezultatul primește o verificare explicită sau o invalidare documentată în registrul impactului." },
 stale_activity: { kind: "stalled_execution", label: "Execuția comercială necesită reluare", done: "O acțiune comercială relevantă este înregistrată în istoricul autorizat." }
} as const;

/** Presentation of G3D decisions, not a second truth resolver. No persistent agenda state. */
export function projectCommercialReview(model: RevenueCommand) {
 return model.decisions.map(decision => {
  const definition = definitions[decision.code as keyof typeof definitions];
  const facts = describeCurrentCommercialState(decision.state);
  const changes = model.changes.filter(change => change.opportunityId === decision.id).slice(0,5);
  const carryOver = Boolean(model.checkpoint && decision.continuitySince
   && Date.parse(decision.continuitySince) <= Date.parse(model.checkpoint));
  const remaining = decision.state.exceptions.filter(issue => Object.hasOwn(definitions,issue.code)).map(issue => issue.label);
  return {
   ...decision, kind: definition?.kind ?? "stalled_execution",
   label: definition?.label ?? "Situația comercială necesită verificare",
   completionCondition: definition?.done ?? "Condiția este clarificată în înregistrarea de origine.",
   currentFacts: [facts.owner,facts.next], resolvedFacts: decision.state.resolvedSinceDetection.map(fact=>fact.label),
   remaining: remaining.length ? remaining : [definition?.label ?? decision.reason],
   changes, carryOver,
   memory: carryOver ? "Rămasă deschisă de la ultima revizuire"
    : model.checkpoint ? "Blocaj curent · continuitatea anterioară nu este confirmată" : "Prima revizuire în acest context",
   proofLabel: reviewProofLabel(decision)
  };
 });
}
export function reviewProofLabel(decision: CommandDecision) {
 if(!decision.proof)return "Dovada impactului nu este disponibilă.";
 if(decision.proof.recovered.length)return "Venit recuperat verificat în registrul impactului.";
 if(decision.proof.observed)return "Rezultat observat; impact încă neverificat.";
 return "Rezultat încă neobservat. Impact: încă neverificat.";
}
export type CommercialReviewDecision = ReturnType<typeof projectCommercialReview>[number];
