import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";
import { buildFixtures, DEMO } from "../scripts/demo/fixtures.mjs";
import { assertDemoStoryInvariants, DEMO_STORIES } from "../scripts/demo/story-contracts.mjs";

const nodeRequire = createRequire(import.meta.url);
const moduleCache = new Map();
const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), "utf8");

function load(relativePath) {
  const normalizedPath = relativePath.endsWith(".ts") ? relativePath : `${relativePath}.ts`;
  const filename = path.resolve(normalizedPath);
  if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
  const output = ts.transpileModule(read(normalizedPath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename
  }).outputText;
  const module = { exports: {} };
  moduleCache.set(filename, module);
  vm.runInNewContext(output, {
    exports: module.exports,
    module,
    Date,
    Intl,
    Map,
    Set,
    URL,
    require: (id) => id === "server-only" ? {} : id.startsWith("@/") ? load(path.join("src", id.slice(2))) : nodeRequire(id)
  }, { filename });
  return module.exports;
}

const now = new Date("2026-08-17T10:00:00.000Z");
const profileId = "de900000-0000-4000-8000-000000000001";
const fixtures = buildFixtures(profileId, now);
const organizationById = new Map(fixtures.organizations.map((item) => [item.id, item]));
const contactById = new Map(fixtures.contacts.map((item) => [item.id, item]));

function mapSignal(item) {
  const valueClue = item.uncertainty_notes.find((note) => note.startsWith("VALUE_CLUE:"))?.replace("VALUE_CLUE:", "").trim() ?? (/20\.000 EUR/.test(item.raw_message) ? "Valoare menționată: 20.000 EUR" : null);
  return {
    id: item.id,
    businessId: item.business_id,
    title: item.title,
    source: item.source,
    sourceLabel: item.source_label,
    status: item.status,
    reviewStatus: item.review_status,
    priority: item.priority,
    analysisStatus: item.analysis_status,
    analysisMode: item.analysis_mode,
    contactCompany: item.contact_company,
    contactName: item.contact_name,
    contactEmail: item.contact_email,
    rawMessage: item.raw_message,
    extractedSummary: item.extracted_summary,
    currency: item.currency,
    urgencyScore: item.urgency_score,
    fitScore: item.fit_score,
    confidenceScore: item.confidence_score,
    recommendedAction: item.recommended_action,
    assignedToProfileId: item.assigned_to_profile_id,
    occurredAt: item.occurred_at,
    createdAt: item.created_at,
    matchedOrganizationId: item.matched_organization_id,
    matchedContactId: item.matched_contact_id,
    detectedFromOpportunityId: item.detected_from_opportunity_id,
    convertedOpportunityId: item.converted_opportunity_id,
    estimatedValueMin: item.estimated_value_min,
    estimatedValueMax: item.estimated_value_max,
    estimatedRecoverableValue: item.estimated_recoverable_value,
    recoverabilityScore: item.recoverability_score,
    confidenceLevel: item.confidence_level,
    urgencyLevel: item.urgency_level,
    primaryRecoveryReason: item.primary_recovery_reason,
    analysisExplanation: item.analysis_explanation,
    missingInformation: item.missing_information,
    uncertaintyNotes: item.uncertainty_notes,
    valueClue,
    suggestedDueDate: item.suggested_due_date,
    analyzedAt: item.analyzed_at,
    reviewedAt: item.reviewed_at,
    reviewDueAt: item.review_due_at,
    dismissalReason: item.dismissal_reason,
    duplicateRisk: false
  };
}

