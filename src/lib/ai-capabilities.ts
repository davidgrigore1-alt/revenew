export const AI_CAPABILITY_STATUSES = [
  "available_internal",
  "sandbox_only",
  "planned",
  "blocked_until_security_review"
] as const;

export const AI_CAPABILITY_CATEGORIES = [
  "commercial_intelligence",
  "calendar",
  "gmail",
  "voice",
  "audit",
  "opportunity"
] as const;

export const AI_CAPABILITY_RISK_LEVELS = ["low", "medium", "high", "critical"] as const;

export const AI_EXECUTION_MODES = [
  "explain_only",
  "draft_only",
  "propose_only",
  "approval_required",
  "execute_after_approval",
  "blocked"
] as const;

export type AiCapabilityStatus = (typeof AI_CAPABILITY_STATUSES)[number];
export type AiCapabilityCategory = (typeof AI_CAPABILITY_CATEGORIES)[number];
export type AiCapabilityRiskLevel = (typeof AI_CAPABILITY_RISK_LEVELS)[number];
export type AiExecutionMode = (typeof AI_EXECUTION_MODES)[number];

export type AiCapabilityDefinition = {
  id: string;
  label: string;
  description: string;
  status: AiCapabilityStatus;
  category: AiCapabilityCategory;
  riskLevel: AiCapabilityRiskLevel;
  readsWorkspaceData: boolean;
  writesWorkspaceData: boolean;
  externalSideEffect: boolean;
  requiresHumanApproval: boolean;
  requiresEvidence: boolean;
  requiresAuditLog: boolean;
  requiresOAuth: boolean;
  requiresTokenStorage: boolean;
  allowedExecutionMode: AiExecutionMode;
  currentLimitations: readonly string[];
  futureRequirements: readonly string[];
};

export type AiCapabilityExecutionContext = {
  humanApprovalGranted: boolean;
  evidenceAvailable: boolean;
  auditLogAvailable: boolean;
  oauthConnectionAvailable: boolean;
  secureTokenStorageAvailable: boolean;
};

export type AiCapabilityExecutionDecision =
  | { allowed: true; mode: AiExecutionMode; reasons: [] }
  | { allowed: false; mode: AiExecutionMode; reasons: string[] };

