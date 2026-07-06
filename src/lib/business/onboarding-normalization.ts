import {
  commercialProblemOptions,
  currencyOptions,
  industryOptions,
  isCountryCode,
  leadSourceOptions,
  normalizeText,
  parsePositiveDecimal,
  validateAdministrativeArea,
  validateInternationalPhone,
  validateLocality,
  validateRomanianCui,
  validateSafeText,
  validateWebsite
} from "@/lib/forms/validation";

function splitList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanText(value: FormDataEntryValue | null, maxLength = 240) {
  return normalizeText(value, maxLength);
}

export type ParsedOnboardingInput = {
  businessName: string;
  legalName: string;
  cui: string | null;
  website: string;
  industry: string;
  countryCode: string;
  administrativeAreaCode: string;
  administrativeAreaLabel: string;
  city: string;
  companyPhoneE164: string;
  postalCode: string;
  mainOffering: string;
  shortDescription: string;
  averageContractValue: number;
  currency: string;
  leadSources: string;
  mainCommercialProblem: string;
};

export type ParsedOnboardingResult =
  | { ok: true; value: ParsedOnboardingInput }
  | { ok: false; error: string };

export function parseOnboardingForm(formData: FormData): ParsedOnboardingResult {
  const countryCode = cleanText(formData.get("countryCode"), 2).toUpperCase();
  const companyPhoneCountry = cleanText(formData.get("companyPhoneCountry") ?? countryCode, 2).toUpperCase();
  const selectedIndustry = cleanText(formData.get("industry"), 120);
  const selectedProblem = cleanText(formData.get("mainCommercialProblem"), 160);
  const leadSourceValues = splitList(formData.get("leadSources"));
  const customIndustry = cleanText(formData.get("customIndustry"), 120);
  const customLeadSource = cleanText(formData.get("customLeadSource"), 160);
  const customCommercialProblem = cleanText(formData.get("customCommercialProblem"), 200);

  const businessNameResult = validateSafeText(formData.get("businessName"), { label: "Numele firmei", min: 2, max: 160, required: true, rejectUrl: true });
  const legalNameResult = validateSafeText(formData.get("legalName"), { label: "Denumirea juridică", max: 160, required: false });
  const industryAllowed = industryOptions.includes(selectedIndustry as (typeof industryOptions)[number]);
  const industry = selectedIndustry === "Alt domeniu" ? customIndustry : selectedIndustry;
  const countryResult = isCountryCode(countryCode) ? { ok: true as const, value: countryCode } : { ok: false as const, error: "Selectează o țară validă." };
  const areaResult = validateAdministrativeArea(formData.get("administrativeArea"), countryCode);
  const cityResult = validateLocality(formData.get("city"), "Orașul/localitatea");
  const phoneResult = validateInternationalPhone(formData.get("companyPhone"), companyPhoneCountry, "Telefonul firmei");
  const websiteResult = validateWebsite(formData.get("website"));
  const cuiResult = validateRomanianCui(formData.get("cui"), countryCode);
  const mainOfferingResult = validateSafeText(formData.get("mainOffering"), { label: "Serviciul sau produsul principal", min: 2, max: 160, required: true, rejectUrl: true });
  const descriptionResult = validateSafeText(formData.get("shortDescription"), { label: "Descrierea scurtă", min: 20, max: 500, required: true });
  const averageValueResult = parsePositiveDecimal(formData.get("averageContractValue"));
  const currency = cleanText(formData.get("currency") ?? "RON", 8).toUpperCase();
  const problemAllowed = commercialProblemOptions.includes(selectedProblem as (typeof commercialProblemOptions)[number]);
  const primaryProblem = selectedProblem === "Altă problemă" ? customCommercialProblem : selectedProblem;
  const invalidLeadSource = leadSourceValues.find((value) => !leadSourceOptions.includes(value as (typeof leadSourceOptions)[number]));

  const firstValidationError =
    (!businessNameResult.ok && businessNameResult.error) ||
    (!legalNameResult.ok && legalNameResult.error) ||
    (!countryResult.ok && countryResult.error) ||
    (!industryAllowed && "Alege un domeniu de activitate valid.") ||
    (selectedIndustry === "Alt domeniu" && !customIndustry && "Descrie domeniul de activitate.") ||
    (!cityResult.ok && cityResult.error) ||
    (!areaResult.ok && areaResult.error) ||
    (!phoneResult.ok && phoneResult.error) ||
    (!websiteResult.ok && websiteResult.error) ||
    (!cuiResult.ok && cuiResult.error) ||
    (!mainOfferingResult.ok && mainOfferingResult.error) ||
    (!descriptionResult.ok && descriptionResult.error) ||
    (!averageValueResult.ok && averageValueResult.error) ||
    (!currencyOptions.includes(currency as (typeof currencyOptions)[number]) && "Alege o monedă validă.") ||
    (!leadSourceValues.length && "Alege cel puțin o sursă de cereri.") ||
    (Boolean(invalidLeadSource) && "Alege doar surse de cereri acceptate.") ||
    (leadSourceValues.includes("Alte surse") && !customLeadSource && "Descrie sursa suplimentară.") ||
    (!problemAllowed && "Alege problema comercială principală.") ||
    (selectedProblem === "Altă problemă" && !customCommercialProblem && "Descrie problema comercială.");

  if (
    firstValidationError ||
    !businessNameResult.ok ||
    !legalNameResult.ok ||
    !countryResult.ok ||
    !cityResult.ok ||
    !areaResult.ok ||
    !phoneResult.ok ||
    !websiteResult.ok ||
    !cuiResult.ok ||
    !mainOfferingResult.ok ||
    !descriptionResult.ok ||
    !averageValueResult.ok
  ) {
    return { ok: false, error: firstValidationError || "Completează câmpurile obligatorii înainte de a crea spațiul firmei." };
  }

  return {
    ok: true,
    value: {
      businessName: businessNameResult.value,
      legalName: legalNameResult.value || businessNameResult.value,
      cui: cuiResult.value || null,
      website: websiteResult.value,
      industry,
      countryCode,
      administrativeAreaCode: areaResult.value,
      administrativeAreaLabel: areaResult.label || areaResult.value,
      city: cityResult.value,
      companyPhoneE164: phoneResult.value,
      postalCode: cleanText(formData.get("postalCode"), 32),
      mainOffering: mainOfferingResult.value,
      shortDescription: descriptionResult.value,
      averageContractValue: averageValueResult.value,
      currency,
      leadSources: [...leadSourceValues.filter((value) => value !== "Alte surse"), customLeadSource].filter(Boolean).join(", "),
      mainCommercialProblem: primaryProblem
    }
  };
}

export { splitList };
