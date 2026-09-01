import { IntegrationHub } from "@/components/apps/IntegrationHub";
import { getGoogleWorkspacePublicState } from "@/lib/google-workspace/repository";
import { requirePermission } from "@/lib/authz/require-permission";

export const dynamic = "force-dynamic";

export default async function AppsPage(props: { searchParams?: Promise<{ google?: string }> }) {
  const searchParams = await props.searchParams;
  await requirePermission("workspace.read");
  const state = await getGoogleWorkspacePublicState();

  return (
    <IntegrationHub
      state={state}
      notice={searchParams?.google ?? null}
    />
  );
}
