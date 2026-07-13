export type OnboardingDraft = {
  businessName: string;
  legalName: string;
  cui: string;
  website: string;
  industry: string;
  customIndustry: string;
  countryCode: string;
  administrativeArea: string;
  city: string;
  postalCode: string;
  companyPhoneCountry: string;
  companyPhone: string;
  mainOffering: string;
  shortDescription: string;
  averageContractValue: string;
  currency: string;
  leadSources: string[];
  customLeadSource: string;
  mainCommercialProblem: string;
  customCommercialProblem: string;
};

export const emptyOnboardingDraft: OnboardingDraft = {
  businessName: "",
  legalName: "",
  cui: "",
  website: "",
  industry: "",
  customIndustry: "",
  countryCode: "RO",
  administrativeArea: "",
  city: "",
  postalCode: "",
  companyPhoneCountry: "RO",
  companyPhone: "",
  mainOffering: "",
  shortDescription: "",
  averageContractValue: "",
  currency: "RON",
  leadSources: [],
  customLeadSource: "",
  mainCommercialProblem: "",
  customCommercialProblem: ""
};
