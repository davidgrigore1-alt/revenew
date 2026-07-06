import type { MetadataRoute } from "next";
import { canonicalUrl, siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/ghid", "/privacy", "/terms"],
        disallow: ["/dashboard", "/access", "/billing", "/login", "/signup", "/onboarding", "/settings", "/admin", "/api", "/debug"]
      }
    ],
    sitemap: canonicalUrl("/sitemap.xml"),
    host: siteUrl
  };
}
