import { AppShell } from "@/components/dashboard/AppShell";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import type { Metadata } from "next";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";
import { AuthorizationError } from "@/lib/authz/authorization-errors";
import { primaryNavigation, utilityNavigation } from "@/lib/navigation";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function ProtectedLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const paidAccess = await requireActivePaidAccess();
  const currentBusiness = paidAccess.currentBusiness;
  const authorization = await getAuthorizationContext();

  if (!hasPermission(authorization, "workspace.read")) {
    throw new AuthorizationError("Nu ai acces la acest spațiu de lucru.");
  }

  const primaryItems = primaryNavigation.filter((item) => hasPermission(authorization, item.permission));
  const utilityItems = utilityNavigation.filter((item) => hasPermission(authorization, item.permission));

  return (
    <AppShell
      businessName={currentBusiness?.business.name}
      userEmail={currentBusiness?.authUserEmail}
      userName={currentBusiness?.profileName}
      isDemo={currentBusiness?.source === "demo"}
      primaryItems={primaryItems}
      utilityItems={utilityItems}
    >
      {children}
    </AppShell>
  );
}
