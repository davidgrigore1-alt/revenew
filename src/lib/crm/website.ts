export type CompanyWebsiteResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

export const COMPANY_WEBSITE_ERROR = "Introdu un domeniu valid sau lasă câmpul gol.";

const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const EXPLICIT_PROTOCOL_PATTERN = /^[a-z][a-z\d+.-]*:/i;

export function normalizeOptionalCompanyWebsite(input: unknown): CompanyWebsiteResult {
  const raw = String(input ?? "").trim();
  if (!raw) return { ok: true, value: null };
  if (raw.startsWith("//") || /\s/.test(raw)) return { ok: false, error: COMPANY_WEBSITE_ERROR };

  const hasProtocol = EXPLICIT_PROTOCOL_PATTERN.test(raw);
  if (hasProtocol && !/^https?:\/\//i.test(raw)) {
    return { ok: false, error: COMPANY_WEBSITE_ERROR };
  }

  try {
    const parsed = new URL(hasProtocol ? raw : `https://${raw}`);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
      return { ok: false, error: COMPANY_WEBSITE_ERROR };
    }
    if (!DOMAIN_PATTERN.test(parsed.hostname)) return { ok: false, error: COMPANY_WEBSITE_ERROR };

    const value = parsed.pathname === "/" && !parsed.search && !parsed.hash
      ? parsed.origin
      : parsed.toString();
    return { ok: true, value };
  } catch {
    return { ok: false, error: COMPANY_WEBSITE_ERROR };
  }
}

export function safeCompanyWebsiteHref(input: unknown) {
  const result = normalizeOptionalCompanyWebsite(input);
  return result.ok ? result.value : null;
}
