import "server-only";

import type { Actor } from "@/lib/google-workspace/repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SequenceExitReason = "reply_received" | "meeting_booked" | "opportunity_closed" | "manual";

export function evaluateSequenceExit(input: {
  replyReceived: boolean;
  meetingBooked: boolean;
  opportunityClosed: boolean;
  manualExit?: boolean;
}): SequenceExitReason | null {
  if (input.manualExit) return "manual";
  if (input.replyReceived) return "reply_received";
  if (input.meetingBooked) return "meeting_booked";
  if (input.opportunityClosed) return "opportunity_closed";
  return null;
}

export async function reconcileSequenceExits(actor: Actor) {
  const admin = createSupabaseAdminClient();
  if (!admin) return { exited: 0 };
  const { data: enrollments, error } = await admin.from("sequence_enrollments")
    .select("id,sequence_id,opportunity_id,owner_profile_id,enrolled_at")
    .eq("business_id", actor.businessId).eq("status", "active")
    .not("opportunity_id", "is", null).limit(200);
  if (error || !enrollments?.length) return { exited: 0 };

  const opportunityIds = Array.from(new Set(enrollments.flatMap((item) => item.opportunity_id ? [item.opportunity_id] : [])));
  const earliestEnrollment = enrollments.map((item) => item.enrolled_at).sort()[0];
  const [opportunities, replies, meetings] = await Promise.all([
    admin.from("opportunities").select("id,status,lifecycle_status").eq("business_id", actor.businessId).in("id", opportunityIds),
    admin.from("external_email_messages").select("id,linked_opportunity_id,sent_at").eq("business_id", actor.businessId)
      .eq("owner_profile_id", actor.profileId).eq("direction", "inbound").in("linked_opportunity_id", opportunityIds)
      .gte("sent_at", earliestEnrollment),
    admin.from("external_calendar_events").select("id,linked_opportunity_id,starts_at").eq("business_id", actor.businessId)
      .eq("owner_profile_id", actor.profileId).neq("event_status", "cancelled").in("linked_opportunity_id", opportunityIds)
      .gte("starts_at", earliestEnrollment)
  ]);
  if (opportunities.error || replies.error || meetings.error) return { exited: 0 };

  const opportunityById = new Map((opportunities.data ?? []).map((item) => [item.id, item]));
  let exited = 0;
  for (const enrollment of enrollments) {
    if (!enrollment.opportunity_id) continue;
    const opportunity = opportunityById.get(enrollment.opportunity_id);
    const closed = Boolean(opportunity && (
      ["won", "lost", "closed"].includes(String(opportunity.lifecycle_status ?? "").toLowerCase())
      || ["won", "lost", "closed"].includes(String(opportunity.status ?? "").toLowerCase())
    ));
    const reply = (replies.data ?? []).some((item) => item.linked_opportunity_id === enrollment.opportunity_id && item.sent_at > enrollment.enrolled_at);
    const meeting = (meetings.data ?? []).some((item) => item.linked_opportunity_id === enrollment.opportunity_id && item.starts_at > enrollment.enrolled_at);
    const reason = evaluateSequenceExit({ replyReceived: reply, meetingBooked: meeting, opportunityClosed: closed });
    if (!reason) continue;
    const now = new Date().toISOString();
    const { data: updated } = await admin.from("sequence_enrollments").update({
      status: "exited", exit_reason: reason, exited_at: now, next_step_at: null, updated_at: now
    }).eq("id", enrollment.id).eq("business_id", actor.businessId).eq("status", "active").select("id").maybeSingle();
    if (!updated) continue;
    exited += 1;
    await Promise.all([
      admin.from("communication_notifications").insert({
        business_id: actor.businessId,
        recipient_profile_id: enrollment.owner_profile_id,
        kind: reason === "reply_received" ? "reply_received" : "sequence_exit",
        title: reason === "reply_received" ? "Răspuns primit · secvență oprită" : reason === "meeting_booked" ? "Secvență oprită: întâlnire programată" : "Secvență oprită: oportunitate închisă",
        body: "Pașii următori au fost opriți înainte de a pregăti alt mesaj.",
        href: "/sequences"
      }),
      admin.from("audit_logs").insert({
        business_id: actor.businessId,
        profile_id: actor.profileId,
        action: "sequence_enrollment_exited",
        entity_type: "outreach_sequence",
        entity_id: enrollment.sequence_id,
        metadata: { enrollment_id: enrollment.id, opportunity_id: enrollment.opportunity_id, exit_reason: reason }
      })
    ]);
  }
  return { exited };
}