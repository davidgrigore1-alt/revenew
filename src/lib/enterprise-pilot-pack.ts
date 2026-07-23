import "server-only";

import {
  getRevenueRecoveryAudit,
  type RevenueRecoveryAudit,
  type RevenueRecoveryAuditGap
} from "@/lib/revenue-recovery-audit";
import type { WorkspaceDecisionEvidence, WorkspaceDecisionItem } from "@/lib/workspace-decision-queue";

export type EnterprisePilotPhase = {
  period: "Zilele 1–2" | "Zilele 3–7" | "Zilele 8–14";
  objective: string;
  actions: string[];
  expectedResult: string;
};

export type EnterprisePilotCriterion = {
  id: string;
  label: string;
  currentState: string;
  pilotTarget: string;
  measurement: string;
};

export type EnterprisePilotStakeholder = {
  role: "CEO / Fondator" | "CFO / Financiar" | "Director comercial" | "Operațiuni" | "IT / Securitate";
  focus: string;
  note: string;
};

export type EnterprisePilotClientInput = {
  label: string;
  availability: "Necesar" | "Dacă este disponibil";
  purpose: string;
};

export type EnterprisePilotPack = {
  generatedAt: string;
  workspaceName: string;
  status: RevenueRecoveryAudit["status"];
  statusLabel: RevenueRecoveryAudit["statusLabel"];
  executiveTitle: "Propunere pilot ReveNew";
  executiveSubtitle: string;
  executiveSummary: string;
  primaryCommercialProblem: {
    title: string;
    reason: string;
    whyItMatters: string;
  };
  estimatedExposedValueByCurrency: RevenueRecoveryAudit["estimatedExposedValueByCurrency"];
  pilotObjective: string;
  firstSafeActionLabel: string;
  firstSafeActionHref: string;
  topBusinessRisks: WorkspaceDecisionItem[];
  proofOfValuePriorities: WorkspaceDecisionItem[];
  implementationScope: string[];
  fourteenDayPlan: EnterprisePilotPhase[];
  successCriteria: EnterprisePilotCriterion[];
  buyerCommitteeNotes: EnterprisePilotStakeholder[];
  requiredClientInputs: EnterprisePilotClientInput[];
  safetyNotes: string[];
  evidence: WorkspaceDecisionEvidence[];
  auditHref: "/reports/revenue-recovery-audit";
  sourceState: RevenueRecoveryAudit["sourceState"];
  disclaimer: string;
};

const stakeholderNotes: EnterprisePilotStakeholder[] = [
  {
    role: "CEO / Fondator",
    focus: "Control comercial și disciplină de execuție",
    note: "Pilotul arată ce decizii necesită atenție, cine trebuie să acționeze și ce poate fi verificat."
  },
  {
    role: "CFO / Financiar",
    focus: "Claritatea valorilor și trasabilitate",
    note: "Estimările rămân separate pe monedă, distincte de venitul confirmat și legate de dovezi."
  },
  {
    role: "Director comercial",
    focus: "Follow-up, responsabilitate și acțiuni următoare",
    note: "Pilotul verifică dacă prioritățile pot avansa prin pași clari, atribuiți și urmăriți."
  },
  {
    role: "Operațiuni",
    focus: "Claritatea procesului",
    note: "Buclele deschise sunt ordonate într-o coadă comună, cu aprobare umană și rezultat observabil."
  },
  {
    role: "IT / Securitate",
    focus: "Acces controlat și minimizarea datelor",
    note: "Pachetul folosește numai datele disponibile utilizatorului autentificat și nu execută acțiuni externe."
  }
];

const requiredClientInputs: EnterprisePilotClientInput[] = [
  {
    label: "Oportunități comerciale sau exportul de pipeline",
    availability: "Necesar",
    purpose: "Stabilește obiectele comerciale care intră în evaluarea pilotului."
  },
  {
    label: "Companii și contacte relevante",
    availability: "Necesar",
    purpose: "Clarifică relația comercială și persoanele potrivite pentru follow-up."
  },
  {
    label: "Statusul follow-up-urilor și acțiunilor următoare",
    availability: "Necesar",
    purpose: "Permite identificarea buclelor întârziate sau neatribuite."
  },
  {
    label: "Documente și răspunsuri comerciale",
    availability: "Dacă este disponibil",
    purpose: "Ajută la verificarea progresului fără a presupune că un document a fost trimis."
  },
  {
    label: "Responsabilii implicați în pilot",
    availability: "Necesar",
    purpose: "Face posibilă atribuirea clară a deciziilor și acțiunilor."
  },
  {
    label: "Regulile interne de aprobare",
    availability: "Necesar",
    purpose: "Păstrează deciziile sensibile sub controlul explicit al clientului."
  }
];

