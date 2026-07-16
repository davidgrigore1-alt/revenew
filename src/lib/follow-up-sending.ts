import "server-only";
import { createHash } from "node:crypto";

export type EmailSendingMode = "disabled" | "test" | "live";
export type SafeSendFailureCategory = "delivery_not_configured" | "provider_rejected" | "provider_unavailable" | "persistence_failed";

export type FollowUpSendInput = {
  recipient: string;
  subject: string;
  body: string;
  idempotencyKey: string;
};

export type ProviderSendResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; category: SafeSendFailureCategory };

export function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("en-US");
}

export function isValidRecipientEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function createFollowUpContentFingerprint(input: {
  businessId: string;
  documentId: string;
  opportunityId: string;
  recipient: string;
  subject: string;
  body: string;
}) {
  const canonical = [
    "follow-up-v1",
    input.businessId,
    input.documentId,
    input.opportunityId,
    normalizeEmail(input.recipient),
    input.subject.trim().replace(/\r\n?/g, "\n"),
    input.body.trim().replace(/\r\n?/g, "\n")
  ].join("\u001f");
  return createHash("sha256").update(canonical).digest("hex");
}

export function createFollowUpIdempotencyKey(input: {
  businessId: string;
  documentId: string;
  approvedFingerprint: string;
  mode: EmailSendingMode;
  attempt: number;
}) {
  return createHash("sha256")
    .update(["follow-up-send-v1", input.businessId, input.documentId, input.approvedFingerprint, input.mode, input.attempt].join("\u001f"))
    .digest("hex");
}

export function getEmailSendingConfiguration() {
  const requested = process.env.EMAIL_SENDING_MODE;
  const mode: EmailSendingMode = requested === "test" || requested === "live" ? requested : "disabled";
  const liveConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM_ADDRESS);
  return {
    mode: mode === "live" && !liveConfigured ? "disabled" as const : mode,
    requestedMode: mode,
    liveConfigured
  };
}

export async function sendWithConfiguredProvider(input: FollowUpSendInput): Promise<ProviderSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM_ADDRESS;
  if (!apiKey || !from) return { ok: false, category: "delivery_not_configured" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey
      },
      body: JSON.stringify({ from, to: [input.recipient], subject: input.subject, text: input.body }),
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) return { ok: false, category: "provider_rejected" };
    const result: unknown = await response.json();
    const id = typeof result === "object" && result !== null && "id" in result ? (result as { id?: unknown }).id : null;
    return typeof id === "string" && id.length > 0
      ? { ok: true, providerMessageId: id.slice(0, 255) }
      : { ok: false, category: "provider_rejected" };
  } catch {
    return { ok: false, category: "provider_unavailable" };
  }
}
