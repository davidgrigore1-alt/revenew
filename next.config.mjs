import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSecurityHeaders } from "./src/lib/security/http-security.mjs";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: projectRoot,
  outputFileTracingIncludes: {
    "/api/documents/local": ["./scripts/documents/parse-workbook.cjs", "./node_modules/xlsx/**/*"],
    "/documents/local/**": ["./scripts/documents/parse-workbook.cjs", "./node_modules/xlsx/**/*"]
  },
  poweredByHeader: false,

  async headers() {
    const commonSecurityHeaders = buildSecurityHeaders();
    const privateNoStore = [{ key: "Cache-Control", value: "private, no-store" }];

    return [
      {
        source: "/:path*",
        headers: commonSecurityHeaders
      },
      {
        source: "/api/:path*",
        headers: privateNoStore
      },
      {
        source: "/auth/:path*",
        headers: privateNoStore
      },
      {
        source: "/debug/:path*",
        headers: privateNoStore
      }
    ];
  }
};

export default nextConfig;
