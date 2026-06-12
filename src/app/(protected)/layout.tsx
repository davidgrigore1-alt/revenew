import { AppShell } from "@/components/dashboard/AppShell";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { requireUserIfSupabase } from "@/lib/supabase/data";

export default async function ProtectedLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireUserIfSupabase();
  const currentBusiness = await getCurrentBusinessForUser({ redirectIfMissing: true });

  return (
    <AppShell businessName={currentBusiness?.business.name} isDemo={currentBusiness?.source === "demo"}>
      {children}
    </AppShell>
  );
}
