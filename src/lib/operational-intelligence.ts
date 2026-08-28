import "server-only";

import type {
  WorkspaceDecisionEvidence,
  WorkspaceDecisionItem,
  WorkspaceDecisionQueue,
  WorkspaceDecisionSeverity,
  WorkspaceDecisionType
} from "@/lib/workspace-decision-queue";

export type EvidenceToDecisionTrace = {
  sourceTypeLabel: string;
  sourceLabel: string;
  evidenceSummary: string;
  evidenceHref: string;
  prioritizationReasons: string[];
  knownFacts: string[];
  missingInformation: string[];
  humanDecision: string;
  outcomeStatus: "not_confirmed";
  outcomeLabel: string;
  continueLabel: string;
  continueHref: string;
  dueAt?: string;
};

export type OperationalIntelligenceRecommendation = {
  id: string;
  entityType: "opportunity" | "signal" | "action" | "approval" | "report";
  entityId: string;
  title: string;
  typeLabel: string;
  severity: WorkspaceDecisionSeverity;
  situation: string;
  risk: string;
  whyNow: string;
  whyItMatters: string;
  evidenceStrength: "sufficient" | "partial" | "verify";
  evidenceStrengthLabel: "Dovezi suficiente" | "Dovezi parțiale" | "Necesită verificare";
  evidence: Array<{ label: string; sourceTypeLabel: string; href: string; observedAt: string | null }>;
  evidenceLabel: string;
  evidenceHref: string;
  evidenceCount: number;
  missingInformation: string[];
  assumptions: string[];
  uncertainty: string;
  controlNote: string;
  humanDecisionRequired: true;
  noAutomaticExecution: true;
  safeNextAction: { label: string; href: string };
  consequenceOfInaction: string;
  confirmedValue: null;
  confirmedValueLabel: string;
  priorityReason: string;
  recommendedReviewPath: string;
  sourceTrace: Array<{ sourceTypeLabel: string; label: string; href: string; observedAt: string | null }>;
  actionLabel: string;
  actionHref: string;
  estimatedValue?: number;
  currency?: string;
  companyName?: string;
  opportunityTitle?: string;
  trace: EvidenceToDecisionTrace;
};

export type OperationalIntelligenceCenter = {
  state: "unavailable" | "insufficient_data" | "monitoring" | "attention" | "critical";
  stateLabel: string;
  headline: string;
  observation: string;
  decisionTitle: string;
  evidenceLabel: string;
  evidenceHref: string | null;
  safeActionLabel: string;
  safeActionHref: string;
  totalCandidates: number;
  evidenceCount: number;
  criticalCount: number;
  attentionCount: number;
  estimatedExposedValueByCurrency: Array<{ currency: string; value: number }>;
  recommendations: OperationalIntelligenceRecommendation[];
};

export function unavailableOperationalIntelligence(): OperationalIntelligenceCenter {
  return {
    state: "unavailable",
    stateLabel: "Date indisponibile",
    headline: "Inteligența operațională nu poate fi încărcată momentan.",
    observation: "ReveNew nu formulează recomandări atunci când datele nu pot fi verificate.",
    decisionTitle: "Reia analiza după restabilirea accesului la date",
    evidenceLabel: "Nicio dovadă nu este presupusă",
    evidenceHref: null,
    safeActionLabel: "Revino la Control Center",
    safeActionHref: "/dashboard",
    totalCandidates: 0,
    evidenceCount: 0,
    criticalCount: 0,
    attentionCount: 0,
    estimatedExposedValueByCurrency: [],
    recommendations: []
  };
}

const typeLabels: Record<WorkspaceDecisionType, string> = {
  overdue_follow_up: "Follow-up întârziat",
  pending_approval: "Aprobare umană",
  prepared_work_not_advanced: "Execuție nefinalizată",
  unresolved_signal: "Semnal comercial",
  opportunity_without_next_action: "Acțiune lipsă",
  opportunity_without_owner: "Responsabil lipsă",
  company_without_primary_contact: "Contact principal lipsă",
  inactive_active_opportunity: "Oportunitate inactivă",
  high_value_blocked_opportunity: "Valoare estimată expusă",
  reply_received: "Răspuns nou primit",
  waiting_for_client: "Așteaptă clientul"
};

