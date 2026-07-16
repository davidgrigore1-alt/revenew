import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const nodeRequire = createRequire(import.meta.url);

function normalizeNewlines(value) {
  return value.replace(/\r\n?/g, "\n");
}

function loadTsModule(relativePath) {
  const filename = path.resolve(relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    },
    fileName: filename
  }).outputText;
  const module = { exports: {} };

  vm.runInNewContext(
    compiled,
    {
      URL,
      exports: module.exports,
      module,
      require: (id) => nodeRequire(id)
    },
    { filename }
  );

  return module.exports;
}

const redirects = loadTsModule("src/lib/auth/redirects.ts");

test("auth intents are typed and invalid values fall back safely", () => {
  assert.equal(redirects.sanitizeAuthIntent("audit"), "audit");
  assert.equal(redirects.sanitizeAuthIntent("select_plan"), "select_plan");
  assert.equal(redirects.sanitizeAuthIntent("https://evil.example", "login"), "login");
  assert.equal(redirects.authPath("/signup", "audit"), "/signup?intent=audit");
});

test("safe redirect validation rejects external and malformed destinations", () => {
  assert.equal(redirects.safeInternalRedirect("/dashboard"), "/dashboard");
  assert.equal(redirects.safeInternalRedirect("/access?reason=missing#planuri"), "/access?reason=missing#planuri");
  assert.equal(redirects.safeInternalRedirect("https://evil.example/dashboard", "/access"), "/access");
  assert.equal(redirects.safeInternalRedirect("//evil.example/dashboard", "/access"), "/access");
  assert.equal(redirects.safeInternalRedirect("javascript:alert(1)", "/access"), "/access");
  assert.equal(redirects.safeInternalRedirect("/unknown", "/access"), "/access");
});

test("auth system routes are accepted as internal redirects", () => {
  assert.equal(redirects.safeInternalRedirect("/auth/bootstrap", "/login"), "/auth/bootstrap");
  assert.equal(redirects.safeInternalRedirect("/auth/logout", "/login"), "/auth/logout");
  assert.equal(redirects.safeInternalRedirect("/auth/recover-session?next=/login", "/login"), "/auth/recover-session?next=/login");
  assert.equal(redirects.safeInternalRedirect("/forgot-password", "/login"), "/forgot-password");
  assert.equal(redirects.safeInternalRedirect("/reset-password", "/login"), "/reset-password");
  assert.equal(redirects.safeInternalRedirect("/verify-email", "/login"), "/verify-email");
});

test("audit and plan intents continue to access flow only after account choice", () => {
  assert.equal(redirects.destinationForAuthIntent("audit", "/dashboard"), "/access#planuri");
  assert.equal(redirects.destinationForAuthIntent("select_plan", "/dashboard"), "/access#planuri");
  assert.equal(redirects.destinationForAuthIntent("create_account", null), "/onboarding");
  assert.equal(redirects.destinationForAuthIntent("login", "/dashboard"), "/dashboard");
});

test("profile initializer uses authenticated RLS path and omits legacy role by default", () => {
  const source = fs.readFileSync(path.resolve("src/lib/auth/profile.ts"), "utf8");
  const payloadMatch = source.match(/function profileInsertPayload[\s\S]*?return \{([\s\S]*?)\n  \};/);

  assert.ok(payloadMatch, "profileInsertPayload object missing");
  assert.equal(/\brole\b/.test(payloadMatch[1]), false, "profileInsertPayload must not include profiles.role by default");
  assert.equal(source.includes('select("id,user_id,full_name,email,role")'), false, "profile bootstrap must not select legacy profiles.role");
  assert.equal(source.includes("createSupabaseServerClient()"), true, "profile bootstrap must use authenticated server client");
  assert.equal(source.includes(".eq(\"user_id\", userId).maybeSingle()"), true, "zero profile rows must be normal");
  assert.equal(source.includes(".insert(payload)"), true, "normal insert must use explicit allowlisted payload");
  assert.equal(source.includes("createSupabaseAdminClient();"), true, "admin fallback is limited to legacy profile repair");
  assert.equal(source.includes("safeProfileInitializationMessage"), true, "profile errors must use safe message");
});