function mapOpportunity(item) {
  const organization = organizationById.get(item.organization_id);
  const actions = fixtures.actions.filter((row) => row.opportunity_id === item.id).map((row) => ({
    id: row.id, title: row.title, type: row.type, priority: row.priority, status: row.status, description: row.description,
    dueDate: row.due_at, assignedToProfileId: row.assigned_to_profile_id, assignedToName: row.assigned_to_profile_id ? "Irina Petrescu" : null,
    completedAt: row.completed_at, cancelledAt: row.cancelled_at, createdAt: row.created_at
  }));
  const timeline = fixtures.events.filter((row) => row.opportunity_id === item.id).map((row) => ({
    id: row.id, type: row.event_type, label: row.label, description: row.description, date: row.occurred_at,
    actorProfileId: row.actor_profile_id, metadata: row.metadata
  }));
  const documents = fixtures.documents.filter((row) => row.opportunity_id === item.id).map((row) => ({
    id: row.id, type: row.document_type, title: row.title, body: row.body, status: row.status,
    sendStatus: "not_sent", createdAt: item.updated_at, readyAt: row.status === "ready_to_send" ? item.updated_at : null
  }));
  const contacts = fixtures.opportunityContacts.filter((row) => row.opportunity_id === item.id).map((row) => {
    const contact = contactById.get(row.contact_id);
    const contactOrganization = organizationById.get(contact.organization_id);
    return {
      id: row.id, role: row.role, isPrimary: row.is_primary, createdAt: item.created_at,
      contact: { id: contact.id, businessId: contact.business_id, organizationId: contact.organization_id, fullName: contact.full_name, jobTitle: contact.job_title, decisionRole: contact.decision_role, email: contact.email, isActive: contact.is_active, isPrimaryForOrganization: contact.is_primary_for_organization, organization: { id: contactOrganization.id, name: contactOrganization.name } }
    };
  });
  return {
    id: item.id, businessId: item.business_id, organizationId: item.organization_id, title: item.title, type: item.type,
    status: item.status, lifecycleStatus: item.lifecycle_status, commercialType: item.commercial_type,
    ownerProfileId: item.owner_profile_id, ownerName: item.owner_profile_id ? "Irina Petrescu" : null,
    currency: item.currency, estimatedValueLow: item.estimated_value_low, estimatedValueHigh: item.estimated_value_high,
    deadline: item.deadline, fitScore: item.fit_score, urgencyScore: item.urgency_score, moneyScore: item.money_score,
    confidenceScore: item.confidence_score, summary: item.summary, relevance: item.relevance, risks: item.risks,
    recommendedAction: item.recommended_action, rawSourceText: "", createdAt: item.created_at, updatedAt: item.updated_at,
    actualOutcomeAmount: item.actual_outcome_amount, outcomeDate: item.outcome_date, outcomeReason: item.outcome_reason,
    outcomeNote: item.outcome_note, contact: organization ? { company: organization.name } : undefined,
    actions, timeline, documents, contacts
  };
}

const opportunities = fixtures.opportunities.map(mapOpportunity);
const signals = fixtures.signals.map(mapSignal);

test("canonical story contracts form one bounded persistent business world", () => {
  const matrix = assertDemoStoryInvariants(fixtures, now);
  assert.equal(DEMO_STORIES.length, 4);
  assert.ok(DEMO_STORIES.every((story) => story.situation && story.evidence && story.insight && story.missingInformation && story.safeAction && story.canonicalId && story.surfaces.length >= 3));
  assert.deepEqual(Object.keys(matrix), ["vector", "atlas", "meridian", "approval"]);
});

test("relative seeding is deterministic, ordered and contains no observed future facts", () => {
  const second = buildFixtures(profileId, now);
  assert.deepEqual(second, fixtures);
  const vectorEvents = fixtures.events.filter((item) => item.opportunity_id === DEMO.featuredOpportunityId);
  assert.equal(vectorEvents.length, 4);
  assert.ok(vectorEvents.every((item) => Date.parse(item.occurred_at) <= now.getTime()));
  assert.ok(vectorEvents.map((item) => item.occurred_at).every((value, index, list) => index === 0 || value > list[index - 1]));
  assert.ok(fixtures.actions.every((item) => Date.parse(item.created_at) <= now.getTime()));
  assert.ok(fixtures.events.some((item) => now.getTime() - Date.parse(item.occurred_at) <= 24 * 3_600_000));
});

test("canonical Vector search cases resolve through the real deterministic search engine", () => {
  const search = load("src/lib/commercial-search");
  for (const query of ["76000", "76.000", "oportunități fără responsabil", "follow-up-uri restante", "ce necesită atenție"]) {
    const result = search.executeCommercialSearch(search.parseCommercialSearchIntent(query), { opportunities }, { now });
    assert.ok(result.results.some((item) => item.href === `/opportunities/${DEMO.featuredOpportunityId}`), query);
  }
  const records = opportunities.map((item) => ({ id: item.id, entityType: "opportunity", title: item.title, context: item.contact?.company ?? "", href: `/opportunities/${item.id}`, searchableText: `${item.title} ${item.contact?.company ?? ""}` }));
  const company = search.executeCommercialSearch(search.parseCommercialSearchIntent("Nova Medical"), { opportunities, records }, { now });
  assert.ok(company.results.some((item) => /Nova Medical/.test(`${item.title} ${item.context}`)));
});

test("Atlas discovery is evidence-backed, explicit-value and human-reviewed", () => {
  const discovery = load("src/lib/commercial-opportunity-discovery");
  const result = discovery.discoverCommercialOpportunityCandidates({ opportunities, signals }, { now });
  const atlas = result.candidates.find((item) => item.signalId === DEMO.discoverySignalId || item.id.includes(DEMO.discoverySignalId));
  assert.ok(atlas);
  assert.equal(atlas.explicitAmount, 20_000);
  assert.equal(atlas.currency, "EUR");
  assert.equal(atlas.candidateType, "possible_existing_match");
  assert.ok(atlas.evidence.length >= 3);
  assert.equal(atlas.reviewHref, `/inbox?signal=${DEMO.discoverySignalId}`);
});

