import { DEMO } from "./fixtures.mjs";

export const DEMO_STORIES = Object.freeze([
  {
    id: "vector-critical-loop",
    situation: "Proiectul de mentenanță Vector are termen depășit, document pregătit și responsabil neconfirmat.",
    evidence: "Oportunitate, acțiune restantă, semnal asociat, document și istoric comercial persistent.",
    insight: "Continuitatea comercială este blocată și necesită intervenție umană prioritară.",
    missingInformation: "Responsabilul și calendarul de intervenție nu sunt confirmate.",
    safeAction: "Revizuiește oportunitatea și atribuie responsabilul înainte de orice contact extern.",
    canonicalId: DEMO.featuredOpportunityId,
    surfaces: ["/dashboard", "/today", "/recoverable", `/opportunities/${DEMO.featuredOpportunityId}`, "/ai", "/approvals"]
  },
  {
    id: "atlas-untracked-request",
    situation: "Atlas Fleet a transmis o cerere de ofertă pentru flotă cu valoare explicită de 20.000 EUR.",
    evidence: "Email copiat manual, companie și contact identificate, valoare și monedă explicite.",
    insight: "Semnalul nu este asociat unei oportunități și trebuie comparat cu activitatea existentă înainte de creare.",
    missingInformation: "Termenul exact și confirmarea că este un proiect comercial distinct.",
    safeAction: "Revizuiește semnalul și decide dacă îl asociezi sau creezi o oportunitate.",
    canonicalId: DEMO.discoverySignalId,
    surfaces: ["/ai", "/inbox", "/companies", "/reports"]
  },
  {
    id: "meridian-active-relationship",
    situation: "Meridian Logistics are două inițiative comerciale, mai multe contacte și activitate recentă.",
    evidence: "Companie, contacte, oportunități, documente, acțiuni și evenimente legate explicit.",
    insight: "Company 360 reconstruiește relația fără căutare manuală în înregistrări separate.",
    missingInformation: "Rezultatul inițiativelor rămâne neconfirmat.",
    safeAction: "Verifică activitatea recentă și următorul pas din companie.",
    canonicalId: DEMO.richCompanyId,
    surfaces: ["/companies", `/crm/organizations/${DEMO.richCompanyId}`, "/ai", "/reports"]
  },
  {
    id: "vector-human-approval",
    situation: "Recomandarea pentru Vector este pregătită, dar nu poate fi aplicată fără decizie umană.",
    evidence: "Semnal asociat oportunității, stare de revizuire și lipsuri declarate.",
    insight: "ReveNew pregătește contextul; persoana autorizată decide și păstrează auditul.",
    missingInformation: "Aprobarea, responsabilul și pasul final nu sunt confirmate.",
    safeAction: "Verifică aprobarea și confirmă explicit acțiunea internă.",
    canonicalId: DEMO.featuredSignalId,
    surfaces: ["/approvals", "/inbox", `/opportunities/${DEMO.featuredOpportunityId}`, "/dashboard"]
  }
]);

function observedTimestamps(fixtures) {
  return [
    ...fixtures.opportunities.flatMap((item) => [item.created_at, item.updated_at, item.outcome_recorded_at].filter(Boolean)),
    ...fixtures.actions.flatMap((item) => [item.created_at, item.completed_at, item.cancelled_at].filter(Boolean)),
    ...fixtures.events.map((item) => item.occurred_at),
    ...fixtures.signals.flatMap((item) => [item.occurred_at, item.created_at, item.analyzed_at, item.reviewed_at].filter(Boolean)),
    ...fixtures.signalEvents.map((item) => item.created_at)
  ];
}

