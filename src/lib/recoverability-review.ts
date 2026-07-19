export type PersistedRecoverabilityInsights = {
  detectedCommercialIntent: string | null;
  relationshipContext: string | null;
  scoreFactors: string[];
  riskNotes: string[];
  uncertaintyNotes: string[];
  humanReviewChecklist: string[];
  alternativeDraftAngle: string | null;
  signalType?: string | null;
  signalTypeLabel?: string | null;
  deadlineClue?: string | null;
  valueClue?: string | null;
  contextHints?: string[];
  detectionReasons?: string[];
};

const tags = {
  intent: "INTENȚIE: ",
  relationship: "RELAȚIE: ",
  score: "SCOR: ",
  risk: "RISC: ",
  uncertainty: "INCERTITUDINE: ",
  checklist: "VERIFICĂ: ",
  alternative: "ALTERNATIVĂ: ",
  signalType: "SIGNAL_TYPE: ",
  signalTypeLabel: "SIGNAL_TYPE_LABEL: ",
  deadlineClue: "DEADLINE_CLUE: ",
  valueClue: "VALUE_CLUE: ",
  contextHint: "CONTEXT_HINT: ",
  detectionReason: "DETECTION_REASON: "
} as const;

export function packRecoverabilityInsights(insights: PersistedRecoverabilityInsights) {
  return [
    insights.detectedCommercialIntent ? `${tags.intent}${insights.detectedCommercialIntent}` : "",
    insights.relationshipContext ? `${tags.relationship}${insights.relationshipContext}` : "",
    ...insights.scoreFactors.map((item) => `${tags.score}${item}`),
    ...insights.riskNotes.map((item) => `${tags.risk}${item}`),
    ...insights.uncertaintyNotes.map((item) => `${tags.uncertainty}${item}`),
    ...insights.humanReviewChecklist.map((item) => `${tags.checklist}${item}`),
    insights.alternativeDraftAngle ? `${tags.alternative}${insights.alternativeDraftAngle}` : "",
    insights.signalType ? `${tags.signalType}${insights.signalType}` : "",
    insights.signalTypeLabel ? `${tags.signalTypeLabel}${insights.signalTypeLabel}` : "",
    ...(insights.contextHints ?? []).map((item) => `${tags.contextHint}${item}`),
    ...(insights.detectionReasons ?? []).map((item) => `${tags.detectionReason}${item}`),
    insights.deadlineClue ? `${tags.deadlineClue}${insights.deadlineClue}` : "",
    insights.valueClue ? `${tags.valueClue}${insights.valueClue}` : ""
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
    alternativeDraftAngle: null,
    signalType: null,
    signalTypeLabel: null,
    deadlineClue: null,
    valueClue: null,
    contextHints: [],
    detectionReasons: []
  };
  for (const note of notes) {
    if (note.startsWith(tags.intent)) result.detectedCommercialIntent = note.slice(tags.intent.length);
    else if (note.startsWith(tags.relationship)) result.relationshipContext = note.slice(tags.relationship.length);
    else if (note.startsWith(tags.score)) result.scoreFactors.push(note.slice(tags.score.length));
    else if (note.startsWith(tags.risk)) result.riskNotes.push(note.slice(tags.risk.length));
    else if (note.startsWith(tags.uncertainty)) result.uncertaintyNotes.push(note.slice(tags.uncertainty.length));
    else if (note.startsWith(tags.checklist)) result.humanReviewChecklist.push(note.slice(tags.checklist.length));
    else if (note.startsWith(tags.alternative)) result.alternativeDraftAngle = note.slice(tags.alternative.length);
    else if (note.startsWith(tags.signalType)) result.signalType = note.slice(tags.signalType.length);
    else if (note.startsWith(tags.signalTypeLabel)) result.signalTypeLabel = note.slice(tags.signalTypeLabel.length);
    else if (note.startsWith(tags.deadlineClue)) result.deadlineClue = note.slice(tags.deadlineClue.length);
    else if (note.startsWith(tags.valueClue)) result.valueClue = note.slice(tags.valueClue.length);
    else if (note.startsWith(tags.contextHint)) result.contextHints?.push(note.slice(tags.contextHint.length));
    else if (note.startsWith(tags.detectionReason)) result.detectionReasons?.push(note.slice(tags.detectionReason.length));
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
