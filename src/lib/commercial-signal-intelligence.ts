import type { CommercialSignal, RecoverabilityConfidence, RecoverabilityUrgency } from "@/lib/types";

export type CommercialSignalIntent =
  | "quote_request"
  | "follow_up"
  | "renewal"
  | "complaint_risk"
  | "referral"
  | "client_decision"
  | "lost_reason"
  | "call_note"
  | "internal_note"
  | "unknown";

export type SignalDeadlineClue = {
  label: string;
  evidence: string;
  exactDate: string | null;
  urgency: RecoverabilityUrgency;
};

export type SignalValueClue = {
  label: string;
  evidence: string;
  amount: number | null;
  currency: string | null;
  kind: "explicit" | "budget" | "qualitative";
};

export type CommercialSignalIntelligenceContext = {
  duplicateRisk?: boolean;
  activeOpportunityTitle?: string | null;
};

export type CommercialSignalIntelligence = {
  signalType: CommercialSignalIntent;
  signalTypeLabel: string;
  confidence: RecoverabilityConfidence;
  detectionReasons: string[];
  deadlineClue: SignalDeadlineClue | null;
  valueClue: SignalValueClue | null;
  missingInformation: string[];
  contextHints: string[];
  recommendedNextAction: string;
};

export const commercialSignalIntentLabels: Record<CommercialSignalIntent, string> = {
  quote_request: "Cerere de ofertă",
  follow_up: "Follow-up comercial",
  renewal: "Reînnoire",
  complaint_risk: "Risc sau reclamație",
  referral: "Recomandare",
  client_decision: "Decizie client",
  lost_reason: "Motiv de pierdere",
  call_note: "Notă după apel",
  internal_note: "Notă internă",
  unknown: "Semnal de clarificat"
};

const intentRules: Array<{
  intent: CommercialSignalIntent;
  patterns: RegExp[];
  reason: string;
}> = [
  { intent: "complaint_risk", patterns: [/reclamati/, /nemultumit/, /incident/, /complaint/, /escalad/, /risc/, /blocat/], reason: "Textul indică un risc, un blocaj sau o nemulțumire care necesită verificare." },
  { intent: "lost_reason", patterns: [/motiv.{0,12}pierder/, /oportunitat.{0,12}pierdut/, /ales.{0,18}(alt|furnizor)/, /fara buget/, /not moving forward/, /lost reason/], reason: "Textul indică o decizie negativă sau un motiv posibil de pierdere." },
  { intent: "client_decision", patterns: [/client.{0,18}(aprobat|respins|decis)/, /decizie.{0,18}client/, /accepted/, /declined/, /go ahead/, /confirmat.{0,12}(oferta|comanda)/], reason: "Textul indică o decizie comercială exprimată de client." },
  { intent: "renewal", patterns: [/reinnoir/, /prelungir/, /renewal/, /expira.{0,18}contract/, /contract.{0,18}expira/], reason: "Textul indică o reînnoire sau o prelungire contractuală." },
  { intent: "referral", patterns: [/recomandar/, /referral/, /introdus.{0,10}de/, /partener.{0,18}recomand/], reason: "Textul indică o introducere sau o recomandare comercială." },
  { intent: "quote_request", patterns: [/cerere.{0,12}ofert/, /solicita.{0,12}ofert/, /request for quote/, /\brfq\b/, /quotation/, /cotatie/, /pricing/, /buget.{0,18}(eur|ron|lei|usd|\d)/], reason: "Textul indică o cerere de ofertă, preț sau buget." },
  { intent: "follow_up", patterns: [/follow.?up/, /revenire/, /fara raspuns/, /no response/, /reminder/, /oferta.{0,30}(trimisa|transmisa).{0,30}raspuns/], reason: "Textul indică o revenire comercială sau lipsa unui răspuns." },
  { intent: "call_note", patterns: [/nota.{0,12}(dupa|din).{0,8}apel/, /am discutat.{0,14}(telefon|apel)/, /call note/], reason: "Textul consemnează o conversație telefonică." },
  { intent: "internal_note", patterns: [/nota interna/, /de verificat/, /uz intern/, /internal note/], reason: "Textul este formulat ca notă operațională internă." }
];

function fold(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function signalText(signal: CommercialSignal) {
  return fold([signal.title, signal.rawMessage, signal.extractedSummary, signal.detectedNeed, signal.notes]
    .filter(Boolean)
    .join(" "));
}

function isoDateFromOffset(now: Date, days: number) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days)).toISOString().slice(0, 10);
}

