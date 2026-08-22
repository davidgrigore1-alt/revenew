import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

test("product IA defines one operational job for every primary destination", () => {
  const architecture = read("docs/product-information-architecture.md");

  for (const route of [
    "/dashboard", "/today", "/inbox", "/approvals", "/opportunities", "/recoverable",
    "/pipeline", "/ai", "/companies", "/crm/organizations/[id]", "/contacts", "/outreach",
    "/reports", "/settings", "/help", "/demo"
  ]) {
    assert.ok(architecture.includes(route), route);
  }

  assert.match(architecture, /Întreabă → Descoperă → Decide/);
  assert.match(architecture, /Valoare estimată în pipeline/);
  assert.match(architecture, /valoare estimată expusă/i);
  assert.match(architecture, /venit confirmat/i);
  assert.match(architecture, /numărată o singură dată/i);
});

test("shared page hierarchy is compact and contextual guidance uses progressive disclosure", () => {
  const pageShell = read("src/components/dashboard/PageShell.tsx");
  const pageHeader = read("src/components/dashboard/PageHeader.tsx");
  const guide = read("src/components/guidance/ContextualPageGuide.tsx");

  assert.match(pageShell, /className="app-page/);
  assert.match(pageShell, /app-section-stack mt-5/);
  assert.doesNotMatch(pageHeader, /uppercase tracking-\[0\.12em\]/);
  assert.match(guide, /<details className="group" data-revenew-disclosure="page-guide">/);
  assert.match(guide, /Ghid de decizie/);
  assert.match(guide, /Închide ghidul acestei pagini/);
  assert.doesNotMatch(guide, /<details[^>]*\sopen(?:=|\s|>)/);
});

test("desktop shell avoids repeating workspace context while mobile retains it", () => {
  const header = read("src/components/dashboard/AppHeader.tsx");
  const sidebar = read("src/components/dashboard/Sidebar.tsx");

  assert.match(header, /hidden min-w-0 sm:block lg:hidden/);
  assert.match(header, /Spațiu de lucru/);
  assert.doesNotMatch(header, /getActiveNavigationHref|activeItem/);
  assert.match(sidebar, /WorkspaceMenu/);
  assert.doesNotMatch(sidebar, /WorkspaceIdentityDisplay/);
  assert.match(sidebar, /GlobalSearch/);
  assert.doesNotMatch(sidebar, /Compania activă/);
});

test("important redesigned surfaces keep semantic DOM order aligned with presentation", () => {
  const companyPage = read("src/app/(protected)/crm/organizations/[id]/page.tsx");
  const conversation = read("src/components/intelligence/CopilotConversation.tsx");
  const settings = read("src/app/(protected)/settings/page.tsx");
  const onboarding = read("src/components/onboarding/OnboardingForm.tsx");
  const sources = [companyPage, conversation, settings, onboarding].join("\n");

  assert.doesNotMatch(sources, /\b(?:order-(?:first|last|none|\d+)|flex-(?:row|col)-reverse|grid-flow-dense)\b/);
  assert.ok(companyPage.indexOf("<CompanyBusinessMemory") < companyPage.indexOf("<CompanyContextualAsk"));
  assert.ok(conversation.indexOf("<form onSubmit={submit}") < conversation.indexOf('aria-live="polite"'));
  assert.ok(settings.indexOf("<nav") < settings.indexOf("<PersonalizationSettingsPanel"));
  assert.ok(onboarding.indexOf('<section className="rounded-panel') < onboarding.indexOf('<aside className="min-h-[34rem]'));
});
test("semantic motion remains restrained and reduced-motion safe", () => {
  const css = read("src/app/globals.css");

  assert.match(css, /--motion-feedback: 100ms/);
  assert.match(css, /--motion-reveal: 160ms/);
  assert.match(css, /--motion-content: 200ms/);
  assert.match(css, /--motion-panel: 240ms/);
  assert.match(css, /--motion-page: 160ms/);
  assert.match(css, /translateY\(4px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /transition-duration: 0\.01ms !important/);
});

test("Company 360 presents memory before contextual search", () => {
  const page = read("src/app/(protected)/crm/organizations/[id]/page.tsx");
  const memoryIndex = page.indexOf("<CompanyBusinessMemory");
  const askIndex = page.indexOf("<CompanyContextualAsk");

  assert.ok(memoryIndex > 0);
  assert.ok(askIndex > memoryIndex);
});
