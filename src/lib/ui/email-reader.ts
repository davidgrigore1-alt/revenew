/** Presentation fallback only; the original source and sanitized HTML remain unchanged. */
export function readableEmailBody(body:string|null|undefined):string|null {
 if(!body?.trim())return null;
 // Known rendering sentinel, only when it is the entire body. Never strip quoted business content.
 if(/^(?:TEXT_FORMAT_BODY|TEXT_FORMAT)$/i.test(body.trim()))return null;
 return body;
}
