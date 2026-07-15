export type PersistedRecoverabilityInsights = {
  detectedCommercialIntent: string | null;
  relationshipContext: string | null;
  scoreFactors: string[];
  riskNotes: string[];
  uncertaintyNotes: string[];
  humanReviewChecklist: string[];
  alternativeDraftAngle: string | null;
};

const tags = {
  intent: "INTENȚIE: ",
  relationship: "RELAȚIE: ",
  score: "SCOR: ",
  risk: "RISC: ",
  uncertainty: "INCERTITUDINE: ",
  checklist: "VERIFICĂ: ",
  alternative: "ALTERNATIVĂ: "
} as const;

export function packRecoverabilityInsights(insights: PersistedRecoverabilityInsights) {
  return [
    insights.detectedCommercialIntent ? `${tags.intent}${insights.detectedCommercialIntent}` : "",
    insights.relationshipContext ? `${tags.relationship}${insights.relationshipContext}` : "",
    ...insights.scoreFactors.map((item) => `${tags.score}${item}`),
    ...insights.riskNotes.map((item) => `${tags.risk}${item}`),
    ...insights.uncertaintyNotes.map((item) => `${tags.uncertainty}${item}`),
    ...insights.humanReviewChecklist.map((item) => `${tags.checklist}${item}`),
    insights.alternativeDraftAngle ? `${tags.alternative}${insights.alternativeDraftAngle}` : ""
  ].filter(Boolean);
}

export function unpackRecoverabilityInsights(notes: string[]): PersistedRecoverabilityInsights {
  const result: PersistedRecoverabilityInsights = {
    detectedCommercialIntent: null,
    relationshipContext: null,
    scoreFactors: [],
    riskNotes: [],
    uncertaintyNotes: [],
    humanReviewChecklist: [],
    alternativeDraftAngle: null
  };
  for (const note of notes) {
    if (note.startsWith(tags.intent)) result.detectedCommercialIntent = note.slice(tags.intent.length);
    else if (note.startsWith(tags.relationship)) result.relationshipContext = note.slice(tags.relationship.length);
    else if (note.startsWith(tags.score)) result.scoreFactors.push(note.slice(tags.score.length));
    else if (note.startsWith(tags.risk)) result.riskNotes.push(note.slice(tags.risk.length));
    else if (note.startsWith(tags.uncertainty)) result.uncertaintyNotes.push(note.slice(tags.uncertainty.length));
    else if (note.startsWith(tags.checklist)) result.humanReviewChecklist.push(note.slice(tags.checklist.length));
    else if (note.startsWith(tags.alternative)) result.alternativeDraftAngle = note.slice(tags.alternative.length);
    else result.uncertaintyNotes.push(note);
  }
  return result;
}

export function formatRecoveryDraft(subject: string, body: string) {
  const cleanSubject = subject.trim().replace(/[\r\n]+/g, " ").slice(0, 160);
  const cleanBody = body.trim().slice(0, 4000);
  return [cleanSubject ? `Subiect: ${cleanSubject}` : "", cleanBody].filter(Boolean).join("\n\n");
}

export function parseRecoveryDraft(value?: string | null) {
  const draft = value?.trim() ?? "";
  const match = draft.match(/^Subiect:\s*([^\r\n]+)\r?\n\r?\n([\s\S]*)$/i);
  return match ? { subject: match[1].trim(), body: match[2].trim() } : { subject: "", body: draft };
}