const safetyNotes = [
  "Datele provin numai din spațiul de lucru accesibil utilizatorului autentificat.",
  "Valorile estimate sunt deduplicate pe oportunitate, păstrate separat pe monedă și nu sunt venit confirmat.",
  "Aprobarea umană rămâne obligatorie pentru deciziile comerciale controlate.",
  "Pachetul nu trimite comunicări externe și nu execută acțiuni în numele utilizatorului.",
  "Un document pregătit sau aprobat nu este considerat trimis fără dovadă.",
  "Rezultatele comerciale sunt declarate și confirmate de utilizatori."
];

const gapScope: Record<RevenueRecoveryAuditGap["type"], (count: number) => string> = {
  overdue_follow_up: (count) => `Revizuirea celor ${count} follow-up-uri întârziate și confirmarea următorului pas.`,
  pending_approval: (count) => `Clarificarea celor ${count} aprobări în așteptare prin decizie umană.`,
  prepared_work_not_advanced: (count) => `Revizuirea celor ${count} documente pregătite fără pas final confirmat.`,
  unresolved_signal: (count) => `Evaluarea celor ${count} semnale comerciale prioritare nerezolvate.`,
  opportunity_without_next_action: (count) => `Definirea acțiunii următoare pentru cele ${count} oportunități incomplete.`,
  opportunity_without_owner: (count) => `Atribuirea unui responsabil pentru cele ${count} oportunități nealocate.`,
  company_without_primary_contact: (count) => `Validarea contactului principal pentru cele ${count} cazuri incomplete.`,
  inactive_active_opportunity: (count) => `Reconfirmarea celor ${count} oportunități active fără progres recent.`,
  high_value_blocked_opportunity: (count) => `Revizuirea celor ${count} oportunități cu valoare estimată ridicată și execuție blocată.`
};

function executiveSummary(audit: RevenueRecoveryAudit) {
  if (audit.sourceState === "empty_workspace") {
    return "Datele disponibile nu permit încă o propunere completă. Pilotul poate începe cu un set minim de oportunități și semnale, apoi cu stabilirea unei linii de bază verificabile.";
  }
  if (audit.status === "critical") {
    return `Auditul indică ${audit.counts.criticalDecisions} ${audit.counts.criticalDecisions === 1 ? "decizie critică" : "decizii critice"} și ${audit.priorities.length} priorități pentru validare. Pilotul propus urmărește claritatea operațională, responsabilitatea și progresul documentat, fără a presupune venit recuperat.`;
  }
  if (audit.status === "attention" || audit.status === "incomplete") {
    return `Auditul indică ${audit.counts.attentionDecisions} ${audit.counts.attentionDecisions === 1 ? "prioritate care necesită" : "priorități care necesită"} atenție și informații care trebuie completate. Pilotul propus verifică dacă aceste bucle pot fi transformate în decizii și acțiuni urmărite.`;
  }
  return "Datele disponibile nu indică blocaje critice. Pilotul propus poate valida disciplina de follow-up, responsabilitatea și vizibilitatea managerială înaintea unei extinderi.";
}

function primaryProblem(audit: RevenueRecoveryAudit) {
  const primary = audit.priorities[0];
  if (primary) {
    return {
      title: primary.title,
      reason: primary.reason,
      whyItMatters: primary.whyItMatters
    };
  }
  if (audit.sourceState === "empty_workspace") {
    return {
      title: "Bază de evaluare incompletă",
      reason: "Nu există încă suficiente oportunități sau semnale comerciale pentru o evaluare verificabilă.",
      whyItMatters: "Fără un set minim de date, pilotul nu poate măsura claritatea operațională înainte și după intervenție."
    };
  }
  return {
    title: "Nu există un blocaj critic dovedit",
    reason: "Datele disponibile indică o stare stabilă sau fără excepții prioritare.",
    whyItMatters: "Pilotul poate valida menținerea disciplinei comerciale și viteza de revizuire managerială."
  };
}

function implementationScope(audit: RevenueRecoveryAudit) {
  if (audit.sourceState === "empty_workspace") {
    return [
      "Încărcarea unui set minim de oportunități sau semnale comerciale.",
      "Confirmarea responsabililor, contactelor și stării de follow-up.",
      "Stabilirea primei linii de bază pentru auditul operațional."
    ];
  }
  const scope = [
    `Revizuirea celor ${audit.priorities.length} priorități comerciale susținute de dovezi.`,
    ...audit.operationalGaps.map((gap) => gapScope[gap.type](gap.count)),
    "Compararea buclelor deschise la începutul și la finalul pilotului."
  ];
  return Array.from(new Set(scope)).slice(0, 6);
}

