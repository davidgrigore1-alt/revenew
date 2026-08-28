import { requirePermission } from "@/lib/authz/require-permission";
import { getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";
import { preparedWorkForOpportunity, type PreparedWorkItem, type PreparedWorkStatus } from "@/lib/prepared-work";

const activeStatuses = new Set<PreparedWorkStatus>(["prepared", "ready_for_review", "approved"]);

export type PreparedWorkRegistry = {
  items: PreparedWorkItem[];
  counts: Record<"review" | "prepared" | "approved", number>;
};

export async function getPreparedWorkRegistry(): Promise<PreparedWorkRegistry> {
  await requirePermission("documents.read");
  const opportunities = await getOpportunitiesForCurrentBusiness();
  const items = opportunities
    .flatMap(preparedWorkForOpportunity)
    .filter((item) => activeStatuses.has(item.status))
    .sort((left, right) => {
      const rank = (status: PreparedWorkStatus) => status === "ready_for_review" ? 0 : status === "prepared" ? 1 : 2;
      return rank(left.status) - rank(right.status) || left.title.localeCompare(right.title, "ro");
    });

  return {
    items,
    counts: {
      review: items.filter((item) => item.status === "ready_for_review").length,
      prepared: items.filter((item) => item.status === "prepared").length,
      approved: items.filter((item) => item.status === "approved").length
    }
  };
}