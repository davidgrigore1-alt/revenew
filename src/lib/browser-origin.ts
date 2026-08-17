const DEFAULT_BROWSER_ORIGIN = "http://localhost";

function isHttpProtocol(protocol: string) {
  return protocol === "http:" || protocol === "https:";
}

export function isBindOnlyBrowserHost(hostname: string) {
  const normalized = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  return normalized === "0.0.0.0" || normalized === "::";
}

function parsedSafeOrigin(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value);
    if (!isHttpProtocol(parsed.protocol) || isBindOnlyBrowserHost(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function safeBrowserOrigin(value: unknown, fallbackOrigin?: string) {
  const fallback = parsedSafeOrigin(fallbackOrigin ?? DEFAULT_BROWSER_ORIGIN) ?? new URL(DEFAULT_BROWSER_ORIGIN);
  if (typeof value !== "string" || !value.trim()) return fallback.origin;

  try {
    const parsed = new URL(value);
    if (!isHttpProtocol(parsed.protocol)) return fallback.origin;
    if (!isBindOnlyBrowserHost(parsed.hostname)) return parsed.origin;
    if (fallbackOrigin) return fallback.origin;

    parsed.hostname = "localhost";
    return parsed.origin;
  } catch {
    return fallback.origin;
  }
}