function middlePhaseActions(audit: RevenueRecoveryAudit) {
  const actions: string[] = [];
  if (audit.counts.missingOwners > 0) actions.push(`Atribuie responsabili pentru cele ${audit.counts.missingOwners} oportunități nealocate.`);
  if (audit.counts.missingNextActions > 0) actions.push(`Definește acțiunea următoare pentru cele ${audit.counts.missingNextActions} oportunități incomplete.`);
  if (audit.counts.pendingApprovals > 0) actions.push(`Revizuiește cele ${audit.counts.pendingApprovals} aprobări în așteptare.`);
  if (audit.counts.missingPrimaryContacts > 0) actions.push(`Validează contactul principal pentru cele ${audit.counts.missingPrimaryContacts} cazuri incomplete.`);
  if (audit.counts.unresolvedSignals > 0) actions.push(`Evaluează cele ${audit.counts.unresolvedSignals} semnale prioritare nerezolvate.`);
  if (audit.counts.preparedWorkNotAdvanced > 0) actions.push(`Revizuiește cele ${audit.counts.preparedWorkNotAdvanced} documente pregătite fără pas final confirmat.`);
  if (audit.counts.overdueFollowUps > 0) actions.push(`Confirmă următorul pas pentru cele ${audit.counts.overdueFollowUps} follow-up-uri întârziate.`);
  if (actions.length === 0) {
    actions.push("Verifică responsabilul, contactul și acțiunea următoare pentru prioritățile incluse în pilot.");
  }
  return actions.slice(0, 5);
}

function fourteenDayPlan(audit: RevenueRecoveryAudit): EnterprisePilotPhase[] {
  const firstActions = audit.sourceState === "empty_workspace"
    ? [
        "Adaugă un set minim de oportunități sau semnale comerciale reale.",
        "Confirmă persoanele responsabile și regulile de aprobare.",
        "Stabilește criteriile de succes ale pilotului."
      ]
    : [
        `Confirmă datele disponibile pentru cele ${audit.counts.activeOpportunitiesConsidered} oportunități active analizate.`,
        `Revizuiește primele ${audit.priorities.length} priorități din audit.`,
        "Agreează criteriile de succes și responsabilul pentru evaluarea pilotului."
      ];

  return [
    {
      period: "Zilele 1–2",
      objective: "Confirmarea bazei de lucru",
      actions: firstActions,
      expectedResult: "Echipa are un domeniu de pilot clar, date cunoscute și criterii de evaluare agreate."
    },
    {
      period: "Zilele 3–7",
      objective: "Clarificarea buclelor comerciale",
      actions: audit.sourceState === "empty_workspace"
        ? ["Construiește prima coadă de priorități și verifică dovezile disponibile."]
        : middlePhaseActions(audit),
      expectedResult: "Fiecare caz inclus are o decizie, un responsabil sau un pas următor documentat."
    },
    {
      period: "Zilele 8–14",
      objective: "Evaluarea progresului și decizia de continuare",
      actions: [
        "Compară buclele deschise cu situația de la începutul pilotului.",
        "Confirmă rezultatele și excepțiile rămase împreună cu responsabilii.",
        "Pregătește un rezumat managerial bazat pe dovezi.",
        "Decide dacă domeniul de utilizare trebuie menținut, ajustat sau extins."
      ],
      expectedResult: "Conducerea poate decide continuarea pe baza clarității și disciplinei operaționale observate."
    }
  ];
}

