export type AuditFitLabel =
  | "Pregătit pentru audit controlat"
  | "Audit posibil, necesită clarificare"
  | "Audit dificil acum"
  | "Nu concluziona încă";

export type AuditIntakeInput = {
  companyName: string;
  industry: string;
  buyerRole: string;
  companySize: string;
  processComplexity: string;
  blockers: string[];
  recentExample: string;
  caseVolume: "" | "under10" | "10to20" | "20to50" | "over50";
  caseTypes: string[];
  dataRecency: string;
  anonymization: "" | "yes" | "partial" | "unknown";
  inboxAccess: string;
  availableFields: string[];
  objectives: string[];
  valuableOutcome: string;
  constraints: string;
};

export type AuditIntakeAssessment = {
  label: AuditFitLabel;
  reasons: string[];
  missingInformation: string[];
  recommendedScope: string;
  nextStep: string;
  safetyNotes: string[];
};

export const caseVolumeLabels: Record<AuditIntakeInput["caseVolume"], string> = {
  "": "Necompletat",
  under10: "Sub 10 cazuri",
  "10to20": "10–20 cazuri",
  "20to50": "20–50 cazuri",
  over50: "Peste 50 de cazuri"
};

export function createEmptyAuditIntake(): AuditIntakeInput {
  return {
    companyName: "",
    industry: "",
    buyerRole: "",
    companySize: "",
    processComplexity: "",
    blockers: [],
    recentExample: "",
    caseVolume: "",
    caseTypes: [],
    dataRecency: "",
    anonymization: "",
    inboxAccess: "",
    availableFields: [],
    objectives: [],
    valuableOutcome: "",
    constraints: ""
  };
}

export function assessAuditIntake(input: AuditIntakeInput): AuditIntakeAssessment {
  const missingInformation: string[] = [];
  if (!input.companyName.trim()) missingInformation.push("denumirea companiei");
  if (!input.industry) missingInformation.push("industria");
  if (!input.buyerRole.trim()) missingInformation.push("rolul persoanei care coordonează auditul");
  if (!input.companySize) missingInformation.push("dimensiunea aproximativă a companiei");
  if (!input.processComplexity) missingInformation.push("complexitatea procesului comercial");
  if (input.blockers.length === 0) missingInformation.push("cel puțin un blocaj comercial observabil");
  if (!input.caseVolume) missingInformation.push("numărul de cazuri recente disponibile");
  if (input.caseTypes.length === 0) missingInformation.push("tipurile de cazuri disponibile");
  if (!input.dataRecency) missingInformation.push("perioada din care provin cazurile");
  if (!input.anonymization) missingInformation.push("posibilitatea de anonimizare");
  if (input.availableFields.length === 0) missingInformation.push("câmpurile de date disponibile");
  if (input.objectives.length === 0 && !input.valuableOutcome.trim()) missingInformation.push("rezultatul urmărit prin audit");

  const strongVolume = input.caseVolume === "20to50" || input.caseVolume === "over50";
  const possibleVolume = input.caseVolume === "10to20";
  const anonymizable = input.anonymization === "yes" || input.anonymization === "partial";
  const usefulFields = input.availableFields.length >= 5;
  const clearObjective = input.objectives.length > 0 || Boolean(input.valuableOutcome.trim());
  const reasons: string[] = [];

  let label: AuditFitLabel;
  if (missingInformation.length >= 6) {
    label = "Nu concluziona încă";
    reasons.push("Sunt prea puține informații pentru a recomanda responsabil un domeniu de analiză.");
  } else if (input.caseVolume === "under10" || input.blockers.length === 0 || input.availableFields.length === 0) {
    label = "Audit dificil acum";
    if (input.caseVolume === "under10") reasons.push("Eșantionul disponibil este prea mic pentru o verificare comercială utilă.");
    if (input.blockers.length === 0) reasons.push("Nu este încă definit un blocaj comercial observabil.");
    if (input.availableFields.length === 0) reasons.push("Nu sunt confirmate datele minime care pot susține concluziile.");
  } else if (strongVolume && anonymizable && usefulFields && clearObjective) {
    label = "Pregătit pentru audit controlat";
    reasons.push("Volumul de cazuri permite un eșantion controlat de 20–50 de situații recente.");
    reasons.push("Blocajele și obiectivul auditului sunt suficient de clare pentru o primă analiză.");
    reasons.push("Datele pot fi minimizate și anonimizate înainte de analiză.");
  } else {
    label = "Audit posibil, necesită clarificare";
    if (possibleVolume) reasons.push("Cele 10–20 de cazuri pot susține o verificare inițială, dar nu încă un eșantion complet.");
    if (!anonymizable) reasons.push("Modul de anonimizare trebuie clarificat înaintea transferului oricăror date.");
    if (!usefulFields) reasons.push("Câmpurile disponibile trebuie completate pentru concluzii verificabile.");
    if (!clearObjective) reasons.push("Rezultatul urmărit trebuie formulat înainte de începerea analizei.");
  }

  const recommendedScope = strongVolume
    ? "Selectează 20–50 de cazuri comerciale recente, reprezentative pentru blocajele bifate."
    : possibleVolume
      ? "Începe cu cele 10–20 de cazuri disponibile și confirmă dacă eșantionul poate fi extins la 20–50."
      : input.caseVolume === "under10"
        ? "Nu începe analiza completă; completează mai întâi un eșantion de minimum 20 de cazuri recente."
        : "Confirmă disponibilitatea unui eșantion de 20–50 de cazuri comerciale recente.";

  const nextStep = label === "Pregătit pentru audit controlat"
    ? "Pregătește exportul minim, anonimizează datele și stabilește o revizuire umană a eșantionului."
    : label === "Audit dificil acum"
      ? "Documentează un blocaj concret și completează eșantionul și câmpurile minime înainte de analiză."
      : label === "Nu concluziona încă"
        ? "Completează informațiile lipsă înainte de a decide dacă auditul este potrivit."
        : "Clarifică informațiile lipsă, apoi confirmă eșantionul și persoana responsabilă pentru revizuire.";

  return {
    label,
    reasons,
    missingInformation,
    recommendedScope,
    nextStep,
    safetyNotes: [
      "Primul audit nu cere acces complet la inbox.",
      "Datele pot fi anonimizate înainte de analiză.",
      "Nicio comunicare externă nu este trimisă automat.",
      "Valorile estimate nu sunt venit confirmat și auditul nu garantează recuperarea lor.",
      "Deciziile și acțiunile comerciale rămân sub control uman."
    ]
  };
}

