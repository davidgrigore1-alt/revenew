import { NextResponse } from "next/server";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";
import { loadAdminInsights, resolveAdminDateRange } from "@/lib/admin/insights";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const authorization = await getAuthorizationContext();
  if (!hasPermission(authorization, "platform.usage.read_all")) {
    return NextResponse.json({ error: "Nu ai permisiunea necesară pentru export." }, { status: 403 });
  }

  const url = new URL(request.url);
  const range = resolveAdminDateRange(url.searchParams.get("range") ?? undefined);
  const insights = await loadAdminInsights(range);

  const businessById = new Map(insights.businesses.map((business) => [business.id, business.name]));
  const rows = [
    ["timestamp", "business", "feature", "provider", "model", "status", "input_tokens", "output_tokens", "total_tokens", "estimated_cost_micros", "error_category"],
    ...insights.usageEvents.map((event) => [
      event.createdAt,
      event.businessId ? businessById.get(event.businessId) ?? "Unknown business" : "Missing business_id",
      event.featureId,
      event.provider ?? "",
      event.model ?? "",
      event.status,
      event.promptTokens,
      event.completionTokens,
      event.totalTokens,
      event.estimatedCostMicros,
      event.errorReason ?? ""
    ])
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="revenew-usage-${range.key}.csv"`
    }
  });
}
