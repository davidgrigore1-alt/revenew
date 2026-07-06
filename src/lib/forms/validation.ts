import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode
} from "libphonenumber-js/min";
import { canonicalCountryCodes, canonicalCountryOptions, type CanonicalCountryCode } from "./country-options";
import { getRomanianCounty, romanianCounties } from "./ro-counties";

export type FieldErrors<T extends string> = Partial<Record<T, string>>;
export type SelectOption = Readonly<{ value: string; label: string }>;

const NAME_PATTERN = new RegExp("^[\\p{L}\\p{M}][\\p{L}\\p{M}'’ -]{1,158}$", "u");
const TEXT_PATTERN = new RegExp("^[^<>]*$", "u");
const CONTROL_PATTERN = /[\u0000-\u001F\u007F]/;
const URL_PATTERN = /https?:\/\/|www\.|\.com\b|\.ro\b|\.net\b|\.org\b/i;
const EMAIL_LIKE_PATTERN = /\S+@\S+\.\S+/;
const HTML_LIKE_PATTERN = /<[^>]+>|<\/?\s*(script|iframe|object|embed|style)\b/i;
const LOCALITY_PATTERN = new RegExp("^(?=.{2,120}$)[\\p{L}\\p{M}\\p{N}][\\p{L}\\p{M}\\p{N}'’ .-]*[\\p{L}\\p{M}\\p{N}]$", "u");
const PUNCTUATION_ONLY_PATTERN = new RegExp("^[\\p{P}\\p{S}\\s]+$", "u");
const REPEATED_SYMBOL_PATTERN = new RegExp("([^\\p{L}\\p{M}\\p{N}\\s])\\1{2,}", "u");

export const countryOptions = canonicalCountryOptions;
export const countryCodes = canonicalCountryCodes;

export const industryOptions = [
  "Auto și mobilitate",
  "Construcții și servicii tehnice",
  "Logistică și servicii operaționale",
  "Servicii profesionale și agenții",
  "Servicii B2B",
  "Alt domeniu"
] as const;

export const currencyOptions = ["RON", "EUR", "USD", "GBP", "CHF"] as const;

export const leadSourceOptions = ["Email", "Formular website", "Telefon", "Apeluri pierdute", "WhatsApp", "Instagram", "CRM", "Import CSV", "Recomandări", "Alte surse"] as const;

export const commercialProblemOptions = ["Cereri uitate", "Răspuns întârziat", "Follow-up lipsă", "Oferte neurmărite", "Lead-uri vechi", "Lipsă de vizibilitate", "Altă problemă"] as const;

export function normalizeText(value: unknown, maxLength = 240) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function countryName(code: CanonicalCountryCode) {
  return canonicalCountryOptions.find((country) => country.code === code)?.label ?? code;
}

export function isCountryCode(value: string): value is CountryCode {
  return countryCodes.includes(value as CanonicalCountryCode);
}

export function administrativeAreaLabel(countryCode: string) {
  if (countryCode === "RO") return "Județ";
  if (countryCode === "US") return "Stat";
  if (countryCode === "CA") return "Provincie";
  return "Regiune / provincie / zonă administrativă";
}

export function isAdministrativeAreaRequired(countryCode: string) {
  return ["RO", "US", "CA", "AU", "BR", "DE", "ES", "IT", "MX"].includes(countryCode);
}

export function hasControlledAdministrativeAreas(countryCode: string) {
  return countryCode === "RO";
}

export function getAdministrativeAreaOptions(countryCode: string): readonly SelectOption[] {
  if (countryCode === "RO") {
    return romanianCounties.map((county) => ({ value: county.code, label: county.label }));
  }
  return [];
}

export function administrativeAreaDisplayName(countryCode: string, value: string) {
  if (countryCode === "RO") return getRomanianCounty(value)?.label ?? value;
  return value;
}

export function validateAdministrativeArea(value: unknown, countryCode: string) {
  const normalized = normalizeText(value, 120);

  if (countryCode === "RO") {
    const county = getRomanianCounty(normalized);
    if (!county) return { ok: false as const, error: "Selectează un județ valid." };
    return { ok: true as const, value: county.code, label: county.label, controlled: true as const };
  }

  const structural = validateSafeText(normalized, {
    label: administrativeAreaLabel(countryCode),
    min: 2,
    max: 120,
    required: isAdministrativeAreaRequired(countryCode),
    rejectUrl: true
  });

  if (!structural.ok) return structural;
  return { ok: true as const, value: structural.value, label: structural.value, controlled: false as const };
}

