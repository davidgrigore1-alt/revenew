import { NextResponse } from "next/server";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { requirePermission } from "@/lib/authz/require-permission";
import { isTrustedMutationRequest } from "@/lib/google-workspace/security";
import { syncOwnedGoogleWorkspace } from "@/lib/google-workspace/sync";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return NextResponse.json({ error: "Cererea nu este autorizată." }, { status: 403 });
  await requireActivePaidAccess();
  await requirePermission("workspace.read");
  try {
    const result = await syncOwnedGoogleWorkspace();
    return NextResponse.json({ ok: result.status !== "failed", ...result }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "provider_temporary_error";
    if (code === "sync_already_running") return NextResponse.json({ error: "O sincronizare este deja în curs." }, { status: 409, headers: { "Cache-Control": "no-store, private" } });
    return NextResponse.json({ error: code === "authorization_revoked" ? "Accesul Google trebuie reautorizat." : "Sincronizarea nu a putut fi finalizată." }, { status: code === "authorization_revoked" ? 401 : 503 });
  }
}
