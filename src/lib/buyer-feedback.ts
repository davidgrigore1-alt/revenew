export const comprehensionKeys = [
  "problem",
  "recommendation",
  "evidence",
  "missingInformation",
  "safeAction",
  "humanApproval",
  "valueSeparation",
  "validationPath"
] as const;

export type ComprehensionKey = (typeof comprehensionKeys)[number];
export type FitLabel =
  | "Fit puternic pentru audit"
  | "Fit posibil, necesită clarificare"
  | "Fit slab acum"
  | "Nu concluziona încă";

export type BuyerFeedbackInput = {
  companyName: string;
  industry: string;
  buyerRole: string;
  companySize: string;
  processComplexity: "unknown" | "none" | "simple" | "recurring" | "complex";
  monthlyVolume: string;
  currentProcess: string;
  demoDate: string;
  painClarity: "unknown" | "unclear" | "clear";
  commercialPain: string;
  blockage: string;
  currentFollowUp: string;
  approvalBottlenecks: string;
  followUpOwner: string;
  auditData: string;
  dataAvailability: "unknown" | "none" | "partial" | "available";
  anonymizable: "unknown" | "no" | "yes";
  inboxResistance: "unknown" | "no" | "yes";
  comprehension: Record<ComprehensionKey, boolean>;
  objections: string[];
  objectionNotes: string;
  auditReadiness: "unknown" | "no" | "possible" | "accepted";
  urgency: "unknown" | "low" | "medium" | "high";
  decisionAccess: "unknown" | "no" | "indirect" | "direct";
  productFeedback: string;
};

export type BuyerFitAssessment = {
  label: FitLabel;
  reasons: string[];
  missing: string[];
  nextStep: string;
};

export function createEmptyBuyerFeedback(): BuyerFeedbackInput {
  return {
    companyName: "",
    industry: "",
    buyerRole: "",
    companySize: "",
    processComplexity: "unknown",
    monthlyVolume: "",
    currentProcess: "",
    demoDate: new Date().toISOString().slice(0, 10),
    painClarity: "unknown",
    commercialPain: "",
    blockage: "",
    currentFollowUp: "",
    approvalBottlenecks: "",
    followUpOwner: "",
    auditData: "",
    dataAvailability: "unknown",
    anonymizable: "unknown",
    inboxResistance: "unknown",
    comprehension: Object.fromEntries(comprehensionKeys.map((key) => [key, false])) as Record<ComprehensionKey, boolean>,
    objections: [],
    objectionNotes: "",
    auditReadiness: "unknown",
    urgency: "unknown",
    decisionAccess: "unknown",
    productFeedback: ""
  };
}