const prioritizationRules: Record<WorkspaceDecisionType, string> = {
  overdue_follow_up: "Termenul acțiunii a fost depășit.",
  pending_approval: "Fluxul nu poate continua fără o decizie umană înregistrată.",
  prepared_work_not_advanced: "Există lucru pregătit fără confirmarea pasului următor.",
  unresolved_signal: "Semnalul este prioritar și nu are încă o decizie de revizuire.",
  opportunity_without_next_action: "Lipsește o acțiune următoare cu termen clar.",
  opportunity_without_owner: "Lipsește persoana responsabilă de următorul pas.",
  company_without_primary_contact: "Lipsește contactul principal necesar unui follow-up sigur.",
  inactive_active_opportunity: "Ultima activitate importantă nu indică progres recent.",
  high_value_blocked_opportunity: "Blocajele active afectează o oportunitate cu valoare estimată.",
  reply_received: "Ultima comunicare inbound este mai nouă decât ultimul mesaj trimis.",
  waiting_for_client: "Ultimul mesaj este trimis, iar fereastra conservatoare de răspuns este activă."
};

const humanDecisions: Record<WorkspaceDecisionType, string> = {
  overdue_follow_up: "Confirmă dacă acțiunea rămâne relevantă și actualizează termenul sau starea.",
  pending_approval: "Verifică dovada, apoi aprobă sau respinge propunerea.",
  prepared_work_not_advanced: "Verifică documentul și decide separat dacă pasul următor poate fi executat.",
  unresolved_signal: "Revizuiește semnalul și decide dacă trebuie convertit, legat sau închis.",
  opportunity_without_next_action: "Stabilește acțiunea, persoana responsabilă și termenul.",
  opportunity_without_owner: "Atribuie o persoană responsabilă înainte de continuarea execuției.",
  company_without_primary_contact: "Confirmă persoana potrivită înainte de orice follow-up.",
  inactive_active_opportunity: "Decide dacă oportunitatea continuă, necesită un nou pas sau trebuie închisă.",
  high_value_blocked_opportunity: "Revizuiește blocajele și confirmă primul pas sigur.",
  reply_received: "Revizuiește răspunsul înainte de a confirma următorul pas.",
  waiting_for_client: "Nu interveni încă; verifică din nou la momentul calculat."
};

const consequencesOfInaction: Record<WorkspaceDecisionType, string> = {
  overdue_follow_up: "Fără revizuire, conversația poate rămâne fără răspuns, iar oportunitatea poate pierde continuitatea comercială.",
  pending_approval: "Fără o decizie înregistrată, lucrul pregătit rămâne blocat și nu poate avansa în siguranță.",
  prepared_work_not_advanced: "Documentul pregătit poate rămâne nefolosit, iar următorul pas comercial poate fi uitat.",
  unresolved_signal: "Semnalul poate rămâne nevalorificat sau poate genera lucru duplicat dacă nu este clasificat.",
  opportunity_without_next_action: "Oportunitatea poate stagna deoarece echipa nu are un pas și un termen verificabil.",
  opportunity_without_owner: "Responsabilitatea rămâne ambiguă, iar follow-up-ul poate fi amânat sau duplicat.",
  company_without_primary_contact: "Echipa poate pregăti un follow-up pentru persoana nepotrivită sau poate întârzia clarificarea.",
  inactive_active_opportunity: "Lipsa unei decizii poate menține artificial oportunitatea activă și poate ascunde riscul real.",
  high_value_blocked_opportunity: "Blocajul poate menține expusă valoarea estimată fără să existe progres sau venit confirmat.",
  reply_received: "Răspunsul poate rămâne nerevizuit și poate întârzia decizia comercială.",
  waiting_for_client: "Un follow-up prematur poate crea zgomot și dubla comunicarea deja trimisă."
};

function entityTypeFor(item: WorkspaceDecisionItem): OperationalIntelligenceRecommendation["entityType"] {
  if (item.type === "pending_approval") return "approval";
  if (item.type === "unresolved_signal") return "signal";
  if (["overdue_follow_up", "prepared_work_not_advanced"].includes(item.type)) return "action";
  return "opportunity";
}

function sourceTypeLabel(evidence: WorkspaceDecisionEvidence) {
  return ({
    opportunity: "Oportunitate",
    opportunity_action: "Acțiune",
    opportunity_document: "Document",
    commercial_signal: "Semnal comercial",
    approval: "Aprobare"
  } as const)[evidence.sourceType];
}

