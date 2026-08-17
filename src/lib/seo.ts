import { safeBrowserOrigin } from "@/lib/browser-origin";

export const siteUrl = safeBrowserOrigin(process.env.REVENEW_PUBLIC_SITE_URL || "https://revenew.ro", "https://revenew.ro");

export function canonicalUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}

export const publicRoutes = [
  "/",
  "/ghid",
  "/ghid/cum-functioneaza",
  "/ghid/oportunitati",
  "/ghid/documente-follow-up",
  "/ghid/planuri-utilizare",
  "/ghid/integrari-date",
  "/privacy",
  "/terms"
] as const;
