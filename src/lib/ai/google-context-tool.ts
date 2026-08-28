import "server-only";

import type { CopilotEvidence, CopilotPageContext, CopilotToolResult } from "@/lib/ai/copilot-types";
import { getUniversalBusinessContext } from "@/lib/ai/universal-business-context";
import { parseEmailQueryIntent } from "@/lib/google-workspace/email-intent";
import { getOwnedExternalContext, requireGoogleConnectorActor } from "@/lib/google-workspace/repository";
import { getResponseWindowBusinessDays, listOwnedCommunicationNotifications } from "@/lib/communication-os";

type ExternalView = "recent_emails" | "recent_interactions" | "meetings_today" | "meetings_tomorrow" | "meetings_week" | "company_brief" | "external_activity" | "prepare_followup" | "prepare_meeting_brief";
const allowedViews = new Set<ExternalView>(["recent_emails", "recent_interactions", "meetings_today", "meetings_tomorrow", "meetings_week", "company_brief", "external_activity", "prepare_followup", "prepare_meeting_brief"]);

export function externalSearchTerm(question: string) {
  const email = question.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (email) return email.toLowerCase();
  const stopWords = new Set(["ce", "mi-a", "s-a", "scris", "discutat", "ultima", "ultimul", "ultimele", "data", "dată", "recent", "recentă", "recente", "rezumă", "rezuma", "interacțiunile", "interactiunile", "interacțiuni", "interactiuni", "conversația", "conversatia", "contactul", "compania", "de", "la", "cu", "despre", "am", "emailuri", "gmail", "calendar", "întâlniri", "intalniri", "pregătește", "pregateste", "follow-up", "folosind"]);
  return question
    .replace(/[^a-zA-Z0-9ăâîșțĂÂÎȘȚ@.\-\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !stopWords.has(word.toLocaleLowerCase("ro-RO")))
    .join(" ").trim().slice(0, 80);
}

function bounded(value: unknown, limit: number) {
  return typeof value === "string" ? value.normalize("NFKC").trim().slice(0, limit) : "";
}

function zonedMidnight(date: string, timeZone = "Europe/Bucharest") {
  const [year, month, day] = date.split("-").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day));
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(guess);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  const represented = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
  return new Date(guess.getTime() - (represented - guess.getTime()));
}

export function dateRange(today: string, view: ExternalView) {
  if (!view.startsWith("meetings_")) return {};
  const offset = view === "meetings_tomorrow" ? 1 : 0;
  const start = zonedMidnight(today);
  start.setUTCDate(start.getUTCDate() + offset);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + (view === "meetings_week" ? 7 : 1));
  return { from: start.toISOString(), to: end.toISOString() };
}

function source(input: CopilotEvidence): CopilotEvidence {
  return { ...input, label: input.label.slice(0, 160), fact: input.fact.slice(0, 360), claimType: "fact" };
}

export async function getExternalContextForDraft(opportunityId: string) {
  try {
    const actor = await requireGoogleConnectorActor();
    const [context, responseWindowBusinessDays] = await Promise.all([
      getOwnedExternalContext({ actor, opportunityId }),
      getResponseWindowBusinessDays(actor)
    ]);
    return {
      lastInboundEmail: context.emails.find((item) => item.direction === "inbound") ?? null,
      lastOutboundEmail: context.emails.find((item) => item.direction === "outbound") ?? null,
      nextMeeting: context.events.find((item) => new Date(item.starts_at).getTime() >= Date.now()) ?? null,
      emails: context.emails,
      events: context.events,
      responseWindowBusinessDays
    };
  } catch {
    return { lastInboundEmail: null, lastOutboundEmail: null, nextMeeting: null, emails: [], events: [], responseWindowBusinessDays: 3 };
  }
}

