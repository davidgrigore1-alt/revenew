import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const nodeRequire = createRequire(import.meta.url);

function loadTsModule(relativePath) {
  const filename = path.resolve(relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    },
    fileName: filename
  }).outputText;
  const module = { exports: {} };

  vm.runInNewContext(compiled, {
    URL,
    encodeURIComponent,
    exports: module.exports,
    module,
    require: (id) => nodeRequire(id)
  }, { filename });

  return module.exports;
}

const { classifyAuthError, staleSessionCleanupPath } = loadTsModule("src/lib/auth/session-errors.ts");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("deleted auth user JWT is classified as stale session", () => {
  assert.deepEqual(
    plain(classifyAuthError({ message: "User from sub claim in JWT does not exist" })),
    { status: "stale_session", reason: "deleted_user" }
  );
});

test("refresh errors are stale and missing-session without cookies is anonymous", () => {
  assert.deepEqual(plain(classifyAuthError({ message: "refresh_token_not_found" })), { status: "stale_session", reason: "invalid_refresh_token" });
  assert.deepEqual(plain(classifyAuthError({ message: "session_not_found" })), { status: "anonymous" });
  assert.deepEqual(plain(classifyAuthError({ message: "session_not_found" }, { hasPersistedSession: true })), { status: "stale_session", reason: "session_not_found" });
});

test("rate-limit and network errors are not treated as stale sessions", () => {
  assert.deepEqual(plain(classifyAuthError({ message: "Request rate limit reached" })), { status: "temporary_failure", reason: "rate_limited" });
  assert.deepEqual(plain(classifyAuthError({ message: "fetch failed ENOTFOUND" })), { status: "temporary_failure", reason: "network" });
});

test("stale cleanup path uses canonical recovery route", () => {
  assert.equal(staleSessionCleanupPath(), "/auth/recover-session?next=%2Flogin%3Freason%3Dsession_expired");
  assert.equal(staleSessionCleanupPath("/signup?intent=audit"), "/auth/recover-session?next=%2Fsignup%3Fintent%3Daudit");
});

test("getCurrentAuthUser redirects stale sessions before profile creation", () => {
  const source = fs.readFileSync(path.resolve("src/lib/auth/profile.ts"), "utf8");
  const authResolver = source.slice(source.indexOf("export async function getCurrentAuthUser"), source.indexOf("async function findProfileByUserId"));

  assert.equal(authResolver.includes("redirect(staleSessionCleanupPath())"), true);
  assert.equal(authResolver.includes("getOrCreateProfile"), false);
  assert.equal(source.includes("Auth/user error"), false);
});

test("recovery, switch and callback routes use Supabase SSR cookie flows", () => {
  const recoveryRoute = fs.readFileSync(path.resolve("src/app/auth/recover-session/route.ts"), "utf8");
  const logoutRoute = fs.readFileSync(path.resolve("src/app/auth/logout/route.ts"), "utf8");
  const clearRoute = fs.readFileSync(path.resolve("src/app/auth/session/clear/route.ts"), "utf8");
  const switchRoute = fs.readFileSync(path.resolve("src/app/auth/switch-account/route.ts"), "utf8");
  const cleanup = fs.readFileSync(path.resolve("src/lib/auth/session-cleanup.ts"), "utf8");
  const callbackRoute = fs.readFileSync(path.resolve("src/app/auth/callback/route.ts"), "utf8");

  assert.equal(recoveryRoute.includes("clearSupabaseSession"), true);
  assert.equal(logoutRoute.includes("clearSupabaseSession"), true);
  assert.equal(clearRoute.includes("clearSupabaseSession"), true);
  assert.equal(switchRoute.includes("clearSupabaseSession"), true);
  assert.equal(cleanup.includes("supabase.auth.signOut()"), true);
  assert.equal(cleanup.includes("isSupabaseAuthCookie"), true);
  assert.equal(cleanup.includes("response.cookies.set"), true);
  assert.equal(callbackRoute.includes("exchangeCodeForSession(confirmation.code)"), true);
  assert.equal(callbackRoute.includes("verifyOtp"), true);
  assert.equal(callbackRoute.includes("/auth/bootstrap"), true);
});