export function validatePersonName(value: unknown) {
  const normalized = normalizeText(value, 160);
  if (!normalized) return { ok: false as const, error: "Introdu un nume complet." };
  if (CONTROL_PATTERN.test(normalized) || URL_PATTERN.test(normalized) || EMAIL_LIKE_PATTERN.test(normalized)) {
    return { ok: false as const, error: "Introdu un nume real, fără linkuri sau adresă de email." };
  }
  if (!NAME_PATTERN.test(normalized)) {
    return { ok: false as const, error: "Numele poate conține litere, spații, apostrof și cratimă." };
  }
  return { ok: true as const, value: normalized };
}

export function validateSafeText(value: unknown, options: { label: string; min?: number; max?: number; required?: boolean; rejectUrl?: boolean }) {
  const normalized = normalizeText(value, options.max ?? 240);
  if (!normalized) {
    return options.required ? { ok: false as const, error: `${options.label} este obligatoriu.` } : { ok: true as const, value: "" };
  }
  if (CONTROL_PATTERN.test(normalized) || !TEXT_PATTERN.test(normalized) || HTML_LIKE_PATTERN.test(normalized) || (options.rejectUrl && (URL_PATTERN.test(normalized) || EMAIL_LIKE_PATTERN.test(normalized)))) {
    return { ok: false as const, error: `${options.label} conține caractere neacceptate.` };
  }
  if (options.min && normalized.length < options.min) {
    return { ok: false as const, error: `${options.label} este prea scurt.` };
  }
  return { ok: true as const, value: normalized };
}

export function validateLocality(value: unknown, label = "Orașul/localitatea") {
  const normalized = normalizeText(value, 120);
  if (!normalized) return { ok: false as const, error: `${label} este obligatoriu.` };
  if (
    CONTROL_PATTERN.test(normalized) ||
    URL_PATTERN.test(normalized) ||
    EMAIL_LIKE_PATTERN.test(normalized) ||
    HTML_LIKE_PATTERN.test(normalized) ||
    PUNCTUATION_ONLY_PATTERN.test(normalized) ||
    REPEATED_SYMBOL_PATTERN.test(normalized) ||
    !LOCALITY_PATTERN.test(normalized)
  ) {
    return { ok: false as const, error: "Introdu un oraș sau o localitate validă." };
  }
  return { ok: true as const, value: normalized };
}

export function validateInternationalPhone(value: unknown, countryCode: string, label = "Numărul") {
  const raw = normalizeText(value, 40);
  if (!countryCode || !isCountryCode(countryCode)) {
    return { ok: false as const, error: "Selectează țara numărului de telefon." };
  }
  if (!raw) {
    return { ok: false as const, error: `${label} este obligatoriu.` };
  }
  const parsed = parsePhoneNumberFromString(raw, countryCode);
  if (!parsed || !isValidPhoneNumber(parsed.number, countryCode)) {
    return { ok: false as const, error: "Numărul nu este valid pentru țara selectată." };
  }
  return {
    ok: true as const,
    value: parsed.number,
    display: parsed.formatInternational()
  };
}

export function validateEmail(value: unknown) {
  const email = normalizeText(value, 254).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, error: "Introdu o adresă de email validă." };
  }
  return { ok: true as const, value: email };
}

export function validateWebsite(value: unknown) {
  const raw = normalizeText(value, 200);
  if (!raw) return { ok: true as const, value: "" };
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { ok: false as const, error: "Website-ul trebuie să folosească http sau https." };
    }
    return { ok: true as const, value: url.toString() };
  } catch {
    return { ok: false as const, error: "Introdu un website valid sau lasă câmpul gol." };
  }
}

export function normalizeRomanianCuiInput(value: unknown) {
  return normalizeText(value, 32)
    .toUpperCase()
    .replace(/^RO/, "")
    .replace(/[\s._/-]+/g, "");
}

export function validateRomanianCui(value: unknown, countryCode: string) {
  if (countryCode !== "RO") {
    return { ok: true as const, value: "" };
  }

  const numeric = normalizeRomanianCuiInput(value);
  if (!numeric) return { ok: true as const, value: "" };
  if (!/^\d{2,10}$/.test(numeric)) return { ok: false as const, error: "CUI-ul trebuie să conțină 2-10 cifre, cu prefix RO opțional." };

  const key = "753217532";
  const digits = numeric.padStart(10, "0");
  const body = digits.slice(0, -1);
  const check = Number(digits.at(-1));
  let sum = 0;
  for (let index = 0; index < body.length; index += 1) {
    sum += Number(body[index]) * Number(key[index]);
  }
  const computed = (sum * 10) % 11;
  return (computed === 10 ? 0 : computed) === check
    ? { ok: true as const, value: String(Number(numeric)) }
    : { ok: false as const, error: "CUI-ul nu trece validarea de structură." };
}

export function parsePositiveDecimal(value: unknown) {
  const normalized = String(value ?? "").replace(/[^\d.,]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1000000000) {
    return { ok: false as const, error: "Introdu o valoare medie pozitivă și realistă." };
  }
  return { ok: true as const, value: Math.round(parsed * 100) / 100 };
}