export function classifyCommercialSignalIntent(signal: CommercialSignal) {
  const text = signalText(signal);
  for (const rule of intentRules) {
    const matches = rule.patterns.filter((pattern) => pattern.test(text)).length;
    if (matches > 0) {
      const sourceReinforces = (rule.intent === "referral" && signal.source === "referral")
        || (rule.intent === "call_note" && signal.source === "phone");
      return {
        signalType: rule.intent,
        signalTypeLabel: commercialSignalIntentLabels[rule.intent],
        confidence: (matches > 1 || sourceReinforces ? "high" : "medium") as RecoverabilityConfidence,
        detectionReasons: [rule.reason]
      };
    }
  }
  if (signal.source === "phone") {
    return {
      signalType: "call_note" as const,
      signalTypeLabel: commercialSignalIntentLabels.call_note,
      confidence: "low" as const,
      detectionReasons: ["Sursa este telefonică, dar intenția comercială nu este explicită în text."]
    };
  }
  if (signal.source === "referral") {
    return {
      signalType: "referral" as const,
      signalTypeLabel: commercialSignalIntentLabels.referral,
      confidence: "medium" as const,
      detectionReasons: ["Sursa a fost înregistrată ca recomandare; contextul trebuie confirmat."]
    };
  }
  return {
    signalType: "unknown" as const,
    signalTypeLabel: commercialSignalIntentLabels.unknown,
    confidence: "low" as const,
    detectionReasons: ["Textul nu conține suficiente indicii pentru o clasificare mai specifică."]
  };
}

export function detectCommercialDeadlineClue(signal: CommercialSignal, now = new Date()): SignalDeadlineClue | null {
  const text = signalText(signal);
  const rules: Array<{ pattern: RegExp; label: string; evidence: string; offset?: number; urgency: RecoverabilityUrgency }> = [
    { pattern: /\bazi\b|\btoday\b/, label: "Termen menționat: azi", evidence: "Textul menționează explicit ziua curentă.", offset: 0, urgency: "critical" },
    { pattern: /\bmaine\b|\btomorrow\b/, label: "Termen menționat: mâine", evidence: "Textul menționează explicit ziua următoare.", offset: 1, urgency: "high" },
    { pattern: /pana (?:la )?vineri|by friday/, label: "Termen menționat: până vineri", evidence: "Termenul este exprimat relativ și trebuie confirmat înainte de planificare.", urgency: "high" },
    { pattern: /urgent|\basap\b|cat mai repede/, label: "Indiciu de urgență", evidence: "Textul solicită o reacție rapidă, fără dată calendaristică sigură.", urgency: "high" },
    { pattern: /saptamana aceasta|this week/, label: "Termen menționat: săptămâna aceasta", evidence: "Textul indică o fereastră de timp, nu o dată exactă.", urgency: "high" },
    { pattern: /saptamana viitoare|next week/, label: "Termen menționat: săptămâna viitoare", evidence: "Textul indică o fereastră de timp, nu o dată exactă.", urgency: "medium" },
    { pattern: /final(?:ul)? (?:de |al )?lunii|end of (?:the )?month/, label: "Termen menționat: finalul lunii", evidence: "Textul indică o fereastră de timp, nu o dată exactă.", urgency: "medium" }
  ];
  const match = rules.find((rule) => rule.pattern.test(text));
  return match ? {
    label: match.label,
    evidence: match.evidence,
    exactDate: match.offset === undefined ? null : isoDateFromOffset(now, match.offset),
    urgency: match.urgency
  } : null;
}

function parseAmount(raw: string, suffix?: string) {
  const compact = raw.replace(/\s/g, "");
  const decimal = compact.includes(",") && !compact.includes(".") ? compact.replace(",", ".") : compact.replace(/[.,](?=\d{3}(?:\D|$))/g, "");
  const amount = Number(decimal);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * (suffix?.toLowerCase() === "k" ? 1000 : 1));
}

export function detectCommercialValueClue(signal: CommercialSignal): SignalValueClue | null {
  const text = signalText(signal);
  const explicit = text.match(/(?:buget(?:ul)?\s*(?:de|este|:)?\s*)?(\d[\d\s.,]*)(k)?\s*(eur|euro|ron|lei|usd)\b/);
  if (explicit) {
    const amount = parseAmount(explicit[1], explicit[2]);
    const currency = /eur|euro/.test(explicit[3]) ? "EUR" : /ron|lei/.test(explicit[3]) ? "RON" : "USD";
    if (amount !== null) return { label: `Valoare menționată: ${amount.toLocaleString("ro-RO")} ${currency}`, evidence: "Valoarea apare explicit în text și necesită confirmare umană.", amount, currency, kind: "explicit" };
  }
  const budget = text.match(/buget(?:ul)?\s*(?:de|este|:)?\s*(\d[\d\s.,]*)(k)?\b/);
  if (budget) {
    const amount = parseAmount(budget[1], budget[2]);
    if (amount !== null) return { label: `Buget menționat: ${amount.toLocaleString("ro-RO")}, monedă neclară`, evidence: "Textul conține un buget, dar moneda nu este explicită.", amount, currency: null, kind: "budget" };
  }
  if (/contract mare|valoare semnificativa|oferta revizuita|buget important/.test(text)) {
    return { label: "Potențial valoric menționat, fără sumă confirmată", evidence: "Textul folosește un indiciu calitativ; nicio valoare nu este calculată automat.", amount: null, currency: null, kind: "qualitative" };
  }
  return null;
}