test("signup sends email confirmations through the auth callback route", () => {
  const authForm = fs.readFileSync(path.resolve("src/components/auth/AuthForm.tsx"), "utf8");
  const confirmation = fs.readFileSync(path.resolve("src/lib/auth/confirmation.ts"), "utf8");

  assert.equal(authForm.includes("emailRedirectTo"), true);
  assert.equal(authForm.includes("authConfirmationRedirectUrl"), true);
  assert.equal(confirmation.includes("/auth/callback?next="), true);
  assert.equal(confirmation.includes('"/onboarding"'), true);
  assert.equal(authForm.includes("full_name"), true);
  assert.equal(authForm.includes("phone"), true);
});

test("account switch and logout use server cleanup routes", () => {
  const accountChoice = fs.readFileSync(path.resolve("src/components/auth/AuthenticatedAccountChoice.tsx"), "utf8");
  const logoutButton = fs.readFileSync(path.resolve("src/components/auth/LogoutButton.tsx"), "utf8");
  const workspaceMenu = fs.readFileSync(path.resolve("src/components/dashboard/WorkspaceMenu.tsx"), "utf8");

  assert.equal(accountChoice.includes("/auth/switch-account"), true);
  assert.equal(logoutButton.includes("/auth/logout"), true);
  assert.equal(workspaceMenu.includes("/auth/logout"), true);
});

test("auth pages do not call redirecting auth helper while rendering", () => {
  const loginPage = fs.readFileSync(path.resolve("src/app/(auth)/login/page.tsx"), "utf8");
  const signupPage = fs.readFileSync(path.resolve("src/app/(auth)/signup/page.tsx"), "utf8");

  assert.equal(loginPage.includes("getCurrentAuthUser"), false);
  assert.equal(signupPage.includes("getCurrentAuthUser"), false);
  assert.equal(loginPage.includes("resolveAuthPageState"), true);
  assert.equal(signupPage.includes("resolveAuthPageState"), true);
});

test("login page renders mutually exclusive auth branches", () => {
  const loginPage = fs.readFileSync(path.resolve("src/app/(auth)/login/page.tsx"), "utf8");
  const authenticatedBranch = loginPage.slice(loginPage.indexOf('state.status === "authenticated"'), loginPage.indexOf('state.status === "temporary_auth_failure"'));
  const temporaryBranch = loginPage.slice(loginPage.indexOf('state.status === "temporary_auth_failure"'), loginPage.indexOf('state.status === "authenticated_unconfirmed"'));

  assert.equal(authenticatedBranch.includes("AuthenticatedAccountChoice"), true);
  assert.equal(authenticatedBranch.includes("LoginReasonNotice"), false);
  assert.equal(authenticatedBranch.includes("AuthForm"), false);
  assert.equal(temporaryBranch.includes("RetryAuthState"), true);
  assert.equal(temporaryBranch.includes("AuthenticatedAccountChoice"), false);
  assert.match(loginPage, /else\s*\{\s*content = \(\s*<>\s*<LoginReasonNotice[\s\S]*?<AuthForm mode="login"/);
});

test("signup stale sessions recover to login, never signup reason pages", () => {
  const signupPage = fs.readFileSync(path.resolve("src/app/(auth)/signup/page.tsx"), "utf8");
  const recoveryRoute = fs.readFileSync(path.resolve("src/app/auth/recover-session/route.ts"), "utf8");

  assert.equal(signupPage.includes("/auth/recover-session?next=/login?reason=session_expired"), true);
  assert.equal(signupPage.includes("/auth/recover-session?next=/signup?reason=session_expired"), false);
  assert.equal(recoveryRoute.includes('requestedNext.startsWith("/signup")'), true);
  assert.equal(recoveryRoute.includes("pointsToRecovery"), true);
  assert.equal(recoveryRoute.includes('"/login?reason=session_expired"'), true);
});

test("auth resolver treats missing sessions without auth cookies as anonymous", () => {
  const profileSource = fs.readFileSync(path.resolve("src/lib/auth/profile.ts"), "utf8");
  const sessionErrors = fs.readFileSync(path.resolve("src/lib/auth/session-errors.ts"), "utf8");

  assert.equal(sessionErrors.includes("hasPersistedSupabaseAuthCookie"), true);
  assert.equal(sessionErrors.includes("return hasPersistedSession ? { status: \"stale_session\", reason: \"session_not_found\" } : { status: \"anonymous\" }"), true);
  assert.equal(profileSource.includes("hasPersistedSupabaseAuthCookie(cookies().getAll())"), true);
  assert.equal(profileSource.includes('if (classified.status === "anonymous")'), true);
});
