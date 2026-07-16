import "server-only";
import { countsAsReceivedResponse, isPositiveResponse, type CommercialResponseCategory } from "@/lib/commercial-response";
import { getCurrentBusinessOrDemo } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export type CommercialResponseSummary = {
  responsesReceived: number; positiveResponses: number; meetings: number; proposals: number;
  awaitingResponse: number; noResponse: number; won: number; lost: number;
  confirmedRevenueRon: number; responseRate: number | null;
};

const empty: CommercialResponseSummary = { responsesReceived: 0, positiveResponses: 0, meetings: 0, proposals: 0, awaitingResponse: 0, noResponse: 0, won: 0, lost: 0, confirmedRevenueRon: 0, responseRate: null };

export async function getCommercialResponseSummary(): Promise<CommercialResponseSummary> {
  if (!isSupabaseConfigured) return empty;
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const supabase = createSupabaseServerClient();
  if (!business || !supabase) return empty;
  const [responsesResult, opportunitiesResult, documentsResult] = await Promise.all([
    supabase.from("commercial_responses").select("opportunity_id,response_category,milestone,responded_at").eq("business_id", business.id).order("responded_at", { ascending: false }).limit(1000),
    supabase.from("opportunities").select("id,lifecycle_status,actual_outcome_amount,currency").eq("business_id", business.id).limit(500),
    supabase.from("opportunity_documents").select("opportunity_id,send_status,sending_mode").eq("business_id", business.id).eq("send_status", "sent").eq("sending_mode", "live").limit(500)
  ]);
  const error = responsesResult.error ?? opportunitiesResult.error ?? documentsResult.error;
  if (error) throw new Error(`Commercial response summary load error: ${error.message}`);
  const responses = responsesResult.data ?? [];
  const opportunities = opportunitiesResult.data ?? [];
  const received = responses.filter((row) => countsAsReceivedResponse(row.response_category as CommercialResponseCategory));
  const respondedOpportunityIds = new Set(responses.map((row) => row.opportunity_id));
  const liveSentOpportunityIds = new Set((documentsResult.data ?? []).map((row) => row.opportunity_id));
  const denominator = new Set(responses.map((row) => row.opportunity_id)).size;
  const receivedOpportunities = new Set(received.map((row) => row.opportunity_id)).size;
  return {
    responsesReceived: received.length,
    positiveResponses: responses.filter((row) => isPositiveResponse(row.response_category as CommercialResponseCategory)).length,
    meetings: responses.filter((row) => row.response_category === "meeting_requested" || row.milestone === "meeting_scheduled").length,
    proposals: responses.filter((row) => row.milestone === "proposal_requested" || row.milestone === "proposal_sent").length,
    awaitingResponse: Array.from(liveSentOpportunityIds).filter((id) => !respondedOpportunityIds.has(id)).length,
    noResponse: new Set(responses.filter((row) => row.response_category === "no_response").map((row) => row.opportunity_id)).size,
    won: opportunities.filter((row) => row.lifecycle_status === "won").length,
    lost: opportunities.filter((row) => row.lifecycle_status === "lost").length,
    confirmedRevenueRon: opportunities.filter((row) => row.lifecycle_status === "won" && row.currency === "RON").reduce((sum, row) => sum + Number(row.actual_outcome_amount ?? 0), 0),
    responseRate: denominator ? Math.round((receivedOpportunities / denominator) * 100) : null
  };
}
