export const previewPlans = [
  {
    id: "audit",
    title: "Start",
    price: "59 EUR",
    billing: "utilizator / lună",
    description: "Pentru echipe care vor să structureze oportunitățile, responsabilitatea și următoarea acțiune.",
    cta: "Continuă cu Start"
  },
  {
    id: "managed",
    title: "Growth",
    price: "129 EUR",
    billing: "utilizator / lună",
    description: "Pentru echipe care au nevoie de prioritizare recurentă, control și vizibilitate managerială.",
    cta: "Continuă cu Growth"
  }
] as const;

export type PreviewPlanId = (typeof previewPlans)[number]["id"];

export const paidPlanLabels = {
  demo: "Demo",
  starter: "Start",
  growth: "Growth",
  agency: "Scale",
  enterprise: "Enterprise"
} as const;

export type PaidPlanId = keyof typeof paidPlanLabels;

export function getPaidPlanLabel(value: string | null | undefined) {
  return typeof value === "string" && value in paidPlanLabels
    ? paidPlanLabels[value as PaidPlanId]
    : null;
}

const previewPlanIds = new Set<string>(previewPlans.map((plan) => plan.id));

export function isPreviewPlanId(value: unknown): value is PreviewPlanId {
  return typeof value === "string" && previewPlanIds.has(value);
}

export function getPreviewPlanById(value: string | null | undefined) {
  return previewPlans.find((plan) => plan.id === value) ?? null;
}

export const commercialPricingPlans = [
  {
    label: "PENTRU ECHIPE MICI",
    title: "Start",
    monthlyPrice: 59,
    annualPrice: 47,
    description: "Control operațional pentru primele fluxuri de oportunități și follow-up.",
    items: ["Control Center și coadă de priorități", "oportunități, responsabil și următoarea acțiune", "import CSV asistat", "Ask ReveNew cu surse autorizate", "rapoarte operaționale de bază"],
    cta: "Solicită activarea"
  },
  {
    label: "RECOMANDAT",
    title: "Growth",
    monthlyPrice: 129,
    annualPrice: 103,
    description: "Pentru echipe care coordonează mai multe oportunități și au nevoie de control managerial.",
    items: ["tot ce include Start", "prioritizare și risc comercial extinse", "aprobări și auditabilitate", "rapoarte pentru management", "implementare ghidată"],
    cta: "Solicită o discuție"
  },
  {
    label: "PENTRU OPERAȚIUNI COMPLEXE",
    title: "Scale",
    monthlyPrice: 249,
    annualPrice: 199,
    description: "Pentru volume mai mari, reguli de lucru mature și cerințe de guvernanță.",
    items: ["tot ce include Growth", "configurare avansată a fluxurilor", "control de acces și politici extinse", "suport prioritar de implementare", "evaluare pentru integrări aprobate"],
    cta: "Discută opțiunile"
  },
  {
    label: "ENTERPRISE",
    title: "Enterprise",
    monthlyPrice: null,
    annualPrice: null,
    description: "Pentru cerințe de securitate, integrare, volum și guvernanță stabilite împreună.",
    items: ["scoping tehnic și comercial", "plan de integrare și migrare", "cerințe contractuale și de securitate", "roluri și controale adaptate", "suport de implementare dedicat"],
    cta: "Solicită evaluarea"
  }
] as const;
