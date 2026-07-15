import type { OpportunityDocument } from "@/lib/types";

export type FollowUpDraftStatus = OpportunityDocument["status"];
export type FollowUpEditableStatus = "edited" | "approved" | "ready_to_send" | "archived";
export type FollowUpTone = "profesional" | "cald" | "direct";

export const followUpStatusLabels: Record<FollowUpDraftStatus, string> = {
  placeholder: "Draft",
  draft: "Draft",
  edited: "Revizuit",
  copied: "Revizuit",
  approved: "Aprobat",
  ready_to_send: "Pregătit pentru utilizare",
  sent: "Trimis extern",
  archived: "Arhivat"
};

const transitionMap: Record<FollowUpDraftStatus, FollowUpEditableStatus[]> = {
  placeholder: ["edited", "archived"],
  draft: ["edited", "approved", "archived"],
  edited: ["edited", "approved", "archived"],
  copied: ["edited", "approved", "archived"],
  approved: ["edited", "ready_to_send", "archived"],
  ready_to_send: ["edited", "archived"],
  sent: [],
  archived: []
};

const unsafeLanguage = /\b(?:garantat(?:ă|e)?|venit garantat|rezultat garantat|revoluționar|recuperăm automat|automat recuperăm|ultim(?:a|ul) șansă)\b/i;

export function canTransitionFollowUpDraft(current: FollowUpDraftStatus, next: FollowUpEditableStatus) {
  return transitionMap[current].includes(next);
}

export function normalizeFollowUpDraft(title: string, body: string) {
  const envelope = body.trim().match(/^Subiect:\s*([^\r\n]+)\r?\n\r?\n([\s\S]*)$/i);
  return envelope
    ? { subject: envelope[1].trim(), body: envelope[2].trim() }
    : { subject: title.trim(), body: body.trim() };
}

function inferTone(body: string): FollowUpTone {
  const normalized = body.toLocaleLowerCase("ro-RO");
  if (/mulțum|aprec|colabor/.test(normalized)) return "cald";
  if (body.length < 420 && /confirm|stabilim|propun/.test(normalized)) return "direct";
  return "profesional";
}

function shorterVariant(body: string) {
  const paragraphs = body.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  return paragraphs.slice(0, 3).join("\n\n").slice(0, 900);
}

function appendIfMissing(body: string, pattern: RegExp, sentence: string) {
  return pattern.test(body) ? body : `${body.trim()}\n\n${sentence}`;
}

export function assessFollowUpDraft(input: {
  subject: string;
  body: string;
  recipientEmail?: string | null;
  contactName?: string | null;
  reason?: string | null;
  dueDate?: string | null;
}) {
  const subject = input.subject.trim();
  const body = input.body.trim();
  const missingInformation = [
    !input.recipientEmail ? "Adresa destinatarului nu este confirmată." : "",
    !input.contactName ? "Persoana de contact nu este confirmată." : "",
    !input.reason ? "Motivul comercial trebuie confirmat înainte de utilizare." : "",
    !input.dueDate ? "Următorul termen de follow-up nu este stabilit." : ""
  ].filter(Boolean);
  const qualityChecks = [
    { label: "Subiect clar", passed: subject.length >= 5 && subject.length <= 160 },
    { label: "Mesaj suficient de concret", passed: body.length >= 40 && body.length <= 4000 },
    { label: "Fără promisiuni sau urgență artificială", passed: !unsafeLanguage.test(`${subject} ${body}`) },
    { label: "Următor pas ușor de înțeles", passed: /\?|confirm|stabil|propun|reven/.test(body.toLocaleLowerCase("ro-RO")) },
    { label: "Revizuire umană obligatorie", passed: true }
  ];
  return {
    tone: inferTone(body),
    reason: input.reason?.trim() || "Mesajul susține următorul pas comercial al oportunității, după confirmarea contextului.",
    missingInformation,
    qualityChecks,
    canApprove: subject.length >= 5 && body.length >= 40 && !unsafeLanguage.test(`${subject} ${body}`),
    variants: {
      shorter: shorterVariant(body),
      warmer: appendIfMissing(body, /mulțum/i, "Mulțumesc pentru timpul acordat și rămân disponibil pentru clarificări."),
      direct: appendIfMissing(body, /vă rog să confirmați|te rog să confirmi/i, "Dacă subiectul este încă relevant, vă rog să confirmați și stabilim împreună următorul pas.")
    }
  };
}

export function validateFollowUpDraftFields(subject: string, body: string) {
  const normalizedSubject = subject.trim().replace(/[\r\n]+/g, " ").slice(0, 160);
  const normalizedBody = body.trim().slice(0, 4000);
  const assessment = assessFollowUpDraft({ subject: normalizedSubject, body: normalizedBody });
  if (!assessment.canApprove) return { ok: false as const, error: "Draftul necesită un subiect clar, un mesaj complet și formulări comerciale sigure." };
  return { ok: true as const, subject: normalizedSubject, body: normalizedBody };
}