test("profile bootstrap handles missing profile, role drift and concurrent conflicts", () => {
  const source = fs.readFileSync(path.resolve("src/lib/auth/profile.ts"), "utf8");

  assert.equal(source.includes("profile_create_required"), true, "missing profile must be treated as create-required");
  assert.equal(source.includes("profile_unique_conflict"), true, "unique conflict category must exist");
  assert.equal(source.includes("rereadProfileAfterConflict"), true, "unique conflicts must reread the profile");
  assert.equal(source.includes("repairLegacyProfileByEmail"), true, "legacy email collisions must be repaired by the canonical authority");
  assert.equal(source.includes("shouldRetryWithLegacyRole"), false, "profile bootstrap must not cycle through guessed roles");
  assert.equal(source.includes('role: "user"'), false, "profile bootstrap must not retry guessed user role");
  assert.equal(source.includes("profile_role_constraint_failure"), true, "post-migration 23514 must remain classified as schema drift");
  assert.equal(source.includes("business_owner"), false, "profile bootstrap must not insert business_owner");
  assert.equal(source.includes("profile_bootstrap_failed"), true, "safe diagnostics must remain");
});

test("auth-state preserves precise profile bootstrap categories", () => {
  const source = fs.readFileSync(path.resolve("src/lib/auth/auth-state.ts"), "utf8");

  assert.equal(source.includes("ProfileInitializationError"), true);
  assert.equal(source.includes("error.category"), true);
  assert.equal(source.includes('"profile_bootstrap_failed"'), false, "generic profile failure reason must not hide the category");
  assert.equal(source.includes('status: "authenticated_profile_no_business"'), true, "missing business remains onboarding state");
});

test("manual profile role SQL package is present and non-destructive", () => {
  const base = path.resolve("docs/sql/profile-role-deprecation-final");
  const files = [
    "00_PROFILE_ROLE_PREFLIGHT.sql",
    "01_APPLY_PROFILE_ROLE_FIX.sql",
    "02_PROFILE_ROLE_VERIFY.sql",
    "03_PROFILE_ROLE_RLS_REGRESSION.sql",
    "README.md"
  ];

  for (const file of files) {
    assert.equal(fs.existsSync(path.join(base, file)), true, `${file} missing`);
  }

  const preflight = normalizeNewlines(
    fs.readFileSync(path.join(base, "00_PROFILE_ROLE_PREFLIGHT.sql"), "utf8")
  );
  const apply = normalizeNewlines(
    fs.readFileSync(path.join(base, "01_APPLY_PROFILE_ROLE_FIX.sql"), "utf8")
  );
  const verify = normalizeNewlines(
    fs.readFileSync(path.join(base, "02_PROFILE_ROLE_VERIFY.sql"), "utf8")
  );

  assert.equal(preflight.includes("profiles_role_column"), true);
  assert.equal(preflight.includes("auth_users_profile_triggers"), true);
  assert.equal(preflight.includes("owner_id_exists"), true);
  assert.equal(preflight.includes("only_business_owner_role_values"), true);
  assert.equal(apply.includes("alter column role drop not null"), true);
  assert.equal(apply.includes("role = 'business_owner'"), true);
  assert.equal(apply.includes("role in ('user', 'business_owner', 'platform_admin')"), false);
  assert.equal(apply.includes("role <> 'business_owner'"), true);
  assert.equal(apply.includes("```"), false, "final SQL files must be raw executable SQL");
  assert.equal(apply.includes("revoke update\non table public.profiles\nfrom authenticated"), true);
  assert.equal(apply.includes("revoke update\non table public.profiles\nfrom public"), true);
  assert.equal(apply.includes("'id',\n'user_id',\n'email',\n'role',\n'created_at'"), true);
  assert.equal(apply.includes("'updated_at'"), false, "authenticated users must not receive direct updated_at grants");
  assert.equal(apply.includes("'full_name',\n'avatar_url',\n'phone'"), true);
  assert.equal(apply.includes("role = 'platform_admin'"), false, "profiles.role constraint must not permit platform_admin");
  assert.equal(apply.includes("role = 'user'"), false, "profiles.role constraint must not permit user");
  assert.equal(apply.toLowerCase().includes("delete from"), false);
  assert.equal(apply.toLowerCase().includes("update public.profiles"), false);
  assert.equal(verify.includes("businesses_owner_id_absent"), true);
  assert.equal(verify.includes("profiles_role_check_rejects_user"), true);
  assert.equal(verify.includes("profiles_role_check_rejects_platform_admin"), true);
});

