import type { CompanyEvidence, CompanyIntelligenceSnapshot } from "@/lib/company-intelligence";

export type CompanyQuestionIntent =
  | "active_opportunities"
  | "recent_activity"
  | "primary_contact"
  | "relationship_owner"
  | "overdue_followups"
  | "next_action"
  | "documents"
  | "unresolved_items"
  | "latest_commitment"
  | "unknown";

export type CompanyQuestionAnswer = {
  intent: CompanyQuestionIntent;
  state: "answered" | "insufficient";
  headline: string;
  answer: string;
  evidence: CompanyEvidence[];
  missingInformation: string[];
  continuation?: { label: string; href: string };
};

const activeStatuses = new Set(["new", "qualified", "proposal", "contacted", "negotiation"]);

export function normalizeCompanyQuestion(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro-RO")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyCompanyQuestion(question: string): CompanyQuestionIntent {
  const normalized = normalizeCompanyQuestion(question);
  if (!normalized) return "unknown";
  if (/ce (am|ati) promis|ultima promisiune|ultimul angajament/.test(normalized)) return "latest_commitment";
  if (/contact(ul)? principal|persoana principala/.test(normalized)) return "primary_contact";
  if (/cine se ocupa|responsabil(ul)? (comercial|de firma)|owner/.test(normalized)) return "relationship_owner";
  if (/follow up.*restant|restant.*follow up|actiuni restante|ce este restant/.test(normalized)) return "overdue_followups";
  if (/urmator(ul)? pas|actiunea urmatoare/.test(normalized)) return "next_action";
  if (/document|oferta|draft/.test(normalized)) return "documents";
  if (/oportunitat.*activ|oportunitat.*deschis/.test(normalized)) return "active_opportunities";
  if (/ce s a intamplat|activitat.*recent|ultimele (7|30|90) de zile|schimbat recent/.test(normalized)) return "recent_activity";
  if (/nerezolvat|bucle deschise|blocaj|ce necesita atentie/.test(normalized)) return "unresolved_items";
  return "unknown";
}

function uniqueEvidence(items: CompanyEvidence[], limit = 5) {
  const unique = new Map<string, CompanyEvidence>();
  for (const item of items) {
    const key = `${item.sourceType}:${item.sourceId}`;
    if (!unique.has(key)) unique.set(key, item);
  }
  return Array.from(unique.values()).slice(0, limit);
}

function insufficient(intent: CompanyQuestionIntent, headline: string, answer: string, missingInformation: string[], continuation?: CompanyQuestionAnswer["continuation"], evidence: CompanyEvidence[] = []): CompanyQuestionAnswer {
  return { intent, state: "insufficient", headline, answer, evidence: uniqueEvidence(evidence), missingInformation, ...(continuation ? { continuation } : {}) };
}

export function suggestedCompanyQuestions(snapshot: CompanyIntelligenceSnapshot) {
  const suggestions: string[] = ["Ce s-a întâmplat recent?"];
  if (snapshot.memory.openLoops.length > 0) suggestions.push("Ce a rămas nerezolvat?");
  if (snapshot.opportunities.some((item) => item.lifecycleStatus === "open" || activeStatuses.has(item.status))) suggestions.push("Care sunt oportunitățile active?");
  if (snapshot.identity.primaryContact) suggestions.push("Cine este contactul principal?");
  if (snapshot.documents.length > 0) suggestions.push("Ce documente avem?");
  if (suggestions.length < 4) suggestions.push("Care este următorul pas?");
  return Array.from(new Set(suggestions)).slice(0, 5);
}