export const aiCapabilities = [
  {
    id: "ai.businessAnalystExplain",
    label: "Explicarea riscului comercial",
    description: "Explică riscuri și priorități exclusiv din pachetul de dovezi al spațiului de lucru.",
    status: "available_internal",
    category: "commercial_intelligence",
    riskLevel: "low",
    readsWorkspaceData: true,
    writesWorkspaceData: false,
    externalSideEffect: false,
    requiresHumanApproval: false,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: false,
    requiresTokenStorage: false,
    allowedExecutionMode: "explain_only",
    currentLimitations: ["Întrebări ghidate și răspunsuri limitate la dovezile disponibile."],
    futureRequirements: ["Evaluare continuă a calității și trasabilitate la nivel de afirmație."]
  },
  {
    id: "opportunity.suggestNextAction",
    label: "Sugestie pentru acțiunea următoare",
    description: "Propune un pas intern sigur fără a modifica oportunitatea sau a executa acțiunea.",
    status: "available_internal",
    category: "opportunity",
    riskLevel: "low",
    readsWorkspaceData: true,
    writesWorkspaceData: false,
    externalSideEffect: false,
    requiresHumanApproval: true,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: false,
    requiresTokenStorage: false,
    allowedExecutionMode: "propose_only",
    currentLimitations: ["Utilizatorul confirmă responsabilul, termenul și acțiunea."],
    futureRequirements: ["Politici pe rol pentru acceptarea recomandărilor."]
  },
  {
    id: "opportunity.prepareFollowUpDraft",
    label: "Pregătirea unui draft de follow-up",
    description: "Pregătește text pentru revizuire; nu trimite comunicarea.",
    status: "available_internal",
    category: "opportunity",
    riskLevel: "medium",
    readsWorkspaceData: true,
    writesWorkspaceData: true,
    externalSideEffect: false,
    requiresHumanApproval: true,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: false,
    requiresTokenStorage: false,
    allowedExecutionMode: "draft_only",
    currentLimitations: ["Draftul trebuie verificat și aprobat înainte de orice utilizare externă."],
    futureRequirements: ["Evaluări de calitate și politici de retenție pentru conținutul pregătit."]
  },
  {
    id: "audit.generateFromEvidence",
    label: "Audit din dovezi disponibile",
    description: "Structurează un audit prudent din obiecte comerciale și dovezi existente.",
    status: "available_internal",
    category: "audit",
    riskLevel: "medium",
    readsWorkspaceData: true,
    writesWorkspaceData: false,
    externalSideEffect: false,
    requiresHumanApproval: true,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: false,
    requiresTokenStorage: false,
    allowedExecutionMode: "explain_only",
    currentLimitations: ["Valorile estimate rămân separate de venitul confirmat."],
    futureRequirements: ["Versiuni aprobate și politici de retenție pentru livrabile."]
  },
  {
    id: "pilot.proofOfValueExplain",
    label: "Explicarea dovezii de valoare",
    description: "Explică progresul demonstrabil și recomandarea continuă, ajustează sau oprește.",
    status: "available_internal",
    category: "audit",
    riskLevel: "low",
    readsWorkspaceData: true,
    writesWorkspaceData: false,
    externalSideEffect: false,
    requiresHumanApproval: true,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: false,
    requiresTokenStorage: false,
    allowedExecutionMode: "explain_only",
    currentLimitations: ["Nu construiește un istoric înainte/după dacă nu există un baseline persistent."],
    futureRequirements: ["Baseline aprobat și criterii de succes versionate."]
  },
  {
    id: "calendar.readDemoAvailability",
    label: "Disponibilitate locală demonstrativă",
    description: "Citește reguli locale fictive de program și indisponibilitate într-un mediu controlat.",
    status: "sandbox_only",
    category: "calendar",
    riskLevel: "low",
    readsWorkspaceData: true,
    writesWorkspaceData: false,
    externalSideEffect: false,
    requiresHumanApproval: false,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: false,
    requiresTokenStorage: false,
    allowedExecutionMode: "explain_only",
    currentLimitations: ["Nu citește Google Calendar și nu reprezintă disponibilitate reală."],
    futureRequirements: ["Reguli de program, fus orar și fixtures locale izolate."]
  },
  {
    id: "calendar.proposeAppointment",
    label: "Propunerea unui interval",
    description: "Propune unu până la trei intervale locale; rezervarea rămâne în așteptare.",
    status: "sandbox_only",
    category: "calendar",
    riskLevel: "medium",
    readsWorkspaceData: true,
    writesWorkspaceData: false,
    externalSideEffect: false,
    requiresHumanApproval: true,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: false,
    requiresTokenStorage: false,
    allowedExecutionMode: "propose_only",
    currentLimitations: ["Nu creează evenimente și nu blochează intervale reale."],
    futureRequirements: ["Prevenirea suprapunerilor și confirmarea regulilor de business."]
  },
  {
    id: "calendar.googleFreeBusyPlanned",
    label: "Citire Google Calendar free/busy",
    description: "Capacitate viitoare cu scop minim pentru disponibilitate, fără citirea conținutului complet.",
    status: "blocked_until_security_review",
    category: "calendar",
    riskLevel: "high",
    readsWorkspaceData: true,
    writesWorkspaceData: false,
    externalSideEffect: false,
    requiresHumanApproval: true,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: true,
    requiresTokenStorage: true,
    allowedExecutionMode: "blocked",
    currentLimitations: ["Nu există integrare Google Calendar live."],
    futureRequirements: ["OAuth least-privilege, stocare criptată, revocare, audit și evaluare de securitate."]
  },
  {
    id: "calendar.createEventAfterApproval",
    label: "Crearea unui eveniment după aprobare",
    description: "Capacitate viitoare pentru crearea unui eveniment numai după aprobarea explicită.",
    status: "blocked_until_security_review",
    category: "calendar",
    riskLevel: "critical",
    readsWorkspaceData: true,
    writesWorkspaceData: true,
    externalSideEffect: true,
    requiresHumanApproval: true,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: true,
    requiresTokenStorage: true,
    allowedExecutionMode: "blocked",
    currentLimitations: ["Nu creează evenimente reale."],
    futureRequirements: ["Free/busy validat, idempotency, fus orar, revocare și aprobare consumată atomic."]
  },
  {
    id: "gmail.classifyImportedMessage",
    label: "Clasificarea unui mesaj importat manual",
    description: "Clasifică text furnizat explicit de utilizator fără acces la inbox.",
    status: "sandbox_only",
    category: "gmail",
    riskLevel: "medium",
    readsWorkspaceData: true,
    writesWorkspaceData: false,
    externalSideEffect: false,
    requiresHumanApproval: true,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: false,
    requiresTokenStorage: false,
    allowedExecutionMode: "explain_only",
    currentLimitations: ["Mesajul este introdus manual; nu există sincronizare Gmail."],
    futureRequirements: ["Redactare PII, retenție limitată și clasificare evaluată."]
  },
  {
    id: "gmail.prepareDraft",
    label: "Pregătirea unui draft Gmail",
    description: "Pregătește un răspuns pentru revizuire fără acces la Gmail și fără trimitere.",
    status: "sandbox_only",
    category: "gmail",
    riskLevel: "medium",
    readsWorkspaceData: true,
    writesWorkspaceData: false,
    externalSideEffect: false,
    requiresHumanApproval: true,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: false,
    requiresTokenStorage: false,
    allowedExecutionMode: "draft_only",
    currentLimitations: ["Draftul rămâne în ReveNew și nu este creat în Gmail."],
    futureRequirements: ["Politici de conținut, retenție și aprobare pe rol."]
  },
  {
    id: "gmail.createDraftAfterApproval",
    label: "Crearea unui draft Gmail după aprobare",
    description: "Capacitate viitoare limitată la crearea unui draft într-un fir selectat de utilizator.",
    status: "blocked_until_security_review",
    category: "gmail",
    riskLevel: "high",
    readsWorkspaceData: true,
    writesWorkspaceData: true,
    externalSideEffect: true,
    requiresHumanApproval: true,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: true,
    requiresTokenStorage: true,
    allowedExecutionMode: "blocked",
    currentLimitations: ["Nu există integrare Gmail live."],
    futureRequirements: ["OAuth limitat, fire selectate, tokenuri criptate, revocare și audit."]
  },
  {
    id: "gmail.sendAfterApproval",
    label: "Trimitere Gmail după aprobare",
    description: "Capacitate viitoare pentru trimitere explicit confirmată, niciodată implicită.",
    status: "blocked_until_security_review",
    category: "gmail",
    riskLevel: "critical",
    readsWorkspaceData: true,
    writesWorkspaceData: true,
    externalSideEffect: true,
    requiresHumanApproval: true,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: true,
    requiresTokenStorage: true,
    allowedExecutionMode: "blocked",
    currentLimitations: ["Nu trimite prin Gmail și nu citește inboxul."],
    futureRequirements: ["Confirmare finală, idempotency, restricții de outreach, revocare și jurnal de livrare."]
  },
  {
    id: "voice.simulatedReceptionist",
    label: "Recepționer simulat în mod text",
    description: "Simulează local o conversație de programare fără apel telefonic sau furnizor de voce.",
    status: "sandbox_only",
    category: "voice",
    riskLevel: "medium",
    readsWorkspaceData: true,
    writesWorkspaceData: false,
    externalSideEffect: false,
    requiresHumanApproval: true,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: false,
    requiresTokenStorage: false,
    allowedExecutionMode: "propose_only",
    currentLimitations: ["Numai text și date demonstrative; nu răspunde la apeluri reale."],
    futureRequirements: ["Reguli de conversație, disclosure AI și scenarii de escaladare."]
  },
  {
    id: "voice.extractAppointmentIntent",
    label: "Extragerea intenției de programare",
    description: "Extrage serviciul, intervalul preferat și informațiile lipsă dintr-un dialog text.",
    status: "sandbox_only",
    category: "voice",
    riskLevel: "medium",
    readsWorkspaceData: true,
    writesWorkspaceData: false,
    externalSideEffect: false,
    requiresHumanApproval: true,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: false,
    requiresTokenStorage: false,
    allowedExecutionMode: "explain_only",
    currentLimitations: ["Nu confirmă identitatea și nu rezervă un interval."],
    futureRequirements: ["Evaluare pe limba română, minimizare PII și praguri de încredere."]
  },
  {
    id: "voice.proposeBooking",
    label: "Propunerea unei programări",
    description: "Corelează intenția cu disponibilitatea controlată și propune o programare în așteptare.",
    status: "sandbox_only",
    category: "voice",
    riskLevel: "high",
    readsWorkspaceData: true,
    writesWorkspaceData: false,
    externalSideEffect: false,
    requiresHumanApproval: true,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: false,
    requiresTokenStorage: false,
    allowedExecutionMode: "propose_only",
    currentLimitations: ["Propunerea nu este o rezervare confirmată."],
    futureRequirements: ["Politici de confirmare, prevenirea suprapunerilor și reguli per serviciu."]
  },
  {
    id: "voice.handoffToHuman",
    label: "Escaladare către o persoană",
    description: "Pregătește motivul și rezumatul pentru transferul controlat către o persoană.",
    status: "sandbox_only",
    category: "voice",
    riskLevel: "medium",
    readsWorkspaceData: true,
    writesWorkspaceData: false,
    externalSideEffect: false,
    requiresHumanApproval: true,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: false,
    requiresTokenStorage: false,
    allowedExecutionMode: "propose_only",
    currentLimitations: ["Nu transferă apeluri reale."],
    futureRequirements: ["Reguli de disponibilitate umană și canal de handoff aprobat."]
  },
  {
    id: "voice.realPhoneReceptionistPlanned",
    label: "Recepționer AI pentru apeluri reale",
    description: "Capacitate viitoare de telefonie și voce în timp real, blocată până la revizuiri complete.",
    status: "blocked_until_security_review",
    category: "voice",
    riskLevel: "critical",
    readsWorkspaceData: true,
    writesWorkspaceData: true,
    externalSideEffect: true,
    requiresHumanApproval: true,
    requiresEvidence: true,
    requiresAuditLog: true,
    requiresOAuth: false,
    requiresTokenStorage: true,
    allowedExecutionMode: "blocked",
    currentLimitations: ["Nu există telefonie, apeluri reale sau model voice în timp real."],
    futureRequirements: ["Furnizor aprobat, disclosure AI, consimțământ, retenție, prevenirea abuzului, cost control și revizuire juridică."]
  }
] as const satisfies readonly AiCapabilityDefinition[];