test("obsolete profile role compatibility migration is not present", () => {
  const obsolete = path.resolve("supabase/migrations/202606250001_align_profiles_role_compatibility.sql");

  assert.equal(fs.existsSync(obsolete), false, "obsolete migration would restore user/platform_admin profiles.role values");
});

test("onboarding business creation derives ownership server-side and avoids payload leaks", () => {
  const source = fs.readFileSync(path.resolve("src/lib/actions.ts"), "utf8");
  const provisioning = fs.readFileSync(path.resolve("src/lib/business/provision-business.ts"), "utf8");
  const normalization = fs.readFileSync(path.resolve("src/lib/business/onboarding-normalization.ts"), "utf8");

  assert.equal(source.includes("provisionBusinessFromOnboarding(formData)"), true);
  assert.equal(provisioning.includes("owner_profile_id: current.profile.id"), true);
  assert.equal(provisioning.includes("owner_id"), false);
  assert.equal(provisioning.includes("profile_id: profileId"), true);
  assert.equal(provisioning.includes('role: "owner"'), true);
  assert.equal(provisioning.includes("const businessId = randomUUID()"), true, "business id must exist before membership provisioning");
  assert.equal(provisioning.includes(".select(\"id\")\n    .single()"), false, "insert must not require SELECT access before owner membership exists");
  assert.equal(provisioning.includes("attemptedPayload"), false);
  assert.equal(normalization.includes("cleanText("), true);
  assert.equal(normalization.includes("validateWebsite("), true);
  assert.equal(normalization.includes("parsePositiveDecimal("), true);
  assert.equal(provisioning.includes("existingBusiness"), true);
  assert.equal(provisioning.includes("ensureOnboardingBusinessSetup"), true, "retry path must repair owner membership and setup rows");
  assert.equal(provisioning.includes("buildServices(parsed, existingBusiness.id)"), true);
  assert.equal(provisioning.includes("buildTargets(parsed, existingBusiness.id)"), true);
  assert.equal(provisioning.includes("current.profile.id"), true, "owner_profile_id must be derived from the authenticated profile");
});

test("onboarding businesses migration supplies the location columns used by provisioning", () => {
  const migration = fs.readFileSync(
    path.resolve("supabase/migrations/20260713135440_add_business_onboarding_location_fields.sql"),
    "utf8"
  );

  for (const column of ["country_code", "administrative_area_code", "company_phone_e164", "postal_code"]) {
    assert.equal(migration.includes(`add column if not exists ${column} text`), true, `missing additive ${column} column`);
  }
});

test("onboarding route is reachable with a profile and no business", () => {
  const page = fs.readFileSync(path.resolve("src/app/(setup)/onboarding/page.tsx"), "utf8");

  assert.equal(page.includes("getCurrentProfile"), true);
  assert.equal(page.includes('redirect("/login")'), true);
  assert.equal(page.includes('redirect(await getPostBusinessDestination())'), true);
  assert.equal(page.includes("requirePermission"), false, "onboarding must not require platform Admin or route permissions");
  assert.equal(page.includes("getCurrentBusinessForUser"), false, "onboarding must not require an existing current business");
  assert.equal(page.includes(".from(\"businesses\")"), true);
  assert.equal(page.includes(".from(\"business_members\")"), true);
});

