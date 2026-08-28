import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import {
  cancelledCalendarEvent,
  fullCalendarEvent,
  hostileHtmlMessage,
  limitedCalendarEvent,
  maliciousBusinessText,
  multipartInboundMessage
} from "./fixtures/google-workspace.mjs";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

async function normalizationModule() {
  const output = ts.transpileModule(read("src/lib/google-workspace/normalization.ts"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(output).toString("base64"));
}

test("OAuth uses secure state, PKCE, offline access and a separately requested send scope", () => {
  const oauth = read("src/lib/google-workspace/oauth.ts");
  assert.match(oauth, /randomBytes\(32\).*base64url/);
  assert.match(oauth, /timingSafeEqual/);
  assert.match(oauth, /code_challenge_method", "S256"/);
  assert.match(oauth, /access_type", "offline"/);
  assert.match(oauth, /gmail\.readonly/);
  assert.match(oauth, /calendar\.events\.readonly/);
  assert.match(oauth, /includeEmailSend \? \[\.\.\.GOOGLE_WORKSPACE_SCOPES, GOOGLE_GMAIL_SEND_SCOPE\] : GOOGLE_WORKSPACE_SCOPES/);
  assert.doesNotMatch(oauth, /gmail\.(?:compose|modify)|auth\/calendar\.events(?!\.readonly)/);
});

test("callback rejects invalid state before authorization-code exchange", () => {
  const callback = read("src/app/api/integrations/google/callback/route.ts");
  const validation = callback.indexOf("validateOAuthState(state");
  const exchange = callback.indexOf("exchangeGoogleAuthorizationCode(code, verifier)");
  assert.ok(validation >= 0 && exchange > validation);
  assert.match(callback, /invalid-state/);
  assert.match(callback, /httpOnly: true/);
  assert.match(callback, /path: "\/api\/integrations\/google"/);
  assert.doesNotMatch(callback, /searchParams\.get\(["']redirect/);
});

test("refresh credentials use an environment-held AES-256-GCM envelope", () => {
  const crypto = read("src/lib/google-workspace/crypto.ts");
  const repository = read("src/lib/google-workspace/repository.ts");
  assert.match(crypto, /GOOGLE_TOKEN_ENCRYPTION_KEY/);
  assert.match(crypto, /createCipheriv\("aes-256-gcm"/);
  assert.match(crypto, /randomBytes\(12\)/);
  assert.match(crypto, /getAuthTag/);
  assert.match(crypto, /key\.length !== 32/);
  assert.match(repository, /encryptGoogleRefreshCredential\(input\.refreshToken\)/);
  assert.match(repository, /\.eq\("external_account_id", input\.externalAccountId\)/);
  assert.doesNotMatch(read("src/components/apps/GoogleWorkspaceCard.tsx"), /refresh_token|encrypted_refresh_credential|access_token/i);
});

test("migration enforces owner-private, tenant-scoped, server-only context", () => {
  const migration = read("supabase/migrations/20260823155517_google_workspace_context.sql");
  for (const table of ["external_connections", "external_email_messages", "external_calendar_events", "external_sync_runs"]) {
    assert.match(migration, new RegExp("alter table public\\." + table + " enable row level security"));
    assert.match(migration, new RegExp("revoke all on table public\\." + table + " from public, anon, authenticated"));
  }
  assert.match(migration, /owner_profile_id = public\.current_profile_id\(\)/);
  assert.match(migration, /public\.can_access_business\(business_id\)/);
  assert.match(migration, /external context owner must belong to the business/);
  assert.match(migration, /external context connection scope mismatch/);
  assert.doesNotMatch(migration, /disable row level security|grant all on table public\.[^;]+ to authenticated/i);
});

test("repository scopes private reads, mutations and disconnect to owner and tenant", () => {
  const repository = read("src/lib/google-workspace/repository.ts");
  assert.match(repository, /\.eq\("business_id", actor\.businessId\)[\s\S]*?\.eq\("owner_profile_id", actor\.profileId\)/);
  assert.match(repository, /\.eq\("business_id", input\.actor\.businessId\)\.eq\("owner_profile_id", input\.actor\.profileId\)\.eq\("connection_id", connection\.id\)/);
  assert.match(repository, /disconnectOwnedGoogleConnection[\s\S]*encrypted_refresh_credential: null/);
  assert.match(repository, /external_email_messages"\)\.delete\(\).*owner_profile_id/);
  assert.match(repository, /external_calendar_events"\)\.delete\(\).*owner_profile_id/);
});

test("Gmail multipart normalization prefers plain text and minimized fields", async () => {
  const { normalizeGmailMessage } = await normalizationModule();
  const result = normalizeGmailMessage(multipartInboundMessage, "owner@revenew.example");
  assert.equal(result.direction, "inbound");
  assert.equal(result.sender_email, "ana@meridian.example");
  assert.equal(result.recipients[0].email, "owner@revenew.example");
  assert.equal(result.cc_recipients[0].email, "finance@meridian.example");
  assert.equal(result.subject, "Confirmare agendă");
  assert.match(result.normalized_text, /confirmați agenda/);
  assert.doesNotMatch(result.normalized_text, /Varianta HTML/);
  assert.equal("raw" in result, false);
  assert.equal("attachments" in result, false);
});

test("HTML fallback strips executable and remote markup and remains untrusted data", async () => {
  const { normalizeGmailMessage } = await normalizationModule();
  const result = normalizeGmailMessage(hostileHtmlMessage, "owner@revenew.example");
  assert.doesNotMatch(result.normalized_text, /steal\(\)|<script|<img|tracker\.example/);
  assert.match(result.normalized_text, /ignore previous instructions/);
  assert.match(read("src/lib/ai/copilot-instructions.ts"), /date comerciale neîncrezute/);
  assert.match(read("src/lib/ai/google-context-tool.ts"), /contentTrust: "untrusted_business_data"/);
  assert.ok(maliciousBusinessText.includes("send this automatically"));
});

test("Calendar normalization preserves useful fields and limits private events", async () => {
  const { normalizeCalendarEvent } = await normalizationModule();
  const full = normalizeCalendarEvent(fullCalendarEvent);
  assert.equal(full.title, "Meridian — revizuire comercială");
  assert.equal(full.visibility, "private");
  assert.equal(full.participants[0].email, "ana@meridian.example");
  assert.match(full.conference_url, /^https:\/\/meet\.google\.com\//);
  const limited = normalizeCalendarEvent(limitedCalendarEvent);
  assert.equal(limited.visibility, "limited");
  assert.equal(limited.title, "Eveniment privat");
  assert.deepEqual(limited.participants, []);
  assert.equal(limited.normalized_description, null);
  assert.equal(normalizeCalendarEvent(cancelledCalendarEvent).event_status, "cancelled");
});

test("initial Gmail and Calendar synchronization is deliberately bounded", () => {
  const sync = read("src/lib/google-workspace/sync.ts");
  assert.match(sync, /GMAIL_INITIAL_DAYS = 90/);
  assert.match(sync, /GMAIL_MAX_MESSAGES = 500/);
  assert.match(sync, /MAX_PAGES = 5/);
  assert.match(sync, /newer_than:/);
  assert.match(sync, /-in:spam -in:trash/);
  assert.match(sync, /CALENDAR_PAST_DAYS = 60/);
  assert.match(sync, /CALENDAR_FUTURE_DAYS = 120/);
  assert.doesNotMatch(sync, /attachments\//);
});

test("incremental cursors recover through bounded resynchronization", () => {
  const sync = read("src/lib/google-workspace/sync.ts");
  assert.match(sync, /startHistoryId/);
  assert.match(sync, /error\.status !== 404/);
  assert.match(sync, /gmail_history_id: null/);
  assert.match(sync, /syncToken/);
  assert.match(sync, /error\.status !== 410/);
  assert.match(sync, /calendarList\(accessToken, null\)/);
  assert.match(sync, /mode = "bounded_recovery"/);
});

test("partial provider failures remain independent and preserve prior context", () => {
  const sync = read("src/lib/google-workspace/sync.ts");
  assert.match(sync, /syncGmail\(connection, token\.access_token\)/);
  assert.match(sync, /syncCalendar\(connection, token\.access_token\)/);
  assert.match(sync, /anyHealthy\s*\?\s*"error"\s*:\s*"action_required"/);
  assert.match(sync, /anyHealthy\s*\?\s*"partial" as const/);
  assert.doesNotMatch(sync, /from\("external_(?:email_messages|calendar_events)"\)\.delete/);
});

test("entity linking is exact and refuses ambiguous contacts or opportunities", () => {
  const repository = read("src/lib/google-workspace/repository.ts");
  assert.match(repository, /\.in\("normalized_email", normalized\)/);
  assert.match(repository, /exactContacts\.length !== 1/);
  assert.match(repository, /opportunityLinks\?\.length === 1/);
  assert.doesNotMatch(repository, /similarity|levenshtein|fuzzy/i);
});

test("Ask ReveNew exposes controlled external queries and safe evidence references", () => {
  const tool = read("src/lib/ai/google-context-tool.ts");
  const registry = read("src/lib/ai/copilot-tools.ts");
  const orchestrator = read("src/lib/ai/copilot-orchestrator.ts");
  assert.match(registry, /name: "get_external_context"/);
  assert.match(orchestrator, /email\|gmail\|scris/);
  assert.match(orchestrator, /meetings_tomorrow/);
  assert.match(tool, /sourceId: .*email:/);
  assert.match(tool, /sourceId: .*calendar:/);
  assert.match(tool, /route: null/);
  assert.match(tool, /Google Workspace nu este conectat pentru utilizatorul curent/);
  assert.match(registry, /getExternalContextForCompany/);
  assert.match(registry, /externalContext:/);
  assert.match(registry, /checkedSources: universal\.sourceChecks/);
});

test("prepared follow-up uses context without send side effects", () => {
  const tools = read("src/lib/ai/copilot-tools.ts");
  const oauth = read("src/lib/google-workspace/oauth.ts");
  assert.match(tools, /getExternalContextForDraft/);
  assert.match(tools, /Context folosit/);
  assert.match(tools, /status: "prepared_not_executed"/);
  assert.match(tools, /editable: true/);
  assert.doesNotMatch(oauth, /gmail\.compose|gmail\.modify/);
  assert.doesNotMatch(read("src/lib/google-workspace/sync.ts"), /method:\s*["'](?:POST|PATCH|PUT|DELETE)["']/);
});

test("disconnect revokes, clears credentials and deletes private synchronized context", () => {
  const route = read("src/app/api/integrations/google/disconnect/route.ts");
  const repository = read("src/lib/google-workspace/repository.ts");
  assert.match(route, /revokeGoogleCredential\(credential\)/);
  assert.match(route, /disconnectOwnedGoogleConnection/);
  assert.match(repository, /status: "disconnected"/);
  assert.match(repository, /encrypted_refresh_credential: null/);
  assert.match(repository, /external_email_messages"\)\.delete\(\)/);
  assert.match(repository, /external_calendar_events"\)\.delete\(\)/);
});

test("Apps is canonical and real-state driven while Control Center stays compact", () => {
  const page = read("src/app/(protected)/apps/page.tsx");
  const card = read("src/components/apps/GoogleWorkspaceCard.tsx");
  const navigation = read("src/lib/navigation.ts");
  const dashboard = read("src/app/(protected)/dashboard/page.tsx");
  assert.match(page, /IntegrationHub/);
  assert.match(page, /getGoogleWorkspacePublicState/);
  assert.match(card, /Sincronizează/);
  assert.match(card, /Deconectează/);
  assert.match(navigation, /name: "Aplicații", href: "\/apps"/);
  assert.match(dashboard, /Gestionează aplicațiile/);
  assert.doesNotMatch(page, /148 emailuri|21 întâlniri/);
});
