import Link from "next/link";

type RecordTab = { id: string; label: string };

export function RecordTabs({ tabs, activeTab, label }: { tabs: readonly RecordTab[]; activeTab: string; label: string }) {
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto border-b border-[rgb(var(--border-strong))] px-1">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`?tab=${tab.id}`}
            aria-current={activeTab === tab.id ? "page" : undefined}
            className="focus-ring relative inline-flex min-h-10 items-center whitespace-nowrap rounded-t-control px-3 text-label font-medium text-[rgb(var(--text-muted))] transition-colors hover:bg-[rgb(var(--surface-subtle))] hover:text-[rgb(var(--foreground))] aria-[current=page]:bg-[rgb(var(--surface))] aria-[current=page]:text-[rgb(var(--foreground))] aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-2 aria-[current=page]:after:bottom-0 aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-[rgb(var(--selection))]"
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