function missingInformationFor(item: WorkspaceDecisionItem) {
  const missing: string[] = [];

  if (item.ownerState === "missing") missing.push("Responsabil neatribuit.");
  if (!item.relatedCompanyName) missing.push("Compania asociată nu este confirmată.");

  if (item.type === "pending_approval") missing.push("Decizia de aprobare nu este încă înregistrată.");
  if (item.type === "prepared_work_not_advanced") missing.push("Utilizarea sau trimiterea documentului nu este confirmată.");
  if (item.type === "unresolved_signal") missing.push("Semnalul nu este încă revizuit și nu are o oportunitate confirmată.");
  if (item.type === "opportunity_without_next_action") missing.push("Acțiunea următoare și termenul nu sunt confirmate.");
  if (item.type === "opportunity_without_owner") missing.push("Persoana responsabilă nu este atribuită.");
  if (item.type === "company_without_primary_contact") missing.push("Contactul principal nu este confirmat.");
  if (item.type === "inactive_active_opportunity") missing.push("Motivul lipsei de progres trebuie verificat.");

  missing.push(item.estimatedValue
    ? "Valoarea este estimată; rezultatul comercial și venitul rămân neconfirmate."
    : "Valoarea și rezultatul comercial nu sunt confirmate.");

  return Array.from(new Set(missing));
}

function traceFor(
  item: WorkspaceDecisionItem,
  primaryEvidence: WorkspaceDecisionEvidence | undefined
): EvidenceToDecisionTrace {
  const knownFacts = [
    `Stare observată: ${item.statusLabel}.`,
    item.relatedCompanyName ? `Companie: ${item.relatedCompanyName}.` : null,
    item.relatedOpportunityTitle ? `Oportunitate: ${item.relatedOpportunityTitle}.` : null,
    item.ownerName ? `Responsabil: ${item.ownerName}.` : item.ownerState === "unverified" ? "Responsabil atribuit; numele nu este disponibil." : null,
    `Dovezi disponibile: ${item.evidence.length}.`
  ].filter((fact): fact is string => Boolean(fact));

  return {
    sourceTypeLabel: primaryEvidence ? sourceTypeLabel(primaryEvidence) : "Dovadă indisponibilă",
    sourceLabel: primaryEvidence?.label ?? "Dovezile trebuie completate înainte de decizie.",
    evidenceSummary: item.reason,
    evidenceHref: primaryEvidence?.href ?? item.actionHref,
    prioritizationReasons: [
      prioritizationRules[item.type],
      item.reason,
      item.severity === "critical"
        ? "Elementele critice și restante sunt afișate înaintea celor informative."
        : "Elementele care necesită atenție sunt ordonate după termen și impactul comercial disponibil."
    ],
    knownFacts,
    missingInformation: missingInformationFor(item),
    humanDecision: humanDecisions[item.type],
    outcomeStatus: "not_confirmed",
    outcomeLabel: "Nu există un rezultat comercial confirmat de utilizator pentru această recomandare.",
    continueLabel: item.actionLabel,
    continueHref: item.actionHref,
    ...(item.dueAt ? { dueAt: item.dueAt } : {})
  };
}

export function buildOperationalRecommendation(item: WorkspaceDecisionItem): OperationalIntelligenceRecommendation {
  const primaryEvidence = item.evidence[0];
  const evidenceCount = item.evidence.length;
  const missingInformation = missingInformationFor(item).filter((gap) => !gap.startsWith("Valoarea"));
  const evidenceStrength = evidenceCount >= 2 && missingInformation.length <= 1
    ? "sufficient"
    : evidenceCount > 0
      ? "partial"
      : "verify";
  const evidenceStrengthLabel = evidenceStrength === "sufficient"
    ? "Dovezi suficiente"
    : evidenceStrength === "partial"
      ? "Dovezi parțiale"
      : "Necesită verificare";
  const evidence = item.evidence.map((source) => ({
    label: source.label,
    sourceTypeLabel: sourceTypeLabel(source),
    href: source.href,
    observedAt: source.sourceTimestamp
  }));
  const sourceTrace = evidence.map((source) => ({ ...source }));
  const situationContext = [item.relatedCompanyName, item.relatedOpportunityTitle].filter(Boolean).join(" · ");

  return {
    id: item.id,
    entityType: entityTypeFor(item),
    entityId: item.relatedOpportunityId ?? primaryEvidence?.sourceId ?? item.id,
    title: item.title,
    typeLabel: typeLabels[item.type],
    severity: item.severity,
    situation: `${item.reason}${situationContext ? ` Context: ${situationContext}.` : ""}`,
    risk: item.whyItMatters,
    whyNow: `${prioritizationRules[item.type]} Starea observată este „${item.statusLabel}”.`,
    whyItMatters: item.whyItMatters,
    evidenceStrength,
    evidenceStrengthLabel,
    evidence,
    evidenceLabel: primaryEvidence?.label ?? "Dovezi insuficiente pentru această recomandare",
    evidenceHref: primaryEvidence?.href ?? item.actionHref,
    evidenceCount,
    missingInformation,
    assumptions: [
      "Prioritatea reflectă numai datele comerciale disponibile în momentul analizei.",
      item.estimatedValue
        ? "Valoarea estimată este folosită pentru prioritizare și nu reprezintă venit confirmat."
        : "Valoarea comercială nu este disponibilă și nu este presupusă."
    ],
    uncertainty: evidenceCount > 0
      ? `Prioritizare deterministă bazată pe ${evidenceCount === 1 ? "o dovadă existentă" : `${evidenceCount} dovezi existente`}; contextul trebuie verificat de o persoană.`
      : "Recomandarea nu trebuie aplicată înainte de completarea și verificarea dovezilor.",
    controlNote: "ReveNew recomandă; o persoană verifică și aprobă orice pas cu impact comercial.",
    humanDecisionRequired: true,
    noAutomaticExecution: true,
    safeNextAction: { label: item.actionLabel, href: item.actionHref },
    consequenceOfInaction: consequencesOfInaction[item.type],
    confirmedValue: null,
    confirmedValueLabel: "Nu există venit confirmat asociat acestei recomandări.",
    priorityReason: prioritizationRules[item.type],
    recommendedReviewPath: item.actionHref,
    sourceTrace,
    actionLabel: item.actionLabel,
    actionHref: item.actionHref,
    ...(item.estimatedValue && item.currency ? { estimatedValue: item.estimatedValue, currency: item.currency } : {}),
    ...(item.relatedCompanyName ? { companyName: item.relatedCompanyName } : {}),
    ...(item.relatedOpportunityTitle ? { opportunityTitle: item.relatedOpportunityTitle } : {}),
    trace: traceFor(item, primaryEvidence)
  };
}

