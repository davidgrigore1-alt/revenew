/** Presentation fallback only; the original source and sanitized HTML remain unchanged. */
export function readableEmailBody(body:string|null|undefined):string|null {
 if(!body?.trim())return null;
 // Known rendering sentinel, only when it is the entire body. Never strip quoted business content.
 if(/^(?:TEXT_FORMAT_BODY|TEXT_FORMAT)$/i.test(body.trim()))return null;
 return body;
}

const emailEntityValues: Record<string, string> = {
 amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"',
 ensp: " ", emsp: " ", thinsp: " ", hairsp: " ",
 zwj: "", zwnj: "", lrm: "", rlm: "", shy: "",
 ndash: "–", mdash: "—", hellip: "…"
};

function decodeEmailEntity(entity: string, decimal?: string, hexadecimal?: string, named?: string) {
 const numeric = decimal ? Number(decimal) : hexadecimal ? Number.parseInt(hexadecimal, 16) : null;
 if (numeric !== null) {
  return Number.isInteger(numeric) && numeric > 0 && numeric <= 0x10ffff
   ? String.fromCodePoint(numeric)
   : " ";
 }
 return emailEntityValues[named?.toLowerCase() ?? ""] ?? entity;
}

/** Bounded plain-text presentation for already stored Gmail subjects and excerpts. */
export function readableEmailSnippet(value: string | null | undefined, maxLength = 320) {
 if (!value) return "";
 const decoded = value
  .replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z][\da-z]+));/gi, decodeEmailEntity)
  .replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z][\da-z]+));/gi, decodeEmailEntity);
 return decoded
  .normalize("NFKC")
  .replace(/<[^>]*>/g, " ")
  .replace(/[\u00ad\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, Math.max(0, maxLength));
}