function successCriteria(audit: RevenueRecoveryAudit): EnterprisePilotCriterion[] {
  const criteria: EnterprisePilotCriterion[] = [];
  if (audit.counts.criticalDecisions > 0) {
    criteria.push({
      id: "critical-decisions",
      label: "Decizii critice revizuite",
      currentState: `${audit.counts.criticalDecisions} identificate`,
      pilotTarget: "Fiecare decizie critică are rezultat de revizuire și pas următor.",
      measurement: "Număr de decizii cu rezultat înregistrat."
    });
  }
  if (audit.counts.missingOwners > 0) {
    criteria.push({
      id: "owners",
      label: "Responsabilitate clarificată",
      currentState: `${audit.counts.missingOwners} oportunități fără responsabil`,
      pilotTarget: "Fiecare caz inclus are un responsabil confirmat.",
      measurement: "Număr de oportunități cu responsabil atribuit."
    });
  }
  if (audit.counts.missingNextActions > 0) {
    criteria.push({
      id: "next-actions",
      label: "Acțiuni următoare definite",
      currentState: `${audit.counts.missingNextActions} oportunități fără acțiune următoare`,
      pilotTarget: "Fiecare caz inclus are acțiune, responsabil și termen.",
      measurement: "Număr de oportunități cu acțiune următoare completă."
    });
  }
  if (audit.counts.pendingApprovals > 0) {
    criteria.push({
      id: "approvals",
      label: "Aprobări clarificate",
      currentState: `${audit.counts.pendingApprovals} aprobări în așteptare`,
      pilotTarget: "Fiecare aprobare inclusă are o decizie umană înregistrată.",
      measurement: "Număr de aprobări cu rezultat explicit."
    });
  }
  if (audit.counts.missingPrimaryContacts > 0) {
    criteria.push({
      id: "contacts",
      label: "Contacte principale validate",
      currentState: `${audit.counts.missingPrimaryContacts} cazuri fără contact principal`,
      pilotTarget: "Contactele necesare pilotului sunt confirmate sau marcate ca informație lipsă.",
      measurement: "Număr de cazuri cu situația contactului clarificată."
    });
  }
  if (audit.counts.preparedWorkNotAdvanced > 0) {
    criteria.push({
      id: "prepared-work",
      label: "Documente pregătite revizuite",
      currentState: `${audit.counts.preparedWorkNotAdvanced} documente fără pas final confirmat`,
      pilotTarget: "Fiecare document inclus are o decizie de utilizare sau revizuire.",
      measurement: "Număr de documente cu stare confirmată de utilizator."
    });
  }
  if (audit.estimatedExposedValueByCurrency.length > 0) {
    criteria.push({
      id: "value-clarity",
      label: "Valoare estimată clarificată",
      currentState: `${audit.estimatedExposedValueByCurrency.length} ${audit.estimatedExposedValueByCurrency.length === 1 ? "monedă urmărită" : "monede urmărite"}`,
      pilotTarget: "Estimările rămân deduplicate, explicate și separate de venitul confirmat.",
      measurement: "Verificare managerială a valorilor și surselor lor."
    });
  }
  if (criteria.length === 0) {
    criteria.push({
      id: "audit-baseline",
      label: "Bază auditabilă pentru pilot",
      currentState: audit.sourceState === "empty_workspace" ? "Date insuficiente" : "Fără excepții critice identificate",
      pilotTarget: "Există un set minim de date și o revizuire managerială documentată.",
      measurement: "Confirmare manuală la începutul și la finalul pilotului."
    });
  }
  criteria.push({
    id: "review-time",
    label: "Timp de revizuire managerială",
    currentState: "Se măsoară manual la începutul pilotului",
    pilotTarget: "Comparație între timpul inițial și timpul final, fără a presupune o reducere.",
    measurement: "Cronometrare manuală a aceleiași revizuiri."
  });
  return criteria.slice(0, 7);
}

export function buildEnterprisePilotPack(audit: RevenueRecoveryAudit): EnterprisePilotPack {
  const primary = primaryProblem(audit);
  const evidenceLabel = audit.evidence[0]?.label;
  const pilotObjective = audit.sourceState === "empty_workspace"
    ? "Construirea în 14 zile a unei baze minime, verificabile, pentru prioritizare și revizuire managerială."
    : `Validarea în 14 zile a unui mod controlat de lucru pentru „${primary.title}”${evidenceLabel ? `, pornind de la ${evidenceLabel.toLocaleLowerCase("ro-RO")}` : ""}.`;

  return {
    generatedAt: audit.generatedAt,
    workspaceName: audit.workspaceName,
    status: audit.status,
    statusLabel: audit.statusLabel,
    executiveTitle: "Propunere pilot ReveNew",
    executiveSubtitle: "Plan de validare comercială bazat pe auditul de recuperare venituri.",
    executiveSummary: executiveSummary(audit),
    primaryCommercialProblem: primary,
    estimatedExposedValueByCurrency: audit.estimatedExposedValueByCurrency,
    pilotObjective,
    firstSafeActionLabel: audit.firstSafeActionLabel,
    firstSafeActionHref: audit.firstSafeActionHref,
    topBusinessRisks: (audit.companyRisks.length > 0 ? audit.companyRisks : audit.priorities).slice(0, 3),
    proofOfValuePriorities: audit.priorities.slice(0, 5),
    implementationScope: implementationScope(audit),
    fourteenDayPlan: fourteenDayPlan(audit),
    successCriteria: successCriteria(audit),
    buyerCommitteeNotes: stakeholderNotes,
    requiredClientInputs,
    safetyNotes,
    evidence: audit.evidence,
    auditHref: "/reports/revenue-recovery-audit",
    sourceState: audit.sourceState,
    disclaimer: "Acest pachet este o propunere operațională pentru validarea ReveNew într-un pilot controlat. Nu reprezintă o garanție financiară, predicție de venit sau confirmare contabilă. Valorile sunt estimări comerciale bazate pe datele disponibile în spațiul de lucru."
  };
}

export async function getEnterprisePilotPack() {
  return buildEnterprisePilotPack(await getRevenueRecoveryAudit());
}
