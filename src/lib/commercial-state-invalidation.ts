import "server-only";
import { revalidatePath } from "next/cache";
/** After the authorized write and its existing audit recording, invalidate affected projections only. */
export function revalidateCommercialState(opportunityId?: string | null) {
  for (const route of ["/opportunities", "/dashboard", "/recoverable", "/pipeline", "/today", "/ai", "/approvals"]) revalidatePath(route);
  if (opportunityId) revalidatePath("/opportunities/" + opportunityId);
}
