import type { ExternalParty, NormalizedGoogleCalendarEvent, NormalizedGoogleEmail } from "@/lib/google-workspace/types";

type GmailHeader = { name?: string; value?: string };
type GmailPart = { mimeType?: string; body?: { data?: string }; parts?: GmailPart[] };
export type GmailMessagePayload = {
  id?: string;
  threadId?: string;
  historyId?: string;
  internalDate?: string;
  labelIds?: string[];
  snippet?: string;
  payload?: GmailPart & { headers?: GmailHeader[] };
};

function cleanText(value: string, max = 30_000) {
  return value.normalize("NFKC").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim().slice(0, max);
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

export function htmlToSafeText(value: string) {
  return cleanText(decodeEntities(value
    .replace(/<(script|style|head|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")));
}

function decodeBody(data: string | undefined) {
  if (!data) return "";
  try { return Buffer.from(data, "base64url").toString("utf8"); } catch { return ""; }
}

function collectBodies(part: GmailPart | undefined, output: { plain: string[]; html: string[] }) {
  if (!part) return;
  const decoded = decodeBody(part.body?.data);
  if (part.mimeType === "text/plain" && decoded) output.plain.push(decoded);
  else if (part.mimeType === "text/html" && decoded) output.html.push(decoded);
  for (const child of part.parts ?? []) collectBodies(child, output);
}

function header(headers: GmailHeader[] | undefined, name: string) {
  return headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value?.trim() ?? "";
}

export function parseAddressHeader(value: string): ExternalParty[] {
  return value.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).flatMap((part) => {
    const normalized = part.trim();
    if (!normalized) return [];
    const match = normalized.match(/^(?:"?([^"<]*)"?\s*)?<([^<>\s]+@[^<>\s]+)>$/);
    const email = (match?.[2] ?? normalized).replace(/^mailto:/i, "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return [];
    const name = cleanText(match?.[1] ?? "", 160) || null;
    return [{ email, name }];
  });
}

export function normalizeGmailMessage(message: GmailMessagePayload, connectedEmail: string): NormalizedGoogleEmail | null {
  if (!message.id || !message.threadId || !message.internalDate) return null;
  const headers = message.payload?.headers;
  const sender = parseAddressHeader(header(headers, "From"))[0] ?? null;
  const recipients = parseAddressHeader(header(headers, "To"));
  const cc = parseAddressHeader(header(headers, "Cc"));
  const bodies = { plain: [] as string[], html: [] as string[] };
  collectBodies(message.payload, bodies);
  const normalizedText = cleanText(bodies.plain.join("\n\n")) || htmlToSafeText(bodies.html.join("\n\n")) || cleanText(message.snippet ?? "", 600) || null;
  const subject = cleanText(header(headers, "Subject"), 500) || null;
  const sentAt = new Date(Number(message.internalDate));
  if (Number.isNaN(sentAt.getTime())) return null;
  return {
    provider_message_id: message.id,
    provider_thread_id: message.threadId,
    sent_at: sentAt.toISOString(),
    sender_email: sender?.email ?? null,
    sender_name: sender?.name ?? null,
    recipients,
    cc_recipients: cc,
    subject,
    normalized_text: normalizedText,
    excerpt: normalizedText?.slice(0, 600) ?? null,
    direction: sender?.email === connectedEmail.trim().toLowerCase() ? "outbound" : "inbound",
    provider_labels: (message.labelIds ?? []).filter((label) => !["SPAM", "TRASH"].includes(label)).slice(0, 30),
    provider_updated_at: sentAt.toISOString()
  };
}

export type GoogleCalendarPayload = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  visibility?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email?: string; displayName?: string }>;
  organizer?: { email?: string; displayName?: string };
  hangoutLink?: string;
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
  created?: string;
  updated?: string;
};

function calendarDate(value: { dateTime?: string; date?: string } | undefined) {
  const raw = value?.dateTime ?? (value?.date ? `${value.date}T00:00:00.000Z` : "");
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function party(value: { email?: string; displayName?: string } | undefined): ExternalParty | null {
  const email = value?.email?.trim().toLowerCase() ?? "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
  return { email, name: cleanText(value?.displayName ?? "", 160) || null };
}

export function normalizeCalendarEvent(event: GoogleCalendarPayload, calendarId = "primary"): NormalizedGoogleCalendarEvent | null {
  if (!event.id) return null;
  const startsAt = calendarDate(event.start);
  const endsAt = calendarDate(event.end);
  if (!startsAt || !endsAt) return null;
  const limited = !event.summary && !event.description && !(event.attendees?.length);
  const visibility = limited ? "limited" : ["public", "private", "confidential"].includes(event.visibility ?? "") ? event.visibility as "public" | "private" | "confidential" : "default";
  const meetingUrl = event.hangoutLink ?? event.conferenceData?.entryPoints?.find((item) => item.entryPointType === "video" && item.uri?.startsWith("https://"))?.uri ?? null;
  return {
    provider_event_id: event.id,
    provider_calendar_id: calendarId,
    title: limited ? "Eveniment privat" : cleanText(event.summary ?? "", 500) || null,
    starts_at: startsAt,
    ends_at: endsAt,
    time_zone: event.start?.timeZone ?? event.end?.timeZone ?? null,
    participants: limited ? [] : (event.attendees ?? []).flatMap((item) => party(item) ?? []),
    organizer: limited ? null : party(event.organizer),
    normalized_description: limited ? null : (cleanText(event.description ?? "") || null),
    event_status: event.status === "cancelled" ? "cancelled" : event.status === "tentative" ? "tentative" : "confirmed",
    visibility,
    conference_url: meetingUrl,
    provider_created_at: event.created && !Number.isNaN(Date.parse(event.created)) ? new Date(event.created).toISOString() : null,
    provider_updated_at: event.updated && !Number.isNaN(Date.parse(event.updated)) ? new Date(event.updated).toISOString() : null
  };
}