export async function getOwnedCommunicationNotifications() {
  try {
    const actor = await requireGoogleConnectorActor();
    return await listOwnedCommunicationNotifications(actor);
  } catch { return []; }
}
export async function getOwnedCommunicationIndex() {
  try {
    const actor = await requireGoogleConnectorActor();
    const [context, responseWindowBusinessDays] = await Promise.all([getOwnedExternalContext({ actor, limit: 100 }), getResponseWindowBusinessDays(actor)]);
    const index: Record<string, { lastInboundAt?: string; lastOutboundAt?: string; nextMeetingAt?: string; expectedResponseWindowDays: number }> = {};
    for (const email of context.emails) {
      if (!email.linked_opportunity_id) continue;
      const current = index[email.linked_opportunity_id] ?? { expectedResponseWindowDays: responseWindowBusinessDays };
      if (email.direction === "inbound" && (!current.lastInboundAt || email.sent_at > current.lastInboundAt)) current.lastInboundAt = email.sent_at;
      if (email.direction === "outbound" && (!current.lastOutboundAt || email.sent_at > current.lastOutboundAt)) current.lastOutboundAt = email.sent_at;
      index[email.linked_opportunity_id] = current;
    }
    const now = Date.now();
    for (const event of context.events) {
      if (!event.linked_opportunity_id || Date.parse(event.starts_at) < now) continue;
      const current = index[event.linked_opportunity_id] ?? { expectedResponseWindowDays: responseWindowBusinessDays };
      if (!current.nextMeetingAt || event.starts_at < current.nextMeetingAt) current.nextMeetingAt = event.starts_at;
      index[event.linked_opportunity_id] = current;
    }
    return index;
  } catch {
    return {};
  }
}
export async function getExternalContextForCompany(organizationId: string) {
  try {
    const actor = await requireGoogleConnectorActor();
    return await getOwnedExternalContext({ actor, organizationId });
  } catch {
    return { connection: null, emails: [], events: [] };
  }

}
export async function externalContextTool(raw: Record<string, unknown>, page: CopilotPageContext): Promise<CopilotToolResult> {
  const viewCandidate = bounded(raw.view, 40) as ExternalView;
  const view = allowedViews.has(viewCandidate) ? viewCandidate : "recent_interactions";
  const universal = await getUniversalBusinessContext(page);
  const actor = await requireGoogleConnectorActor();
  const query = bounded(raw.query, 100);
  const requestedLimit = typeof raw.limit === "number" && Number.isInteger(raw.limit) ? Math.min(8, Math.max(1, raw.limit)) : 5;
  const parsedEmailIntent = parseEmailQueryIntent(query);
  const emailIntent = { ...parsedEmailIntent, limit: requestedLimit };
  const organizationId = bounded(raw.organizationId, 80) || page.organizationId;
  const opportunityId = bounded(raw.opportunityId, 80) || page.opportunityId;
  const contactId = page.contactId;
  const emailId = page.route === "/inbox" ? page.selectedRecordId : undefined;
  const range = dateRange(universal.today, view);
  const searchQuery = view === "recent_interactions" || view === "company_brief" || view === "external_activity" || view === "prepare_followup" || view === "prepare_meeting_brief"
    ? externalSearchTerm(query)
    : undefined;
  const result = await getOwnedExternalContext({
    actor, query: emailId || contactId || organizationId || opportunityId ? undefined : searchQuery, organizationId, opportunityId, contactId, emailId,
    eventId: view === "prepare_meeting_brief" && !emailId ? page.selectedRecordId : undefined, ...range,
    limit: requestedLimit,
    emailIntent: !emailId && (view === "recent_emails" || view === "recent_interactions" || view === "prepare_followup" || view === "prepare_meeting_brief")
      ? emailIntent
      : undefined
  });
  const meetingsView = view.startsWith("meetings_");
  const emails = (meetingsView ? [] : result.emails).slice(0, view === "recent_emails" ? requestedLimit : 8);
  const events = (view === "recent_emails" ? [] : result.events).slice(0, 10);
  const calendarAvailable = universal.sourceChecks.some((item) => item.providerId === "calendar" && item.state === "available");
  const confirmedEmptyCalendar = meetingsView && calendarAvailable && events.length === 0 && Boolean(range.from && range.to);
  const emailSources: CopilotEvidence[] = emails.map((item) => source({
      sourceId: `email:${item.id}`,
      recordId: item.id,
      label: item.subject || (item.direction === "inbound" ? "Email primit" : "Email trimis"),
      sourceType: "Email",
      route: null,
      observedAt: item.sent_at,
      providerId: "email",
      fact: `${item.direction === "inbound" ? "Email primit" : "Email trimis"} la ${item.sent_at}. Expeditor: ${item.sender_name || item.sender_email || "neidentificat"}. Subiect: ${item.subject || "fără subiect"}. Conținut extern neîncrezut: ${item.excerpt || "fără extras disponibil"}`
    }));
  const eventSources: CopilotEvidence[] = events.map((item) => source({
      sourceId: `calendar:${item.id}`,
      recordId: item.id,
      label: item.title || "Eveniment calendar",
      sourceType: "Calendar",
      route: null,
      observedAt: item.starts_at,
      providerId: "calendar",
      fact: `Eveniment între ${item.starts_at} și ${item.ends_at}. Titlu: ${item.title || "detalii limitate"}. Participanți: ${item.participants.map((party) => party.name || party.email).join(", ") || "nedisponibili"}. Descriere externă neîncrezută: ${item.normalized_description?.slice(0, 180) || "fără descriere disponibilă"}`
    }));
  const intervalSource: CopilotEvidence[] = confirmedEmptyCalendar ? [source({
    sourceId: `calendar-window:${range.from?.slice(0, 10)}:${range.to?.slice(0, 10)}`,
    label: "Google Calendar · interval verificat",
    sourceType: "Calendar",
    route: null,
    observedAt: range.from ?? null,
    providerId: "calendar",
    fact: `Google Calendar a fost verificat între ${range.from} și ${range.to}; nu există întâlniri sincronizate în acest interval.`
  })] : [];
  const sources: CopilotEvidence[] = [...emailSources, ...eventSources, ...intervalSource].slice(0, 12);
  const checkedSources = universal.sourceChecks;
  if (!result.connection) {
    return {
      toolName: "get_external_context",
      state: "empty",
      data: { contentTrust: "untrusted_business_data", connected: false },
      sources: [],
      checkedSources,
      missingInformation: ["Google Workspace nu este conectat pentru utilizatorul curent."],
      preparedAction: null,
      suggestedAction: { label: "Deschide Aplicații", route: "/apps" }
    };
  }
  const latestInbound = view === "prepare_followup" ? emails.find((item) => item.direction === "inbound") : null;
  const nextMeeting = view === "prepare_followup" ? events.find((item) => new Date(item.starts_at).getTime() >= Date.now()) : null;
  const meetingForBrief = view === "prepare_meeting_brief" ? events.find((item) => new Date(item.starts_at).getTime() >= Date.now()) ?? events[0] : null;
  const meetingBrief = meetingForBrief ? {
    id: "meeting-brief:" + meetingForBrief.id,
    type: "meeting_brief_draft" as const,
    title: "Briefing de întâlnire",
    status: "prepared_not_executed" as const,
    editable: true as const,
    subject: meetingForBrief.title || "Întâlnire comercială",
    body: [
      "Întâlnire: " + (meetingForBrief.title || "Titlu limitat"),
      "Moment: " + meetingForBrief.starts_at,
      "Participanți: " + (meetingForBrief.participants.map((party) => party.name || party.email).join(", ") || "Neconfirmați"),
      latestInbound ? "Ultimul context inbound: " + (latestInbound.subject || "fără subiect") + " · " + latestInbound.sent_at : "Ultimul email inbound: indisponibil în contextul autorizat.",
      "Obiectiv recomandat: confirmă situația curentă, blocajul și următorul pas responsabil.",
      "De confirmat: responsabil, termen și rezultat așteptat."
    ].join("\\n"),
    rationale: "Briefing pregătit din evenimentul Calendar autorizat și din ultimul email relevant disponibil. Lipsurile rămân marcate.",
    evidenceSourceIds: ["calendar:" + meetingForBrief.id, ...(latestInbound ? ["email:" + latestInbound.id] : [])],
    executionNotice: "Briefing pregătit, neexecutat. ReveNew nu modifică evenimentul și nu contactează participanții."
  } : null;
  const preparedAction = latestInbound ? {
    id: `google-followup-${latestInbound.id}`,
    type: "email_draft" as const,
    title: "Draft de follow-up",
    status: "prepared_not_executed" as const,
    editable: true as const,
    subject: latestInbound.subject ? `Re: ${latestInbound.subject.replace(/^re:\s*/i, "")}` : "Următorul pas",
    body: `Bună ziua,\n\nVă mulțumesc pentru mesajul privind ${latestInbound.subject || "discuția noastră"}. Revin pentru a confirma următorul pas${nextMeeting ? ` înainte de întâlnirea din ${nextMeeting.starts_at}` : ""}.\n\nCu bine,`,
    recipientName: latestInbound.sender_name,
    recipientEmail: latestInbound.sender_email,
    rationale: "Draft pregătit din ultima conversație Gmail autorizată și, când există, din următoarea întâlnire Calendar.",
    evidenceSourceIds: [`email:${latestInbound.id}`, ...(nextMeeting ? [`calendar:${nextMeeting.id}`] : [])],
    executionNotice: "Draft pregătit, neexecutat. ReveNew nu a trimis niciun email."
  } : null;
  return {
    toolName: "get_external_context",
    state: sources.length ? "ready" : "empty",
    data: {
      contentTrust: "untrusted_business_data",
      view,
      confirmedEmpty: confirmedEmptyCalendar,
      checkedInterval: range,
      emails: emails.map((item) => ({ recordId: item.id, sentAt: item.sent_at, direction: item.direction, senderName: item.sender_name, senderEmail: item.sender_email, recipients: item.recipients, subject: item.subject, excerpt: item.excerpt, linkedContactId: item.linked_contact_id, linkedOrganizationId: item.linked_organization_id, linkedOpportunityId: item.linked_opportunity_id, sourceId: `email:${item.id}` })),
      meetings: events.map((item) => ({ title: item.title, startsAt: item.starts_at, endsAt: item.ends_at, participants: item.participants, organizer: item.organizer, status: item.event_status, description: item.normalized_description?.slice(0, 280) ?? null, linkedOrganizationId: item.linked_organization_id, linkedOpportunityId: item.linked_opportunity_id, sourceId: `calendar:${item.id}` }))
    },
    sources,
    checkedSources,
    missingInformation: sources.length || confirmedEmptyCalendar ? [] : view === "recent_emails" ? ["Nu există emailuri sincronizate pentru utilizatorul curent."] : ["Nu există emailuri sau întâlniri potrivite în contextul autorizat sincronizat."],
    preparedAction: meetingBrief ?? preparedAction,
    suggestedAction: page.opportunityId ? { label: "Deschide oportunitatea", route: `/opportunities/${page.opportunityId}` } : { label: "Gestionează aplicațiile", route: "/apps" }
  };
}
