import { NextResponse } from "next/server";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { requirePermission } from "@/lib/authz/require-permission";
import { decryptGoogleRefreshCredential } from "@/lib/google-workspace/crypto";
import { revokeGoogleCredential } from "@/lib/google-workspace/oauth";
import { disconnectOwnedGoogleConnection, getOwnedGoogleConnection, requireGoogleConnectorActor } from "@/lib/google-workspace/repository";
import { isTrustedMutationRequest } from "@/lib/google-workspace/security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return NextResponse.json({ error: "Cererea nu este autorizată." }, { status: 403 });
  await requireActivePaidAccess();
  await requirePermission("workspace.read");
  const actor = await requireGoogleConnectorActor();
  const connection = await getOwnedGoogleConnection(actor);
  if (!connection) return NextResponse.json({ ok: true });
  if (connection.encrypted_refresh_credential) {
    try {
      const credential = decryptGoogleRefreshCredential(connection.encrypted_refresh_credential);
      await revokeGoogleCredential(credential);
    } catch {
      // Local invalidation and deletion still proceed; no usable credential remains in ReveNew.
    }
  }
  await disconnectOwnedGoogleConnection(actor, connection);
  return NextResponse.json({ ok: true });
}
