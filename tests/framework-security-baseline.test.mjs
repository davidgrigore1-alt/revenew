import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";
import { buildContentSecurityPolicy, buildSecurityHeaders } from "../src/lib/security/http-security.mjs";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");
const nodeRequire = createRequire(import.meta.url);

function loadMiddleware({ configured = true, refreshed = [] } = {}) {
  const filename = path.resolve("src/lib/supabase/middleware.ts");
  const compiled = ts.transpileModule(read("src/lib/supabase/middleware.ts"), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  let refreshCalls = 0;

  class CookieJar {
    constructor(initial = []) {
      this.values = new Map(initial.map((cookie) => [cookie.name, { ...cookie }]));
    }

    getAll() {
      return [...this.values.values()];
    }

    set(nameOrCookie, value, options) {
      const cookie = typeof nameOrCookie === "string"
        ? { name: nameOrCookie, value, ...options }
        : { ...nameOrCookie };
      this.values.set(cookie.name, cookie);
    }
  }

  class FakeResponse {
    constructor(request) {
      this.request = request;
      this.cookies = new CookieJar();
      this.headers = new Headers();
    }

    static next({ request }) {
      return new FakeResponse(request);
    }
  }

  vm.runInNewContext(compiled, {
    Headers,
    exports: module.exports,
    module,
    process,
    require: (specifier) => {
      if (specifier === "server-only") return {};
      if (specifier === "next/server") return { NextResponse: FakeResponse };
      if (specifier === "@/lib/supabase/status") {
        return {
          isSupabaseConfigured: configured,
          supabaseAnonKey: configured ? "public-anon-key" : undefined,
          supabaseUrl: configured ? "https://project.example" : undefined
        };
      }
      if (specifier === "@/lib/auth/session-errors") {
        return {
          hasPersistedSupabaseAuthCookie: (cookies) => cookies.some((cookie) =>
            (/^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name) || cookie.name === "supabase-auth-token") && Boolean(cookie.value)
          )
        };
      }
      if (specifier === "@supabase/ssr") {
        return {
          createServerClient: (_url, _key, options) => ({
            auth: {
              async getClaims() {
                refreshCalls += 1;
                await options.cookies.setAll(refreshed);
                return { data: { claims: null }, error: null };
              }
            }
          })
        };
      }
      return nodeRequire(specifier);
    }
  }, { filename });

  return {
    CookieJar,
    refreshSupabaseSession: module.exports.refreshSupabaseSession,
    refreshCalls: () => refreshCalls
  };
}

