import "server-only";

import { Buffer } from "buffer";

const GMAIL_SEND_ENDPOINT = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type GmailSendInput = {
  accessToken: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  threadId?: string | null;
};

function safeAddress(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!emailPattern.test(normalized) || /[\r\n]/.test(normalized)) throw new Error("gmail_send_recipient_invalid");
  return normalized;
}

function encodedHeader(value: string) {
  const clean = value.replace(/[\r\n]+/g, " ").trim();
  return /[^\x20-\x7E]/.test(clean) ? `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=` : clean;
}

export function buildGmailMimeMessage(input: Omit<GmailSendInput, "accessToken" | "threadId">) {
  const to = Array.from(new Set(input.to.map(safeAddress)));
  const cc = Array.from(new Set((input.cc ?? []).map(safeAddress))).filter((value) => !to.includes(value));
  if (!to.length) throw new Error("gmail_send_recipient_required");
  const body = input.body.replace(/\r?\n/g, "\r\n").trim();
  if (!body) throw new Error("gmail_send_body_required");
  const headers = [
    `To: ${to.join(", ")}`,
    ...(cc.length ? [`Cc: ${cc.join(", ")}`] : []),
    `Subject: ${encodedHeader(input.subject || "(fără subiect)")}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit"
  ];
  return `${headers.join("\r\n")}\r\n\r\n${body}\r\n`;
}

export async function sendGmailMessage(input: GmailSendInput) {
  const raw = Buffer.from(buildGmailMimeMessage(input), "utf8").toString("base64url");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(GMAIL_SEND_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({ raw, ...(input.threadId ? { threadId: input.threadId } : {}) }),
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new Error("gmail_send_authorization_required");
      if (response.status === 429) throw new Error("gmail_send_rate_limited");
      throw new Error(response.status >= 500 ? "gmail_send_provider_unavailable" : "gmail_send_rejected");
    }
    const result = await response.json() as { id?: string; threadId?: string };
    if (!result.id) throw new Error("gmail_send_confirmation_missing");
    return { providerMessageId: result.id, providerThreadId: result.threadId ?? input.threadId ?? null };
  } finally {
    clearTimeout(timeout);
  }
}