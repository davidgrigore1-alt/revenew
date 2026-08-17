export default function DashboardLoading() {
  return (
    <main className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
      <section aria-label="Se încarcă briefingul executiv" className="animate-pulse rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card sm:p-6">
        <div className="h-4 w-32 rounded bg-[rgb(var(--surface-muted))]" />
        <div className="mt-3 h-7 w-full max-w-xl rounded bg-[rgb(var(--surface-muted))]" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded bg-[rgb(var(--surface-subtle))]" />
        <div className="mt-6 grid gap-5 border-t border-[rgb(var(--border))] pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.34fr)]">
          <div className="grid gap-3">
            <div className="h-5 w-24 rounded bg-[rgb(var(--surface-muted))]" />
            <div className="h-6 w-3/4 rounded bg-[rgb(var(--surface-muted))]" />
            <div className="h-4 w-full rounded bg-[rgb(var(--surface-subtle))]" />
          </div>
          <div className="h-32 rounded-card bg-[rgb(var(--surface-subtle))]" />
        </div>
      </section>
    </main>
  );
}