export function detectCommercialSignalGaps(
  signal: CommercialSignal,
  deadlineClue: SignalDeadlineClue | null,
  valueClue: SignalValueClue | null
) {
  const gaps: string[] = [];
  if (!signal.contactCompany && !signal.matchedOrganizationId) gaps.push("Companie confirmată");
  if (!signal.contactName && !signal.contactEmail && !signal.contactPhone && !signal.matchedContactId) gaps.push("Persoană de contact confirmată");
  if (!signal.detectedFromOpportunityId) gaps.push("Legătură cu o oportunitate existentă");
  if (!signal.assignedToProfileId) gaps.push("Responsabil comercial");
  if (!deadlineClue && !signal.requestedDate && !signal.suggestedDueDate) gaps.push("Termen comercial confirmat");
  if (!signal.estimatedValueMin && !signal.estimatedValueMax && (!valueClue || valueClue.kind !== "explicit")) gaps.push("Valoare și monedă confirmate");
  else if (valueClue && (!valueClue.currency || valueClue.kind === "qualitative")) gaps.push("Valoare și monedă confirmate");
  if (!signal.nextStep && !signal.recommendedAction) gaps.push("Următorul pas confirmat");
  if (signalText(signal).length < 35) gaps.push("Context comercial suficient");
  return Array.from(new Set(gaps));
}

export function recommendCommercialSignalNextAction(
  signalType: CommercialSignalIntent,
  signal: CommercialSignal,
  context: CommercialSignalIntelligenceContext
) {
  if (signal.detectedFromOpportunityId || context.activeOpportunityTitle) {
    return "Leagă semnalul de oportunitatea existentă și confirmă intern următoarea acțiune, responsabilul și termenul.";
  }
  const actions: Record<CommercialSignalIntent, string> = {
    quote_request: "Confirmă cerința, valoarea, moneda și termenul înainte de a pregăti următorul pas comercial.",
    follow_up: "Verifică istoricul și confirmă o revenire cu responsabil și termen clar.",
    renewal: "Confirmă data contractuală, condițiile de reînnoire și responsabilul comercial.",
    complaint_risk: "Evaluează impactul, desemnează un responsabil și stabilește intervenția umană prioritară.",
    referral: "Confirmă sursa recomandării, persoana de contact și relevanța comercială înainte de calificare.",
    client_decision: "Verifică decizia în contextul oportunității și înregistrează următorul pas sau rezultatul corect.",
    lost_reason: "Confirmă motivul pierderii și decide dacă semnalul se arhivează sau necesită o revenire controlată.",
    call_note: "Confirmă concluzia apelului, responsabilul și următorul pas intern.",
    internal_note: "Clarifică nota cu echipa și alocă un responsabil înainte de orice acțiune externă.",
    unknown: "Completează contextul comercial și confirmă compania, contactul și următorul pas."
  };
  return context.duplicateRisk ? `Verifică mai întâi posibilul duplicat. ${actions[signalType]}` : actions[signalType];
}

export function analyzeCommercialSignalIntelligence(
  signal: CommercialSignal,
  context: CommercialSignalIntelligenceContext = {},
  now = new Date()
): CommercialSignalIntelligence {
  const classification = classifyCommercialSignalIntent(signal);
  const deadlineClue = detectCommercialDeadlineClue(signal, now);
  const valueClue = detectCommercialValueClue(signal);
  const contextHints = [
    signal.matchedOrganizationId ? "Companie existentă identificată în CRM." : "",
    signal.matchedContactId ? "Contact existent identificat în CRM." : "",
    signal.detectedFromOpportunityId ? "Semnal legat deja de o oportunitate." : "",
    context.activeOpportunityTitle ? `Oportunitate activă posibil relevantă: ${context.activeOpportunityTitle}.` : "",
    context.duplicateRisk ? "Există un posibil semnal duplicat în același workspace." : ""
  ].filter(Boolean);
  return {
    ...classification,
    deadlineClue,
    valueClue,
    missingInformation: detectCommercialSignalGaps(signal, deadlineClue, valueClue),
    contextHints,
    recommendedNextAction: recommendCommercialSignalNextAction(classification.signalType, signal, context)
  };
}
