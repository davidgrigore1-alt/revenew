import "server-only";

import sanitizeHtml from "sanitize-html";
import { decryptGoogleRefreshCredential } from "@/lib/google-workspace/crypto";
import { refreshGoogleAccessToken } from "@/lib/google-workspace/oauth";
import { getOwnedGoogleEmailDetail, getOwnedGoogleEmailSource, type Actor } from "@/lib/google-workspace/repository";

type GmailPart = {
  mimeType?: string;
  body?: { data?: string; attachmentId?: string };
  parts?: GmailPart[];
};

type EmailAction = "summarize_email" | "explain_email_relevance" | "prepare_email_followup" | "ask_about_email";

function decode(value: string | undefined) {
  if (!value) return "";
  try { return Buffer.from(value, "base64url").toString("utf8"); } catch { return ""; }
}

function htmlParts(part: GmailPart | undefined, output: Array<{ data?: string; attachmentId?: string }>) {
  if (!part) return;
  if (part.mimeType === "text/html") output.push(part.body ?? {});
  for (const child of part.parts ?? []) htmlParts(child, output);
}

async function googleJson<T>(url: string, accessToken: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      headers: { authorization: "Bearer " + accessToken, accept: "application/json" },
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(response.status === 401 ? "google_refresh_invalid" : "google_email_html_unavailable");
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

function safeDocument(rawHtml: string, loadRemoteImages: boolean) {
  const clean = sanitizeHtml(rawHtml.slice(0, 500_000), {
    allowedTags: ["a", "abbr", "address", "article", "aside", "b", "blockquote", "br", "caption", "code", "col", "colgroup", "dd", "del", "details", "div", "dl", "dt", "em", "figcaption", "figure", "footer", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "i", "img", "ins", "kbd", "li", "main", "ol", "p", "pre", "s", "section", "small", "span", "strong", "sub", "summary", "sup", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul"],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: loadRemoteImages ? ["src", "alt", "title", "width", "height"] : ["alt", "title", "width", "height"],
      td: ["colspan", "rowspan"], th: ["colspan", "rowspan"], col: ["span"],
      span: ["data-blocked-image", "title"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: (_tagName, attributes) => ({ tagName: "a", attribs: { ...attributes, target: "_blank", rel: "noopener noreferrer nofollow" } }),
      img: (_tagName, attributes) => loadRemoteImages
        ? { tagName: "img", attribs: attributes }
        : { tagName: "span", attribs: { "data-blocked-image": "true", title: attributes.alt || "Imagine externă blocată" } }
    }
  });
  const imagePolicy = loadRemoteImages ? "img-src https: http: data:" : "img-src 'none'";
  return "<!doctype html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; " + imagePolicy + "; style-src 'unsafe-inline'; font-src 'none'; media-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'\"><meta name=\"referrer\" content=\"no-referrer\"><style>html{color-scheme:light;background:#fff}body{margin:0;padding:28px;color:#171717;background:#fff;font:14px/1.65 Arial,sans-serif;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%;border-collapse:collapse}a{color:#315db5}blockquote{margin-left:0;padding-left:14px;border-left:3px solid #ddd;color:#555}[data-blocked-image]{display:inline-block;padding:6px 9px;border:1px solid #ddd;border-radius:6px;color:#777;background:#fafafa}[data-blocked-image]:before{content:'Imagine externă blocată'}</style></head><body>" + clean + "</body></html>";
}

export async function getOwnedGoogleEmailHtml(actor: Actor, messageId: string, loadRemoteImages: boolean) {
  const source = await getOwnedGoogleEmailSource(actor, messageId);
  if (!source) return null;
  const refresh = decryptGoogleRefreshCredential(source.connection.encrypted_refresh_credential as string);
  const token = await refreshGoogleAccessToken(refresh);
  const providerId = encodeURIComponent(source.message.provider_message_id);
  const payload = await googleJson<{ payload?: GmailPart }>("https://gmail.googleapis.com/gmail/v1/users/me/messages/" + providerId + "?format=full", token.access_token);
  const parts: Array<{ data?: string; attachmentId?: string }> = [];
  htmlParts(payload.payload, parts);
  const html: string[] = [];
  for (const part of parts.slice(0, 8)) {
    if (part.data) html.push(decode(part.data));
    else if (part.attachmentId) {
      const attachment = await googleJson<{ data?: string }>("https://gmail.googleapis.com/gmail/v1/users/me/messages/" + providerId + "/attachments/" + encodeURIComponent(part.attachmentId), token.access_token);
      html.push(decode(attachment.data));
    }
  }
  if (!html.some(Boolean)) return { html: null, hasHtml: false };
  return { html: safeDocument(html.join("\n"), loadRemoteImages), hasHtml: true };
}

function conciseSummary(body: string) {
  const sentences = body.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3);
  return sentences.join(" ").slice(0, 900) || "Mesajul nu conține suficient text normalizat pentru un rezumat sigur.";
}

export async function runOwnedGoogleEmailAction(actor: Actor, messageId: string, action: EmailAction, question?: string) {
  const [detail, source] = await Promise.all([
    getOwnedGoogleEmailDetail(actor, messageId),
    getOwnedGoogleEmailSource(actor, messageId)
  ]);
  if (!detail || !source) return null;
  const sourceId = "email:" + detail.id;
  if (action === "summarize_email") {
    return { action, answer: conciseSummary(detail.body), sourceId, preparedAction: null };
  }
  if (action === "explain_email_relevance") {
    const linked = detail.relatedRecords.map((item) => item.label);
    const answer = linked.length
      ? "Mesajul este relevant deoarece are legături CRM determinate cu: " + linked.join(", ") + "."
      : "Nu există o legătură CRM deterministă confirmată. Mesajul rămâne context privat autorizat și nu este clasificat speculativ.";
    return { action, answer, sourceId, preparedAction: null };
  }
  if (action === "prepare_email_followup") {
    const recipient = detail.direction === "inbound" ? detail.sender : detail.recipients[0] ?? null;
    return {
      action,
      answer: "Am pregătit un draft exclusiv din mesajul selectat și contextul său autorizat. Nu a fost trimis.",
      sourceId,
      preparedAction: {
        status: "prepared_not_executed",
        editable: true,
        recipientName: recipient?.name ?? null,
        recipientEmail: recipient?.email ?? null,
        subject: detail.subject ? "Re: " + detail.subject.replace(/^re:\s*/i, "") : "Următorul pas",
        body: "Bună ziua,\n\nVă mulțumesc pentru mesaj. Revin pentru a confirma următorul pas și informațiile necesare pentru continuare.\n\nCu bine,",
        contextUsed: ["Email selectat · " + new Date(detail.sentAt).toISOString(), source.thread.length > 1 ? "Thread Gmail · " + source.thread.length + " mesaje autorizate" : null, ...detail.relatedRecords.map((item) => item.label)].filter(Boolean)
      }
    };
  }
  const safeQuestion = (question ?? "").normalize("NFKC").trim().slice(0, 240);
  return {
    action,
    answer: safeQuestion
      ? "Pentru întrebarea „" + safeQuestion + "”, mesajul selectat indică: " + conciseSummary(detail.body)
      : conciseSummary(detail.body),
    sourceId,
    preparedAction: null
  };
}