test("Vector timeline explains the same overdue story with facts before derivations", () => {
  const timeline = load("src/lib/opportunity-intelligence-timeline");
  const vector = opportunities.find((item) => item.id === DEMO.featuredOpportunityId);
  const linkedSignals = signals.filter((item) => item.detectedFromOpportunityId === vector.id);
  const result = timeline.buildOpportunityIntelligenceTimeline({ opportunity: vector, linkedSignals }, { now });
  assert.ok(result.events.filter((item) => item.nature === "observed").length >= 8);
  assert.ok(result.events.some((item) => item.nature === "derived" && /depășit|întârziat/i.test(`${item.title} ${item.summary}`)));
  assert.ok(result.events.some((item) => item.source.type === "commercial_signal" && item.source.id === DEMO.featuredSignalId));
  assert.ok(result.events.some((item) => item.source.type === "document"));
  assert.ok(result.events.every((item) => Date.parse(item.occurredAt) <= now.getTime()));
});

test("the Executive Brief selects Vector and deduplicates its multiple blockers", () => {
  const vector = opportunities.find((item) => item.id === DEMO.featuredOpportunityId);
  const vectorSignals = signals.filter((item) => item.detectedFromOpportunityId === vector.id);
  const queue = load("src/lib/workspace-decision-queue").buildWorkspaceDecisionQueue({ opportunities: [vector], signals: vectorSignals }, { now, limit: 20 });
  const brief = load("src/lib/executive-morning-brief").buildExecutiveMorningBrief(queue, { now, viewerName: "Irina Petrescu" });
  assert.equal(brief.primaryPriority.opportunity, "Recuperare proiect mentenanță · Vector Industrial");
  assert.equal(brief.primaryPriority.amount, 76_000);
  assert.equal(brief.primaryPriority.currency, "RON");
  assert.equal(brief.primaryPriority.valueKind, "estimated_unconfirmed");
  assert.ok(brief.primaryPriority.supportingFacts.length >= 3);
  assert.ok(brief.primaryPriority.evidence.some((item) => item.sourceType === "opportunity_document"));
  assert.equal(brief.secondaryPriorities.some((item) => item.opportunity === brief.primaryPriority.opportunity), false);
});

test("canonical Brief, Discovery and derived Timeline insights remain fully explainable", () => {
  const vector = opportunities.find((item) => item.id === DEMO.featuredOpportunityId);
  const vectorSignals = signals.filter((item) => item.detectedFromOpportunityId === vector.id);
  const queue = load("src/lib/workspace-decision-queue").buildWorkspaceDecisionQueue({ opportunities: [vector], signals: vectorSignals }, { now, limit: 20 });
  const brief = load("src/lib/executive-morning-brief").buildExecutiveMorningBrief(queue, { now });
  const discoveryResult = load("src/lib/commercial-opportunity-discovery").discoverCommercialOpportunityCandidates({ opportunities, signals }, { now });
  const atlas = discoveryResult.candidates.find((item) => item.id.includes(DEMO.discoverySignalId));
  const timelineResult = load("src/lib/opportunity-intelligence-timeline").buildOpportunityIntelligenceTimeline({ opportunity: vector, linkedSignals: vectorSignals }, { now });
  const derived = timelineResult.events.find((item) => item.nature === "derived");
  const adapters = load("src/lib/revenew-explanation-adapters");
  const explanations = [
    adapters.explanationForExecutivePriority(brief.primaryPriority),
    adapters.explanationForDiscovery(atlas),
    adapters.explanationForTimelineEvent(derived)
  ];
  assert.ok(explanations.every((item) => item && item.facts.length > 0 && item.derivedInsights.length > 0 && item.evidence.length > 0 && item.safeAction?.href));
  assert.equal(explanations[0].valueProvenance.kind, "estimated_unconfirmed");
  assert.equal(explanations[1].valueProvenance.kind, "explicit_source");
  assert.ok(explanations[0].missingInformation.some((item) => /responsabil/i.test(item)));
});

test("buyer-visible canonical fixture copy contains no developer fixture language", () => {
  const visible = JSON.stringify({
    organizations: fixtures.organizations.map(({ name, notes }) => ({ name, notes })),
    contacts: fixtures.contacts.map(({ full_name, notes }) => ({ full_name, notes })),
    opportunities: fixtures.opportunities.map(({ title, summary, outcome_note }) => ({ title, summary, outcome_note })),
    actions: fixtures.actions.map(({ title, description }) => ({ title, description })),
    events: fixtures.events.map(({ label, description }) => ({ label, description })),
    documents: fixtures.documents.map(({ title, body }) => ({ title, body })),
    signals: fixtures.signals.map(({ title, source_label, raw_message, analysis_explanation }) => ({ title, source_label, raw_message, analysis_explanation }))
  });
  assert.doesNotMatch(visible, /\b(TEST|E2E|mock|fixture|debug|lorem|seed|dummy|example)\b/i);
  assert.doesNotMatch(visible, /gmail\.com|testdavid|davidtest|Grigore/i);
});
