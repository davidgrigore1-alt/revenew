import "server-only";
import { Buffer } from "node:buffer";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { CopilotPageContext } from "./copilot-types";
import { normalizeIntelligenceText } from "./intelligence-evidence";

export type AnalysisIntent = {
  query: string;
  operation: "general" | "sum" | "top" | "missing" | "count" | "comparison" | "report";
  city?: string;
  currency?: string;
  historical?: boolean;
  selectedCandidateId?: string;
  comparisonRowId?: string;
};
export type AnalysisContinuation = {
  version: 1; actorId: string; businessId: string; scope: string; issuedAt: number;
  answerId: string; intent: AnalysisIntent; offeredCandidateIds: string[];
  evidenceIds: string[];
};
// Ephemeral process key: restart invalidates analysis continuity, never permissions.
// No credentials, source bodies, assistant prose, database rows or new cache store.
const signingKey = randomBytes(32);
export function analysisScope(context: CopilotPageContext) {
  return JSON.stringify([context.organizationId ?? null, context.contactId ?? null, context.opportunityId ?? null,
    context.documentSourceId ?? null, context.documentVersionId ?? null, context.documentComparisonScope ?? null]);
}
export function signAnalysisState(state: AnalysisContinuation, key = signingKey) {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${createHmac("sha256", key).update(`revenew.analysis.v1:${payload}`).digest("base64url")}`;
}
export function readAnalysisState(token: string, actor: {actorId:string;businessId:string}, context:CopilotPageContext, now=Date.now(), key=signingKey): AnalysisContinuation {
  if(token.length>12000)throw new Error("analysis_context_invalid");
  const [payload, signature, ...extra]=token.split(".");
  const expected=createHmac("sha256",key).update(`revenew.analysis.v1:${payload}`).digest();
  const supplied=Buffer.from(signature??"","base64url");
  if(extra.length||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))throw new Error("analysis_context_invalid");
  const state=JSON.parse(Buffer.from(payload,"base64url").toString("utf8")) as AnalysisContinuation;
  if(state.version!==1||state.actorId!==actor.actorId||state.businessId!==actor.businessId||state.scope!==analysisScope(context)||!Number.isFinite(state.issuedAt)||state.issuedAt>now||now-state.issuedAt>30*60*1000)throw new Error("analysis_context_expired");
  return state;
}
export function resolveAnalysisIntent(question:string, previous?:AnalysisIntent):AnalysisIntent {
  const q=normalizeIntelligenceText(question);
  const followUp=/^(si\b|doar\b|numai\b|de ce\b|dar\b|compara cu\b|care dintre\b|pe aceasta\b)/.test(q);
  const intent:AnalysisIntent=followUp&&previous?{...previous}:{query:question.slice(0,1000),operation:"general"};
  if(/suma|total|sum\b/.test(q))intent.operation="sum";
  else if(/top\s*\d|mai mari|largest/.test(q))intent.operation="top";
  else if(/(?:fara|nu au|missing).*(?:actiune|next action|pas)/.test(q))intent.operation="missing";
  else if(/cate randuri|count.*row|numar.*rand/.test(q))intent.operation="count";
  else if(/compar|conflict|contraz|difer|mai nou/.test(q))intent.operation="comparison";
  else if(/raport|revizuirea comerciala|executia echipei/.test(q))intent.operation="report";
  const city=question.match(new RegExp(String.raw`(?:din|în|in)\s+([\p{L}][\p{L} -]{1,45}?)(?=[?.!,;]|\s+(?:și|si|în|in|doar|numai)\b|$)`,"iu"))?.[1]?.trim();
  if(city&&!/^(EUR|RON|USD|GBP|CHF)$/i.test(city)&&/doar|numai/.test(q))intent.city=city;
  const currency=question.toUpperCase().match(/\b(EUR|RON|USD|GBP|CHF)\b/)?.[1];
  if(currency&&/doar|numai|only/.test(q))intent.currency=currency;
  if(/toate monedele|orice moneda/.test(q))delete intent.currency;
  if(/toate orasele|orice oras/.test(q))delete intent.city;
  intent.historical=/luna trecuta|last month|istoric|versiunea anterioara/.test(q);
  return intent;
}
