import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ENVELOPE_VERSION = "v1";
const KEY_ENV = "GOOGLE_TOKEN_ENCRYPTION_KEY";

function encryptionKey() {
  const raw = process.env[KEY_ENV]?.trim();
  if (!raw) throw new Error("google_token_encryption_key_missing");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("google_token_encryption_key_invalid");
  return key;
}

export function encryptGoogleRefreshCredential(value: string) {
  if (!value) throw new Error("google_refresh_credential_missing");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [ENVELOPE_VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptGoogleRefreshCredential(envelope: string) {
  const [version, ivValue, tagValue, payloadValue, ...extra] = envelope.split(".");
  if (version !== ENVELOPE_VERSION || !ivValue || !tagValue || !payloadValue || extra.length) {
    throw new Error("google_refresh_credential_envelope_invalid");
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(payloadValue, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("google_refresh_credential_decryption_failed");
  }
}
