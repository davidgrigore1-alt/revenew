const GOOGLE_BROWSER_ORIGINS = [
  "https://accounts.google.com",
  "https://apis.google.com",
  "https://docs.google.com",
  "https://drive.google.com"
];

function validatedOrigin(value, { production = false } = {}) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    if (production && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy({
  nodeEnv = process.env.NODE_ENV,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
} = {}) {
  const production = nodeEnv === "production";
  const supabaseOrigin = validatedOrigin(supabaseUrl, { production });
  const connectSources = ["'self'", ...(supabaseOrigin ? [supabaseOrigin] : []), ...GOOGLE_BROWSER_ORIGINS];

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${production ? "" : " 'unsafe-eval'"} https://accounts.google.com https://apis.google.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connectSources.join(" ")}`,
    "frame-src https://docs.google.com https://drive.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    ...(production ? ["upgrade-insecure-requests"] : [])
  ].join("; ");
}

export function buildSecurityHeaders(options = {}) {
  const production = (options.nodeEnv ?? process.env.NODE_ENV) === "production";

  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=()" },
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(options) },
    ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : [])
  ];
}
