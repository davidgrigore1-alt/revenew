import "server-only";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProductEventName =
  | "onboarding_started"
  | "workspace_setup_completed"
  | "first_company_created"
  | "first_contact_created"
  | "first_opportunity_created"
  | "first_owner_assigned"
  | "first_next_action_created"
  | "first_opportunity_reviewed"
  | "csv_import_started"
  | "csv_import_completed"
  | "global_search_used"
  | "saved_view_created";

const allowedMetadataKeys = new Set(["entity_type", "result_group", "target_page", "entry_mode", "created", "skipped", "rejected"]);

export async function recordProductEvent(
  eventName: ProductEventName,
  options: { businessId?: string | null; metadata?: Record<string, string | number | boolean | null> } = {}
) {
  try {
    const [authorization, supabase] = await Promise.all([
      getAuthorizationContext(),
      Promise.resolve(createSupabaseServerClient())
    ]);
    if (!authorization.userId || !supabase) return;

    const metadata = Object.fromEntries(
      Object.entries(options.metadata ?? {}).filter(([key]) => allowedMetadataKeys.has(key))
    );
    const { error } = await supabase.from("product_events").insert({
      user_id: authorization.userId,
      business_id: options.businessId ?? null,
      event_name: eventName,
      metadata
    });
    if (error) console.warn("product_event_record_failed", { code: error.code, eventName });
  } catch {
    // Product analytics must never block a customer workflow.
  }
}