function listed(values: string[], fallback = "De clarificat") {
  return values.length > 0 ? values.join(", ") : fallback;
}

export function generateAuditPlan(input: AuditIntakeInput, assessment = assessAuditIntake(input)) {
  return [
    "PLAN DE AUDIT CONTROLAT",
    "",
    `Evaluare: ${assessment.label}`,
    "",
    "1. Context companie",
    `${input.companyName.trim() || "Companie de clarificat"} · ${input.industry || "industrie de clarificat"} · ${input.companySize || "dimensiune de clarificat"}`,
    `Coordonare: ${input.buyerRole.trim() || "rol de clarificat"}. Proces comercial: ${input.processComplexity || "de clarificat"}.`,
    "",
    "2. Blocaje urmărite",
    listed(input.blockers),
    input.recentExample.trim() ? `Exemplu recent: ${input.recentExample.trim()}` : "Exemplul recent trebuie încă documentat.",
    "",
    "3. Cazuri recomandate pentru analiză",
    `${assessment.recommendedScope} Tipuri disponibile: ${listed(input.caseTypes)}. Perioadă: ${input.dataRecency || "de clarificat"}.`,
    "",
    "4. Date necesare",
    listed(input.availableFields),
    "",
    "5. Confidențialitate și limitări",
    ...assessment.safetyNotes.map((note) => `- ${note}`),
    input.constraints.trim() ? `- Constrângeri declarate: ${input.constraints.trim()}` : "- Alte constrângeri: de clarificat înainte de analiză.",
    "",
    "6. Ce va produce auditul",
    `${listed(input.objectives)}. ${input.valuableOutcome.trim() || "Criteriul concret de utilitate trebuie confirmat."}`,
    "",
    "7. Următorul pas",
    assessment.nextStep,
    assessment.missingInformation.length > 0 ? `Informații de completat: ${assessment.missingInformation.join(", ")}.` : "Informațiile minime pentru pregătire sunt completate."
  ].join("\n");
}
