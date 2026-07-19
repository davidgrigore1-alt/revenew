import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Navigare contextuală" className="mb-3 min-w-0">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[rgb(var(--text-muted))]">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
              {index > 0 ? <span aria-hidden="true" className="text-[rgb(var(--text-faint))]">/</span> : null}
              {item.href && !current ? (
                <Link href={item.href} className="focus-ring rounded-button hover:text-[rgb(var(--foreground))] hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={current ? "page" : undefined} className={current ? "max-w-[18rem] truncate text-[rgb(var(--text-secondary))]" : undefined} title={current ? item.label : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
