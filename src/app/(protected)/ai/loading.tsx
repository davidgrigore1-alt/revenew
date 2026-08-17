import { Skeleton } from "@/components/ui/Skeleton";

export default function IntelligenceLoading() {
  return (
    <div className="grid gap-6" aria-label="Se încarcă inteligența operațională">
      <Skeleton className="h-72 rounded-panel" />
      <section className="rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 sm:p-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-3 h-7 w-full max-w-lg" />
        <div className="mt-6 grid gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      </section>
    </div>
  );
}
