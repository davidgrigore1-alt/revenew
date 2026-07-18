import Link from "next/link";
import { ClockIcon } from "@heroicons/react/20/solid";

export type ActivityFeedItem = {
  id: string;
  title: string;
  detail?: string;
  timestamp: string;
  href?: string;
};

export function ActivityFeed({ items, empty }: { items: ActivityFeedItem[]; empty: React.ReactNode }) {
  if (items.length === 0) return <>{empty}</>;

  return (
    <ol className="divide-y divide-[rgb(var(--border))]">
      {items.map((item) => {
        const content = (
          <div className="flex min-w-0 gap-3 py-3.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] text-[rgb(var(--text-muted))]">
              <ClockIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium leading-5 text-[rgb(var(--foreground))]">{item.title}</span>
              {item.detail ? <span className="mt-1 block truncate text-xs text-[rgb(var(--text-muted))]">{item.detail}</span> : null}
            </span>
            <time className="shrink-0 pt-0.5 text-xs text-[rgb(var(--text-faint))]">{item.timestamp}</time>
          </div>
        );

        return <li key={item.id}>{item.href ? <Link href={item.href} className="focus-ring block rounded-control px-1 transition-colors duration-fast hover:bg-[rgb(var(--surface-muted)/0.6)]">{content}</Link> : content}</li>;
      })}
    </ol>
  );
}