export function inspectDemoStoryInvariants(fixtures, now) {
  const errors = [];
  const opportunity = (id) => fixtures.opportunities.find((item) => item.id === id);
  const signal = (id) => fixtures.signals.find((item) => item.id === id);
  const vector = opportunity(DEMO.featuredOpportunityId);
  const vectorActions = fixtures.actions.filter((item) => item.opportunity_id === DEMO.featuredOpportunityId);
  const vectorEvents = fixtures.events.filter((item) => item.opportunity_id === DEMO.featuredOpportunityId);
  const vectorDocuments = fixtures.documents.filter((item) => item.opportunity_id === DEMO.featuredOpportunityId);
  const vectorSignals = fixtures.signals.filter((item) => item.detected_from_opportunity_id === DEMO.featuredOpportunityId);
  const atlas = signal(DEMO.discoverySignalId);
  const richContacts = fixtures.contacts.filter((item) => item.organization_id === DEMO.richCompanyId);
  const richOpportunities = fixtures.opportunities.filter((item) => item.organization_id === DEMO.richCompanyId);
  const richOpportunityIds = new Set(richOpportunities.map((item) => item.id));
  const richDocuments = fixtures.documents.filter((item) => richOpportunityIds.has(item.opportunity_id));
  const richEvents = fixtures.events.filter((item) => richOpportunityIds.has(item.opportunity_id));
  const approval = signal(DEMO.featuredSignalId);
  const nowMs = now.getTime();

  if (!vector) errors.push("Oportunitatea canonică Vector lipsește.");
  if (vector && (vector.owner_profile_id !== null || Date.parse(vector.deadline) >= nowMs || vector.actual_outcome_amount !== undefined && vector.actual_outcome_amount !== null)) errors.push("Starea critică Vector nu este coerentă.");
  if (!vectorActions.some((item) => item.status === "pending" && Date.parse(item.due_at) < nowMs)) errors.push("Vector nu are acțiune restantă.");
  if (vectorEvents.length < 4) errors.push("Istoricul Vector nu conține suficiente fapte comerciale.");
  if (!vectorDocuments.some((item) => item.status === "ready_to_send")) errors.push("Vector nu are document pregătit și netrimis.");
  if (!vectorSignals.some((item) => item.raw_message && item.primary_recovery_reason)) errors.push("Vector nu este legat de o dovadă comercială verificabilă.");

  if (!atlas || atlas.currency !== "EUR" || Number(atlas.estimated_value_max) !== 20_000 || atlas.detected_from_opportunity_id || atlas.converted_opportunity_id) errors.push("Descoperirea Atlas nu păstrează valoarea explicită și starea neasociată.");
  if (!atlas?.matched_organization_id || !atlas?.raw_message?.includes("20.000 EUR")) errors.push("Descoperirea Atlas nu are companie și sursă verificabile.");

  if (richContacts.length < 2 || richOpportunities.length < 2 || richDocuments.length < 2 || richEvents.length < 2) errors.push("Relația Meridian Logistics nu este suficient de bogată pentru Company 360.");

  if (!approval || approval.review_status !== "ready_for_review" || approval.converted_opportunity_id || approval.detected_from_opportunity_id !== DEMO.featuredOpportunityId) errors.push("Povestea de aprobare Vector nu păstrează controlul uman.");
  if (!approval?.missing_information?.length || !approval?.recommended_action) errors.push("Aprobarea Vector nu declară lipsurile și acțiunea sigură.");

  if (observedTimestamps(fixtures).some((value) => Date.parse(value) > nowMs)) errors.push("Fixture-ul conține un fapt observat datat în viitor.");
  if (!fixtures.actions.some((item) => item.status === "pending" && Date.parse(item.due_at) > nowMs)) errors.push("Fixture-ul nu conține lucru viitor planificat.");
  if (!fixtures.events.some((item) => nowMs - Date.parse(item.occurred_at) <= 24 * 3_600_000)) errors.push("Brief-ul nu are activitate recentă în ultimele 24 de ore.");
  if (new Set(fixtures.opportunities.map((item) => item.currency)).size < 2) errors.push("Monedele demo nu rămân separate.");

  return {
    errors,
    matrix: {
      vector: { opportunity: Boolean(vector), actions: vectorActions.length, events: vectorEvents.length, documents: vectorDocuments.length, signals: vectorSignals.length },
      atlas: { signal: Boolean(atlas), explicitAmount: Number(atlas?.estimated_value_max ?? 0), linkedOpportunity: Boolean(atlas?.detected_from_opportunity_id || atlas?.converted_opportunity_id) },
      meridian: { contacts: richContacts.length, opportunities: richOpportunities.length, documents: richDocuments.length, events: richEvents.length },
      approval: { signal: Boolean(approval), reviewStatus: approval?.review_status ?? null }
    }
  };
}

export function assertDemoStoryInvariants(fixtures, now) {
  const result = inspectDemoStoryInvariants(fixtures, now);
  if (result.errors.length > 0) throw new Error(result.errors.join(" "));
  return result.matrix;
}