export function assessBuyerFit(input: BuyerFeedbackInput): BuyerFitAssessment {
  const reasons: string[] = [];
  const missing: string[] = [];
  const recurringProcess = input.processComplexity === "recurring" || input.processComplexity === "complex";
  const usableData = input.dataAvailability === "available" || (input.dataAvailability === "partial" && input.anonymizable === "yes");
  const understoodDecision = input.comprehension.evidence && input.comprehension.safeAction;
  const auditPossible = input.auditReadiness === "possible" || input.auditReadiness === "accepted";
  const enoughContext = Boolean(input.companyName.trim() || input.buyerRole.trim())
    && input.painClarity !== "unknown"
    && input.processComplexity !== "unknown"
    && input.dataAvailability !== "unknown"
    && input.auditReadiness !== "unknown";

  if (input.painClarity === "clear") reasons.push("Durerea comercială este clară.");
  if (recurringProcess) reasons.push("Blocajele apar într-un proces comercial recurent.");
  if (usableData) reasons.push("Există date utilizabile pentru o verificare controlată.");
  if (input.anonymizable === "yes") reasons.push("Datele pot fi anonimizate.");
  if (understoodDecision) reasons.push("Cumpărătorul a înțeles dovada și acțiunea sigură.");
  if (auditPossible) reasons.push("Un audit controlat este acceptat sau realist.");
  if (input.urgency === "medium" || input.urgency === "high") reasons.push("Problema are prioritate comercială.");

  if (!input.companyName.trim()) missing.push("Compania nu este notată.");
  if (input.painClarity === "unknown" || !input.commercialPain.trim()) missing.push("Durerea comercială trebuie clarificată.");
  if (input.processComplexity === "unknown") missing.push("Frecvența și complexitatea procesului nu sunt clare.");
  if (input.dataAvailability === "unknown") missing.push("Disponibilitatea datelor nu este confirmată.");
  if (input.dataAvailability === "partial" && input.anonymizable === "unknown") missing.push("Trebuie confirmat dacă datele pot fi anonimizate.");
  if (!understoodDecision) missing.push("Înțelegerea dovezii și a acțiunii sigure nu este completă.");
  if (input.decisionAccess === "unknown" || input.decisionAccess === "no") missing.push("Accesul la persoana care decide nu este confirmat.");
  if (input.auditReadiness === "unknown") missing.push("Disponibilitatea pentru audit nu este confirmată.");

  if (!enoughContext) {
    return {
      label: "Nu concluziona încă",
      reasons: reasons.length ? reasons : ["Informațiile introduse nu susțin încă o concluzie responsabilă."],
      missing,
      nextStep: "Clarifică durerea comercială, procesul recurent, datele disponibile și disponibilitatea pentru audit."
    };
  }

  const weakFit = (input.processComplexity === "none" || input.processComplexity === "simple")
    && input.dataAvailability === "none"
    && (input.urgency === "low" || input.urgency === "unknown")
    && input.auditReadiness === "no";

  if (weakFit) {
    return {
      label: "Fit slab acum",
      reasons: ["Nu există acum un proces comercial recurent, date disponibile și interes pentru un audit controlat."],
      missing,
      nextStep: "Oprește calificarea pentru moment și revino numai dacă apar date, urgență sau un proces comercial repetabil."
    };
  }

  const strongFit = input.painClarity === "clear" && recurringProcess && usableData && understoodDecision && auditPossible;
  if (strongFit) {
    return {
      label: "Fit puternic pentru audit",
      reasons,
      missing,
      nextStep: input.dataAvailability === "available" || input.auditData.trim()
        ? "Cere 20–50 de cazuri comerciale recente, anonimizate, și confirmă cadrul auditului controlat."
        : "Clarifică formatul datelor, apoi cere 20–50 de cazuri comerciale recente pentru audit."
    };
  }

  let nextStep = "Trimite o prezentare de o pagină și clarifică întrebările rămase înainte de a propune auditul.";
  if (!understoodDecision) nextStep = "Îmbunătățește explicația despre dovadă și acțiunea sigură, apoi verifică din nou înțelegerea.";
  else if (input.decisionAccess === "no" || input.decisionAccess === "indirect") nextStep = "Propune o a doua discuție cu persoana care poate decide asupra auditului.";
  else if (input.dataAvailability === "none" || input.dataAvailability === "unknown") nextStep = "Clarifică formatul și sursa minimă de date necesare pentru un audit controlat.";
  else if (auditPossible) nextStep = "Cere 20–50 de cazuri comerciale recente, anonimizate, pentru a valida auditul controlat.";

  return { label: "Fit posibil, necesită clarificare", reasons, missing, nextStep };
}

export function generateBuyerFeedbackSummary(input: BuyerFeedbackInput, assessment = assessBuyerFit(input)): string {
  const understood = comprehensionKeys.filter((key) => input.comprehension[key]).length;
  const objections = [...input.objections, input.objectionNotes.trim()].filter(Boolean).join("; ") || "Nicio obiecție notată";
  const dataLabels = { unknown: "neconfirmată", none: "indisponibilă acum", partial: "parțială", available: "disponibilă" } as const;
  const answerLabels = { unknown: "neconfirmat", no: "nu", yes: "da" } as const;
  const auditLabels = { unknown: "neconfirmată", no: "nu acum", possible: "posibilă după clarificări", accepted: "acceptată ca pas următor" } as const;

  return [
    "CONCLUZII DEMO — ReveNew",
    `Data: ${input.demoDate || "necompletată"}`,
    `Cumpărător: ${input.companyName || "companie necompletată"} | ${input.industry || "industrie necompletată"} | ${input.buyerRole || "rol necompletat"} | ${input.companySize || "dimensiune necompletată"}`,
    `Proces comercial: ${input.currentProcess || "neclar"}; volum lunar estimat: ${input.monthlyVolume || "necompletat"}.`,
    `Durere comercială: ${input.commercialPain || "neclarificată"}`,
    `Blocaj observat: ${input.blockage || "necompletat"}`,
    `Dovezi de fit: ${assessment.reasons.join(" ") || "Nu sunt încă suficiente dovezi."}`,
    `Înțelegere confirmată: ${understood}/8 repere.` ,
    `Obiecții: ${objections}.`,
    `Date pentru audit: ${input.auditData || "neclarificate"}; disponibilitate: ${dataLabels[input.dataAvailability]}; anonimizare: ${answerLabels[input.anonymizable]}; rezistență la acces în inbox: ${answerLabels[input.inboxResistance]}.`,
    `Disponibilitate pentru audit: ${auditLabels[input.auditReadiness]}.`,
    `Evaluare: ${assessment.label}.`,
    `Lipsuri: ${assessment.missing.join(" ") || "Nicio lipsă critică notată."}`,
    `Următor pas recomandat: ${assessment.nextStep}`,
    `Feedback pentru produs: ${input.productFeedback || "Nimic notat."}`,
    "Limită de control: fără trimitere automată; valoarea estimată rămâne neconfirmată; orice acțiune comercială cere decizie umană."
  ].join("\n");
}