test("normal users do not receive Admin from profile or account switching state", () => {
  const authz = fs.readFileSync(path.resolve("src/lib/authz/get-authorization-context.ts"), "utf8");
  const accountChoice = fs.readFileSync(path.resolve("src/components/auth/AuthenticatedAccountChoice.tsx"), "utf8");

  assert.equal(authz.includes(".from(\"platform_user_roles\")"), true);
  assert.equal(authz.includes("legacyProfileRole: null"), true);
  assert.equal(authz.includes("profiles.role"), false);
  assert.equal(authz.includes("profile.role"), false);
  assert.equal(authz.includes("platformRoles.flatMap"), true);
  assert.equal(accountChoice.includes("staleWorkspaceKeys"), true);
  assert.equal(accountChoice.includes("revenew_current_business"), true);
  assert.equal(accountChoice.includes("moneyhunter_current_business"), true);
  assert.equal(accountChoice.includes("/auth/switch-account"), true);
});

test("account-choice UI uses a real bootstrap link and server-side switch", () => {
  const source = fs.readFileSync(path.resolve("src/components/auth/AuthenticatedAccountChoice.tsx"), "utf8");

  assert.equal(source.includes("Ești deja autentificat"), true);
  assert.equal(source.includes("Continuă cu acest cont"), true);
  assert.equal(source.includes("Folosește alt cont"), true);
  assert.equal(source.includes('href="/auth/bootstrap"'), true);
  assert.equal(source.includes("continueWithCurrentAccount"), false);
  assert.equal(source.includes("router.refresh"), false);
  assert.equal(source.includes('href="#"'), false);
  assert.equal(source.includes("window.location.href = `/auth/bootstrap"), false);
  assert.equal(source.includes('type="button" variant="secondary"'), true, "account switch remains a non-submit button");
  assert.equal(source.includes("function useAnotherAccount()"), true);
  assert.equal(source.includes("/auth/switch-account"), true);
});

test("bootstrap routes authenticated accounts deterministically", () => {
  const source = fs.readFileSync(path.resolve("src/app/auth/bootstrap/route.ts"), "utf8");

  assert.equal(source.includes('new URL("/login", request.url)'), true, "anonymous users still go to login");
  assert.equal(source.includes("/auth/recover-session?next=/login?reason=session_expired"), true, "stale sessions still recover");
  assert.equal(source.includes('state.status === "authenticated_profile_no_business"'), true);
  assert.equal(source.includes('new URL("/onboarding", request.url)'), true);
  assert.equal(source.includes('safeInternalRedirect(state.safeNextPath, "/dashboard")'), true);
  assert.equal(source.includes('"/login?reason=auth_unavailable"'), false, "valid authenticated bootstrap failures must not bounce to login");
  assert.equal(source.includes("/auth/bootstrap/retry"), true, "temporary or unexpected failures use retry state");
});

test("bootstrap retry state provides retry and account-switch actions", () => {
  const source = fs.readFileSync(path.resolve("src/app/auth/bootstrap/retry/page.tsx"), "utf8");

  assert.equal(source.includes("Nu am putut deschide spațiul firmei"), true);
  assert.equal(source.includes("Sesiunea este activă"), true);
  assert.equal(source.includes('href="/auth/bootstrap"'), true);
  assert.equal(source.includes("/auth/switch-account"), true);
});

test("auth rebuild SQL package is manual, additive and checks owner_id absence", () => {
  const base = path.resolve("docs/sql/auth-rebuild-final");
  const files = [
    "00_AUTH_REBUILD_PREFLIGHT.sql",
    "01_APPLY_AUTH_REBUILD.sql",
    "02_AUTH_REBUILD_VERIFY.sql",
    "03_AUTH_REBUILD_RLS_REGRESSION.sql",
    "04_AUTH_REBUILD_ROLLBACK.sql",
    "README.md"
  ];

  for (const file of files) {
    assert.equal(fs.existsSync(path.join(base, file)), true, `${file} missing`);
  }

  const apply = fs.readFileSync(path.join(base, "01_APPLY_AUTH_REBUILD.sql"), "utf8");
  const verify = fs.readFileSync(path.join(base, "02_AUTH_REBUILD_VERIFY.sql"), "utf8");

  assert.equal(apply.includes("add column if not exists personal_phone"), true);
  assert.equal(apply.includes("profiles_user_id_key"), true);
  assert.equal(verify.includes("owner_id"), true);
  assert.equal(apply.toLowerCase().includes("drop table"), false);
  assert.equal(apply.toLowerCase().includes("delete from"), false);
});