export type AiCapabilityId = (typeof aiCapabilities)[number]["id"];

export function getAiCapability(id: AiCapabilityId) {
  return aiCapabilities.find((capability) => capability.id === id);
}

export function evaluateAiCapabilityExecution(
  capability: AiCapabilityDefinition,
  context: AiCapabilityExecutionContext
): AiCapabilityExecutionDecision {
  const reasons: string[] = [];

  if (capability.status === "planned" || capability.status === "blocked_until_security_review" || capability.allowedExecutionMode === "blocked") {
    reasons.push("Capacitatea nu este activată pentru execuție.");
  }
  if (capability.requiresEvidence && !context.evidenceAvailable) {
    reasons.push("Lipsesc dovezile necesare.");
  }
  if (capability.requiresAuditLog && !context.auditLogAvailable) {
    reasons.push("Jurnalul de audit nu este disponibil.");
  }
  if (capability.requiresHumanApproval && !context.humanApprovalGranted) {
    reasons.push("Lipsește aprobarea umană explicită.");
  }
  if (capability.requiresOAuth && !context.oauthConnectionAvailable) {
    reasons.push("Conexiunea OAuth nu este disponibilă.");
  }
  if (capability.requiresTokenStorage && !context.secureTokenStorageAvailable) {
    reasons.push("Stocarea securizată a tokenurilor nu este disponibilă.");
  }
  if (capability.externalSideEffect && capability.allowedExecutionMode !== "execute_after_approval") {
    reasons.push("Efectele externe nu sunt permise de modul curent.");
  }

  return reasons.length > 0
    ? { allowed: false, mode: capability.allowedExecutionMode, reasons }
    : { allowed: true, mode: capability.allowedExecutionMode, reasons: [] };
}