test("request middleware refreshes Supabase sessions without becoming an authorization layer", () => {
  const entry = read("middleware.ts");
  const helper = read("src/lib/supabase/middleware.ts");

  assert.match(entry, /refreshSupabaseSession\(request\)/);
  assert.match(entry, /_next\/static/);
  assert.match(entry, /_next\/image/);
  assert.match(helper, /createServerClient\(supabaseUrl, supabaseAnonKey/);
  assert.match(helper, /request\.cookies\.getAll\(\)/);
  assert.match(helper, /request\.cookies\.set\(name, value\)/);
  assert.match(helper, /nextResponse\.cookies\.set\(name, value, options\)/);
  assert.match(helper, /await supabase\.auth\.getClaims\(\)/);
  assert.match(helper, /"Cache-Control", "private, no-store"/);
  assert.doesNotMatch(helper, /SUPABASE_SERVICE_ROLE_KEY|getAuthorizationContext|requirePermission|redirect\(/);
});

test("refreshed cookies propagate downstream and outward with private no-store caching", async () => {
  const refreshed = [{
    name: "sb-project-auth-token",
    value: "refreshed-token",
    options: { path: "/", sameSite: "lax", secure: false }
  }];
  const harness = loadMiddleware({ refreshed });
  const request = { cookies: new harness.CookieJar([{ name: "existing", value: "cookie" }]) };
  const response = await harness.refreshSupabaseSession(request);

  assert.equal(harness.refreshCalls(), 1);
  assert.equal(request.cookies.getAll().find((cookie) => cookie.name === refreshed[0].name)?.value, "refreshed-token");
  assert.deepEqual(response.cookies.getAll().find((cookie) => cookie.name === refreshed[0].name), {
    name: refreshed[0].name,
    value: refreshed[0].value,
    ...refreshed[0].options
  });
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});

test("unconfigured and anonymous requests remain pass-through and publicly cache-neutral", async () => {
  const unconfigured = loadMiddleware({ configured: false });
  const unconfiguredResponse = await unconfigured.refreshSupabaseSession({ cookies: new unconfigured.CookieJar() });
  assert.equal(unconfigured.refreshCalls(), 0);
  assert.equal(unconfiguredResponse.headers.get("Cache-Control"), null);

  const staleUnconfiguredResponse = await unconfigured.refreshSupabaseSession({
    cookies: new unconfigured.CookieJar([{ name: "sb-project-auth-token", value: "persisted-session" }])
  });
  assert.equal(staleUnconfiguredResponse.headers.get("Cache-Control"), "private, no-store");

  const configured = loadMiddleware();
  const configuredResponse = await configured.refreshSupabaseSession({ cookies: new configured.CookieJar() });
  assert.equal(configured.refreshCalls(), 1);
  assert.equal(configuredResponse.headers.get("Cache-Control"), null);
});

test("an established Supabase session is private no-store even when no cookie refresh occurs", async () => {
  const harness = loadMiddleware();
  const response = await harness.refreshSupabaseSession({
    cookies: new harness.CookieJar([{ name: "sb-project-auth-token", value: "persisted-session" }])
  });

  assert.equal(harness.refreshCalls(), 1);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
});

test("Supabase auth cookie options are explicit and preserve the browser contract", () => {
  for (const relativePath of [
    "src/lib/supabase/middleware.ts",
    "src/lib/supabase/server.ts",
    "src/lib/supabase/client.ts"
  ]) {
    const source = read(relativePath);
    assert.match(source, /cookieOptions:\s*\{[\s\S]*?path:\s*"\/"[\s\S]*?sameSite:\s*"lax"[\s\S]*?secure:\s*process\.env\.NODE_ENV === "production"[\s\S]*?\}/);
    assert.doesNotMatch(source, /httpOnly/);
  }

  assert.match(read("src/lib/supabase/server.ts"), /^import "server-only";/);
  assert.doesNotMatch(read("src/lib/supabase/client.ts"), /SERVICE_ROLE|SUPABASE_SERVICE_ROLE_KEY/);
});

test("Google internal redirects use the canonical safe request-origin boundary", () => {
  const source = read("src/app/api/integrations/google/connect/route.ts");

  assert.match(source, /browserSafeRedirectUrl\(request\.url, "\/apps\?google=not-configured"/);
  assert.match(source, /browserSafeRedirectUrl\(request\.url, "\/apps\?google=connection-required"/);
  assert.doesNotMatch(source, /http:\/\/localhost:3000|REVENEW_PUBLIC_SITE_URL/);
});

test("HTTP security policy is centralized, strict in production, and keeps development compatibility explicit", () => {
  const source = read("next.config.mjs");
  const productionCsp = buildContentSecurityPolicy({ nodeEnv: "production", supabaseUrl: "https://project.supabase.co/rest/v1" });
  const developmentCsp = buildContentSecurityPolicy({ nodeEnv: "development", supabaseUrl: "http://127.0.0.1:54321" });
  const productionHeaders = buildSecurityHeaders({ nodeEnv: "production", supabaseUrl: "https://project.supabase.co" });
  const headerValue = (key) => productionHeaders.find((header) => header.key === key)?.value;

  assert.match(source, /buildSecurityHeaders/);
  assert.match(source, /poweredByHeader:\s*false/);
  assert.match(source, /privateNoStore = \[\{ key: "Cache-Control", value: "private, no-store" \}\]/);
  assert.match(source, /source: "\/api\/:path\*"[\s\S]*?headers: privateNoStore/);
  assert.match(source, /source: "\/auth\/:path\*"[\s\S]*?headers: privateNoStore/);
  assert.equal(headerValue("X-Content-Type-Options"), "nosniff");
  assert.equal(headerValue("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(headerValue("X-Frame-Options"), "DENY");
  assert.equal(headerValue("Permissions-Policy"), "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=()");
  assert.equal(headerValue("Strict-Transport-Security"), "max-age=31536000");
  assert.match(productionCsp, /^default-src 'self'; script-src 'self' 'unsafe-inline' https:\/\/accounts\.google\.com https:\/\/apis\.google\.com;/);
  assert.match(productionCsp, /connect-src 'self' https:\/\/project\.supabase\.co https:\/\/accounts\.google\.com https:\/\/apis\.google\.com https:\/\/docs\.google\.com https:\/\/drive\.google\.com/);
  assert.match(productionCsp, /frame-src https:\/\/docs\.google\.com https:\/\/drive\.google\.com/);
  assert.match(productionCsp, /object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self'; upgrade-insecure-requests$/);
  assert.doesNotMatch(productionCsp, /unsafe-eval|\*|includeSubDomains|preload/);
  assert.match(developmentCsp, /script-src 'self' 'unsafe-inline' 'unsafe-eval'/);
  assert.doesNotMatch(developmentCsp, /upgrade-insecure-requests/);
  assert.doesNotMatch(buildContentSecurityPolicy({ nodeEnv: "production", supabaseUrl: "http://remote.example" }), /remote\.example/);
});

test("environment example classifies names without values or public secrets", () => {
  const source = read(".env.example");
  const variables = source
    .split(/\r?\n/)
    .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line));

  for (const heading of ["PUBLIC SAFE", "SERVER ONLY", "LOCAL DEVELOPMENT ONLY", "PRODUCTION REQUIRED", "OPTIONAL INTEGRATION"]) {
    assert.match(source, new RegExp(heading));
  }
  assert.ok(variables.length > 0);
  assert.ok(variables.every((line) => line.endsWith("=") || line.endsWith('=""')), "the example must document names without configured values");
  assert.doesNotMatch(source, /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|SERVICE_ROLE|PRIVATE|PASSWORD)/);

  const publicRuntimeSource = [
    "src/lib/supabase/status.ts",
    "src/lib/supabase/client.ts",
    "src/components/apps/drive-picker.ts"
  ].map(read).join("\n");
  assert.doesNotMatch(publicRuntimeSource, /SUPABASE_SERVICE_ROLE_KEY|GOOGLE_CLIENT_SECRET|GOOGLE_TOKEN_ENCRYPTION_KEY|OPENAI_API_KEY|RESEND_API_KEY/);
  assert.match(read("src/lib/supabase/status.ts"), /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(read("src/lib/supabase/status.ts"), /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
});

test("private route families and internal surfaces retain cache, production, and permission boundaries", () => {
  const config = read("next.config.mjs");
  const robots = read("src/app/robots.ts");
  const protectedLayout = read("src/app/(protected)/layout.tsx");
  const tools = read("src/app/(protected)/tools/page.tsx");
  const adminLayout = read("src/app/(protected)/admin/layout.tsx");

  for (const routeFamily of ["/api/:path*", "/auth/:path*", "/debug/:path*"]) assert.match(config, new RegExp(`source: "${routeFamily.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  for (const route of ["/admin", "/api", "/debug"]) assert.match(robots, new RegExp(`"${route}"`));
  for (const debugRoute of ["src/app/debug/supabase/page.tsx", "src/app/debug/repair-profile/page.tsx"]) {
    const source = read(debugRoute);
    assert.match(source, /process\.env\.NODE_ENV !== "development"/);
    assert.match(source, /notFound\(\)/);
  }
  assert.match(protectedLayout, /requireActivePaidAccess\(\)/);
  assert.match(protectedLayout, /hasPermission\(authorization, "workspace\.read"\)/);
  assert.match(tools, /hasPermission\(authorization, module\.permission\)/);
  assert.match(adminLayout, /hasPermission\(authorization, "platform\.admin\.access"\)/);
});

test("dependency patches and equivalent Next flat lint configuration are pinned", () => {
  const pkg = JSON.parse(read("package.json"));

  assert.equal(pkg.dependencies.next, "15.5.24");
  assert.equal(pkg.dependencies.react, "19.2.8");
  assert.equal(pkg.dependencies["react-dom"], "19.2.8");
  assert.equal(pkg.dependencies["sanitize-html"], "2.17.7");
  assert.equal(pkg.devDependencies.postcss, "8.5.26");
  assert.equal(pkg.devDependencies.eslint, "9.39.5");
  assert.equal(pkg.devDependencies["@eslint/eslintrc"], "3.3.6");
  assert.match(read("eslint.config.mjs"), /compat\.extends\("next\/core-web-vitals"\)/);
});