export function answerCompanyQuestion(snapshot: CompanyIntelligenceSnapshot, question: string): CompanyQuestionAnswer {
  const intent = classifyCompanyQuestion(question);
  const organizationHref = `/crm/organizations/${snapshot.organization.id}`;
  const activeOpportunities = snapshot.opportunities.filter((item) => item.lifecycleStatus === "open" || activeStatuses.has(item.status));

  if (intent === "active_opportunities") {
    if (activeOpportunities.length === 0) return insufficient(intent, "Nu există oportunități active înregistrate", "Nu am identificat o oportunitate activă asociată explicit acestei companii.", ["Oportunitate activă asociată companiei"], { label: "Revizuiește compania", href: organizationHref });
    const named = activeOpportunities.slice(0, 3).map((item) => item.title).join(" · ");
    return { intent, state: "answered", headline: `${activeOpportunities.length} ${activeOpportunities.length === 1 ? "oportunitate activă" : "oportunități active"}`, answer: named, evidence: uniqueEvidence(activeOpportunities.map((item) => item.evidence)), missingInformation: [], continuation: { label: "Deschide prima oportunitate", href: activeOpportunities[0].href } };
  }

  if (intent === "recent_activity") {
    const recent = snapshot.timeline.slice(0, 5);
    if (recent.length === 0) return insufficient(intent, "Nu există încă suficient istoric comercial", "Nu am găsit activitate comercială datată pentru această companie.", ["Evenimente, acțiuni, semnale sau documente datate"], { label: "Revizuiește compania", href: organizationHref });
    const activityLabels = Array.from(new Set(recent.map((item) => item.label))).slice(0, 3);
    return { intent, state: "answered", headline: "Ultima activitate comercială înregistrată", answer: activityLabels.join(" · "), evidence: uniqueEvidence(recent.map((item) => item.evidence)), missingInformation: [], continuation: recent[0].href ? { label: "Verifică ultima dovadă", href: recent[0].href } : undefined };
  }

  if (intent === "primary_contact") {
    const contact = snapshot.identity.primaryContact;
    if (!contact) return insufficient(intent, "Nu există contact principal confirmat", "Compania nu are o persoană principală marcată explicit în datele disponibile.", ["Contact principal confirmat"], { label: "Adaugă contact principal", href: "/contacts" }, snapshot.identity.evidence);
    const contactEvidence = snapshot.identity.evidence.find((item) => item.sourceType === "contact" && item.sourceId === contact.id);
    return { intent, state: "answered", headline: contact.fullName, answer: [contact.jobTitle, contact.decisionRole].filter(Boolean).join(" · ") || "Rol profesional neconfirmat.", evidence: contactEvidence ? [contactEvidence] : [], missingInformation: [], continuation: { label: "Deschide contactele", href: "/contacts" } };
  }

  if (intent === "relationship_owner") {
    if (!snapshot.identity.owner) return insufficient(intent, "Nu există responsabil comercial confirmat", "Nicio oportunitate activă asociată nu are un responsabil disponibil în datele curente.", ["Responsabil comercial confirmat"], snapshot.opportunities[0] ? { label: "Atribuie responsabil", href: snapshot.opportunities[0].href } : { label: "Revizuiește compania", href: organizationHref }, snapshot.identity.evidence);
    const ownerEvidence = snapshot.identity.evidence.filter((item) => item.sourceType === "opportunity");
    return { intent, state: "answered", headline: snapshot.identity.owner, answer: "Responsabil identificat din oportunitățile active asociate companiei.", evidence: uniqueEvidence(ownerEvidence), missingInformation: [], continuation: activeOpportunities[0] ? { label: "Deschide oportunitatea", href: activeOpportunities[0].href } : undefined };
  }

  if (intent === "overdue_followups") {
    const overdue = snapshot.attention.filter((item) => item.code === "overdue_next_action");
    if (overdue.length === 0) return { intent, state: "answered", headline: "Nu există follow-up restant identificat", answer: "Nicio acțiune deschisă asociată companiei nu este marcată ca restantă în datele curente.", evidence: [], missingInformation: [], continuation: { label: "Revizuiește acțiunile", href: activeOpportunities[0]?.href ?? organizationHref } };
    return { intent, state: "answered", headline: `${overdue.length} ${overdue.length === 1 ? "follow-up restant" : "follow-up-uri restante"}`, answer: overdue.slice(0, 3).map((item) => item.description).join(" · "), evidence: uniqueEvidence(overdue.map((item) => item.evidence)), missingInformation: [], continuation: { label: overdue[0].actionLabel, href: overdue[0].href } };
  }

  if (intent === "next_action") {
    const next = snapshot.canonicalNextAction;
    if (!next) return insufficient(intent, "Nu există o acțiune următoare confirmată", "Datele asociate companiei nu conțin încă un pas următor sigur.", ["Acțiune următoare, termen și responsabil"], activeOpportunities[0] ? { label: "Completează următoarea acțiune", href: activeOpportunities[0].href } : { label: "Revizuiește compania", href: organizationHref });
    return { intent, state: "answered", headline: next.title, answer: [next.description, next.dueAt ? `Termen: ${next.dueAt.slice(0, 10)}` : null, next.ownerName ? `Responsabil: ${next.ownerName}` : null].filter(Boolean).join(" · "), evidence: [next.evidence], missingInformation: [!next.dueAt ? "Termen neconfirmat" : null, !next.ownerName ? "Responsabil neconfirmat" : null].filter((item): item is string => Boolean(item)), continuation: { label: "Deschide acțiunea", href: next.href } };
  }

  if (intent === "documents") {
    if (snapshot.documents.length === 0) return insufficient(intent, "Nu există documente comerciale asociate", "Nu am găsit documente legate explicit de oportunitățile acestei companii.", ["Document asociat unei oportunități"], { label: "Revizuiește oportunitățile", href: activeOpportunities[0]?.href ?? organizationHref });
    const latest = snapshot.documents[0];
    return { intent, state: "answered", headline: `${snapshot.documents.length} ${snapshot.documents.length === 1 ? "document asociat" : "documente asociate"}`, answer: snapshot.documents.slice(0, 3).map((item) => `${item.title} · ${item.opportunityTitle}`).join(" · "), evidence: uniqueEvidence(snapshot.documents.map((item) => item.evidence)), missingInformation: [], continuation: { label: "Deschide ultimul document", href: latest.href } };
  }

  if (intent === "unresolved_items") {
    const loops = [...snapshot.memory.mustRemember.filter((item) => item.type === "open_loop"), ...snapshot.memory.openLoops]
      .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
      .slice(0, 5);
    if (loops.length === 0) return { intent, state: "answered", headline: "Nu există elemente restante identificate", answer: "Datele curente nu indică o buclă comercială deschisă pentru această companie.", evidence: [], missingInformation: [], continuation: { label: "Revizuiește compania", href: organizationHref } };
    return { intent, state: "answered", headline: `${loops.length} ${loops.length === 1 ? "element nerezolvat" : "elemente nerezolvate"}`, answer: loops.map((item) => item.title).join(" · "), evidence: uniqueEvidence(loops.map((item) => item.evidence)), missingInformation: [], continuation: { label: loops[0].actionLabel, href: loops[0].href ?? loops[0].evidence.href ?? organizationHref } };
  }

  if (intent === "latest_commitment") {
    const latest = snapshot.timeline[0];
    return insufficient(intent, "Nu am identificat o promisiune explicită în datele disponibile", "ReveNew nu transformă o acțiune sau un eveniment generic într-o promisiune. Poți verifica în schimb ultima activitate comercială înregistrată.", ["Angajament explicit, cu sursă și dată"], latest?.href ? { label: "Verifică ultima activitate", href: latest.href } : { label: "Revizuiește compania", href: organizationHref }, latest ? [latest.evidence] : []);
  }

  return insufficient("unknown", "Nu am suficiente informații asociate acestei companii pentru a răspunde sigur", "Alege o întrebare despre activitate, oportunități, contact, responsabil, acțiuni restante, documente sau elemente nerezolvate.", ["O întrebare din categoriile acceptate"], { label: "Revizuiește compania", href: organizationHref });
}
