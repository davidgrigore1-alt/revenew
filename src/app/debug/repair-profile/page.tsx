import { notFound } from "next/navigation";
import { DataCard } from "@/components/dashboard/DataCard";
import { PageShell } from "@/components/dashboard/PageShell";
import { repairCurrentProfile } from "@/lib/auth/actions";

export const dynamic = "force-dynamic";

export default async function RepairProfilePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const result = await repairCurrentProfile();

  return (
    <PageShell eyebrow="Debug" title="Repair profile" description="Creează profilul lipsă pentru userul autentificat. Doar development.">
      <DataCard title={result.ok ? "Profil reparat" : "Repair eșuat"}>
        <dl className="grid gap-3 text-sm">
          {Object.entries(result).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-4 border-b border-white/10 pb-3">
              <dt className="text-zinc-500">{key}</dt>
              <dd className="max-w-xl break-words text-right font-semibold text-white">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </DataCard>
    </PageShell>
  );
}
