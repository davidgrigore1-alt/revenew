import "server-only";
import { getCurrentBusinessOrDemo } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export type FollowUpWorkspaceSummary = {
  awaitingReview: number;
  approvedNotSent: number;
  dueFollowUps: number;
  testModeAttempts: number;
  realDeliveries: number;
  failedAttempts: number;
};

const emptySummary: FollowUpWorkspaceSummary = { awaitingReview: 0, approvedNotSent: 0, dueFollowUps: 0, testModeAttempts: 0, realDeliveries: 0, failedAttempts: 0 };
const messageTypes = ["outreach_email", "follow_up_email", "linkedin_message", "whatsapp_message"];

export async function getFollowUpWorkspaceSummary(): Promise<FollowUpWorkspaceSummary> {
  if (!isSupabaseConfigured) return emptySummary;
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const supabase = createSupabaseServerClient();
  if (!business || !supabase) return emptySummary;
  const now = new Date().toISOString();
  const [review, approved, due, testAttempts, delivered, failed] = await Promise.all([
    supabase.from("opportunity_documents").select("id", { count: "exact", head: true }).eq("business_id", business.id).in("document_type", messageTypes).in("status", ["placeholder", "draft", "edited", "copied"]),
    supabase.from("opportunity_documents").select("id", { count: "exact", head: true }).eq("business_id", business.id).in("document_type", messageTypes).in("status", ["approved", "ready_to_send"]).not("approved_content_fingerprint", "is", null).neq("send_status", "sent"),
    supabase.from("opportunity_actions").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("type", "follow_up").eq("status", "pending").lte("due_at", now),
    supabase.from("opportunity_documents").select("id", { count: "exact", head: true }).eq("business_id", business.id).in("document_type", messageTypes).eq("sending_mode", "test").gt("send_attempt_count", 0),
    supabase.from("opportunity_documents").select("id", { count: "exact", head: true }).eq("business_id", business.id).in("document_type", messageTypes).eq("send_status", "sent").eq("sending_mode", "live"),
    supabase.from("opportunity_documents").select("id", { count: "exact", head: true }).eq("business_id", business.id).in("document_type", messageTypes).eq("send_status", "failed")
  ]);
  const error = review.error ?? approved.error ?? due.error ?? testAttempts.error ?? delivered.error ?? failed.error;
  if (error) throw new Error(`Follow-up summary load error: ${error.message}`);
  return {
    awaitingReview: review.count ?? 0,
    approvedNotSent: approved.count ?? 0,
    dueFollowUps: due.count ?? 0,
    testModeAttempts: testAttempts.count ?? 0,
    realDeliveries: delivered.count ?? 0,
    failedAttempts: failed.count ?? 0
  };
}