export function buildOperationalIntelligenceCenter(
  queue: WorkspaceDecisionQueue
): OperationalIntelligenceCenter {
  const recommendations = queue.items.slice(0, 3).map(buildOperationalRecommendation);
  const primary = recommendations[0] ?? null;
  const evidenceCount = recommendations.reduce((total, recommendation) => total + recommendation.evidenceCount, 0);
  const estimatedExposedValueByCurrency = Object.entries(queue.estimatedExposedValueByCurrency)
    .filter(([, value]) => Number.isFinite(value) && value > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, value]) => ({ currency, value }));

  if (!primary) {
    const insufficientData = queue.sourceState === "empty_workspace";
    return {
      state: insufficientData ? "insufficient_data" : "monitoring",
      stateLabel: insufficientData ? "Date insuficiente" : "Monitorizare",
      headline: insufficientData
        ? "Nu există încă suficiente date pentru o recomandare verificabilă."
        : "Nu există o decizie comercială prioritară în datele disponibile.",
      observation: insufficientData
        ? "Adaugă un semnal sau o oportunitate reală pentru ca ReveNew să poată ordona riscurile și acțiunile sigure."
        : "ReveNew continuă să urmărească termenele, responsabilitatea, aprobările și dovezile existente.",
      decisionTitle: insufficientData ? "Completează baza minimă de analiză" : "Continuă monitorizarea operațională",
      evidenceLabel: insufficientData ? "Nu există dovezi disponibile" : "Nu există un blocaj dovedit acum",
      evidenceHref: null,
      safeActionLabel: insufficientData ? "Adaugă primul semnal" : "Verifică recuperarea veniturilor",
      safeActionHref: insufficientData ? "/inbox?create=1" : "/recoverable",
      totalCandidates: queue.totalCandidates,
      evidenceCount: 0,
      criticalCount: queue.criticalCount,
      attentionCount: queue.attentionCount,
      estimatedExposedValueByCurrency,
      recommendations: []
    };
  }

  const state = queue.criticalCount > 0 ? "critical" : "attention";
  return {
    state,
    stateLabel: state === "critical" ? "Intervenție necesară" : "Revizuire necesară",
    headline: `ReveNew a identificat ${queue.totalCandidates === 1 ? "o decizie comercială" : `${queue.totalCandidates} decizii comerciale`} care necesită verificare umană.`,
    observation: primary.whyItMatters,
    decisionTitle: primary.title,
    evidenceLabel: primary.evidenceLabel,
    evidenceHref: primary.evidenceHref,
    safeActionLabel: primary.actionLabel,
    safeActionHref: primary.actionHref,
    totalCandidates: queue.totalCandidates,
    evidenceCount,
    criticalCount: queue.criticalCount,
    attentionCount: queue.attentionCount,
    estimatedExposedValueByCurrency,
    recommendations
  };
}
