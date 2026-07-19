export const DEMO = Object.freeze({
  email: "david.grigore07@gmail.com",
  businessId: "de000000-0000-4000-8000-000000000001",
  businessName: "[DEMO] Auto Management Revenue Lab",
  marker: "revenew-local-demo-v1"
});

const ids = (prefix, count) => Array.from({ length: count }, (_, index) =>
  `de${prefix}${String(index + 1).padStart(4, "0")}-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
);

export function buildFixtures(profileId, now = new Date()) {
  const day = 86_400_000;
  const iso = (offsetDays, hour = 9) => {
    const value = new Date(now.getTime() + offsetDays * day);
    value.setUTCHours(hour, 0, 0, 0);
    return value.toISOString();
  };
  const date = (offsetDays) => iso(offsetDays).slice(0, 10);
  const organizationIds = ids("10", 8);
  const contactIds = ids("20", 8);
  const opportunityIds = ids("30", 11);
  const actionIds = ids("40", 12);
  const eventIds = ids("50", 13);
  const documentIds = ids("60", 4);

  const organizations = [
    ["[DEMO] Nord Leasing Fleet", "Servicii financiare", "București", "client"],
    ["[DEMO] Atlas Construct Management", "Management proiecte", "Cluj-Napoca", "prospect"],
    ["[DEMO] MedPrime Clinics Group", "Servicii medicale", "București", "client"],
    ["[DEMO] Terra Logistics Park", "Logistică", "Brașov", "prospect"],
    ["[DEMO] Blue Retail Network", "Retail", "Timișoara", "client"],
    ["[DEMO] Urban Mobility Services", "Mobilitate", "Iași", "former_client"],
    ["[DEMO] Delta Facility Services", "Facility management", "Ploiești", "prospect"],
    ["[DEMO] HORECA Supply Hub", "Ospitalitate", "Constanța", "partner"]
  ].map(([name, industry, city, relationship_status], index) => ({
    id: organizationIds[index], business_id: DEMO.businessId, name, normalized_name: name.toLocaleLowerCase("ro-RO"),
    industry, city, country: "România", relationship_status, notes: `${DEMO.marker}: companie fictivă pentru verificare locală.`
  }));

  const contactSpecs = [
    [0, "Ana Ionescu", "Director Comercial", "decision_maker"],
    [1, "Mihai Stan", "Fleet Operations Manager", "champion"],
    [2, "Elena Pop", "Director Achiziții", "economic_buyer"],
    [3, "Radu Marinescu", "Director General", "decision_maker"],
    [4, "Ioana Pavel", "Head of Partnerships", "champion"],
    [5, "Sorin Dobre", "Director Rețea", "decision_maker"],
    [6, "Cristina Nistor", "Procurement Lead", "economic_buyer"],
    [0, "Alexandra Munteanu", "Fleet Coordinator", "champion"]
  ];
  const contacts = contactSpecs.map(([organizationIndex, full_name, job_title, decision_role], index) => ({
    id: contactIds[index], business_id: DEMO.businessId, organization_id: organizationIds[organizationIndex],
    full_name, normalized_name: full_name.toLocaleLowerCase("ro-RO"), job_title, decision_role,
    email: `contact${index + 1}@revenew-demo.test`, normalized_email: `contact${index + 1}@revenew-demo.test`,
    is_active: true, is_primary_for_organization: index < 7, notes: `${DEMO.marker}: contact fictiv.`
  }));

  const baseOpportunity = (index, organizationIndex, title, status, value, overrides = {}) => ({
    id: opportunityIds[index], business_id: DEMO.businessId, organization_id: organizationIds[organizationIndex],
    title, type: "manual", status, lifecycle_status: "open", commercial_type: "commercial_recovery",
    owner_profile_id: profileId, currency: "RON", estimated_value_low: Math.round(value * 0.7), estimated_value_high: value,
    deadline: date(14 + index), fit_score: 78, urgency_score: 64, money_score: 72, confidence_score: 68,
    summary: "Oportunitate comercială fictivă, structurată pentru demonstrarea controlului operațional ReveNew.",
    relevance: ["relație comercială existentă", "următor pas verificabil"], risks: [],
    recommended_action: "Confirmă ownership-ul și următoarea acțiune înainte de contact.", created_at: iso(-10 - index), updated_at: iso(-2),
    ...overrides
  });
  const opportunities = [
    baseOpportunity(0, 0, "Reactivare flotă corporate · Nord Leasing", "contacted", 42000, { commercial_type: "reactivation", deadline: date(5), urgency_score: 82 }),
    baseOpportunity(1, 1, "Extindere administrare flotă · Atlas", "reviewed", 28000, { commercial_type: "expansion", owner_profile_id: null, recommended_action: "Atribuie un responsabil și confirmă decidentul." }),
    baseOpportunity(2, 2, "Follow-up ofertă rețea clinică · MedPrime", "follow_up_needed", 36000, { deadline: date(2), urgency_score: 92, risks: ["follow-up restant"] }),
    baseOpportunity(3, 4, "Reînnoire servicii logistice · BluePeak", "action_generated", 24000, { commercial_type: "renewal", deadline: date(7) }),
    baseOpportunity(4, 5, "Reluare contract locații regionale · Urban Retail", "new", 19000, { commercial_type: "stalled_pipeline", created_at: iso(-45), updated_at: iso(-38), deadline: date(10) }),
    baseOpportunity(5, 6, "Recuperare proiect mentenanță · Delta", "follow_up_needed", 85000, { owner_profile_id: null, deadline: date(-4), urgency_score: 96, risks: ["fără owner", "termen depășit"] }),
    baseOpportunity(6, 0, "Extindere portofoliu IMM · Nord Leasing", "reviewed", 31000, { commercial_type: "expansion", deadline: date(21) }),
    baseOpportunity(7, 2, "Program servicii corporate · MedPrime", "contacted", 15500, { commercial_type: "new_business", deadline: date(12) }),
    baseOpportunity(8, 4, "Optimizare rutare regională · BluePeak", "won", 22500, {
      lifecycle_status: "won", commercial_type: "expansion", actual_outcome_amount: 18500, outcome_date: date(-3), outcome_reason: "expanded",
      outcome_note: "Valoare confirmată în cadrul scenariului demo local.", outcome_recorded_by_profile_id: profileId, outcome_recorded_at: iso(-3), deadline: date(-3)
    }),
    baseOpportunity(9, 5, "Contract pilot retail · Urban Network", "lost", 12000, {
      lifecycle_status: "lost", commercial_type: "new_business", actual_outcome_amount: null, outcome_date: date(-12), outcome_reason: "timing",
      outcome_note: "Decizie amânată de client; rezultat fictiv marcat explicit.", outcome_recorded_by_profile_id: profileId, outcome_recorded_at: iso(-12), deadline: date(-12)
    }),
    baseOpportunity(10, 1, "Audit cost total flotă · Atlas", "new", 9800, { commercial_type: "new_business", created_at: iso(-34), updated_at: iso(-34), deadline: null })
  ];

  const actionSpecs = [
    [0, "Confirmă agenda întâlnirii", "follow_up", 0, "high", "pending"],
    [2, "Revino cu varianta comercială actualizată", "follow_up", -2, "high", "pending"],
    [3, "Pregătește sumarul de reînnoire", "prepare_offer", 3, "medium", "pending"],
    [4, "Validează interesul locațiilor regionale", "call_contact", 1, "medium", "pending"],
    [5, "Escaladează lipsa deciziei", "follow_up", -4, "high", "pending"],
    [6, "Clarifică segmentul IMM prioritar", "research_more", 6, "medium", "pending"],
    [7, "Confirmă criteriile de achiziție", "call_contact", 0, "high", "pending"],
    [8, "Înregistrează rezultatul extinderii", "research_more", -3, "low", "done"],
    [9, "Documentează motivul pierderii", "research_more", -12, "low", "done"],
    [0, "Pregătește mesajul de follow-up", "prepare_documents", 2, "medium", "pending"],
    [3, "Verifică termenii operaționali", "research_more", 0, "medium", "pending"],
    [2, "Confirmă participanții decidenți", "call_contact", 1, "medium", "pending"]
  ];
  const actions = actionSpecs.map(([opportunityIndex, title, type, offset, priority, status], index) => ({
    id: actionIds[index], business_id: DEMO.businessId, opportunity_id: opportunityIds[opportunityIndex], title, type, priority, status,
    description: `${DEMO.marker}: pas comercial fictiv, fără livrare externă.`, due_at: iso(offset), assigned_to_profile_id: profileId,
    completed_at: status === "done" ? iso(offset) : null, cancelled_at: null, created_at: iso(offset - 3)
  }));

  const events = eventIds.map((id, index) => {
    const opportunityIndex = index % opportunityIds.length;
    return {
      id, business_id: DEMO.businessId, opportunity_id: opportunityIds[opportunityIndex], actor_profile_id: profileId,
      event_type: index % 3 === 0 ? "follow_up_scheduled" : index % 3 === 1 ? "stage_changed" : "next_action_created",
      label: index % 3 === 0 ? "Follow-up planificat" : index % 3 === 1 ? "Etapă comercială actualizată" : "Acțiune următoare creată",
      description: `${DEMO.marker}: activitate fictivă, auditabilă și fără efect extern.`, occurred_at: opportunityIndex === 10 ? iso(-40) : iso(-Math.min(index + 1, 14)),
      metadata: { demo: true, marker: DEMO.marker }
    };
  });

  const documents = [0, 2, 3, 6].map((opportunityIndex, index) => ({
    id: documentIds[index], business_id: DEMO.businessId, opportunity_id: opportunityIds[opportunityIndex],
    document_type: index % 2 ? "follow_up_email" : "call_script", title: "Draft comercial pentru revizuire umană",
    body: "Document fictiv. Necesită revizuire și aprobare umană înainte de orice utilizare.", status: index === 0 ? "ready_to_send" : "draft",
    generation_mode: "local_fallback", generation_error: null
  }));

  const opportunityContacts = [0, 2, 3, 4, 5, 6, 7, 8, 9].map((opportunityIndex, index) => {
    const orgIndex = [0, 2, 4, 5, 6, 0, 2, 4, 5][index];
    return { id: ids("70", 9)[index], business_id: DEMO.businessId, opportunity_id: opportunityIds[opportunityIndex], contact_id: contactIds[orgIndex], role: contactSpecs[orgIndex][3], is_primary: true };
  });

  return { organizations, contacts, opportunities, actions, events, documents, opportunityContacts };
}
