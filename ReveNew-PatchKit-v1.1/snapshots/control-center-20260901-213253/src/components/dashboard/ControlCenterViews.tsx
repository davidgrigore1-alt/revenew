import Link from "next/link";

const views = [
  ["now", "Acum", "/dashboard"],
  ["executive", "Brief executiv", "/dashboard?view=executive"],
  ["review", "Revizuire comercială", "/dashboard?view=review"],
] as const;

export function ControlCenterViews({
  active,
}: {
  active: "now" | "executive" | "review";
}) {
  return (
    <nav
      aria-label="Vederi Control Center"
      className="flex min-h-12 flex-wrap items-end gap-5 border-b border-[rgb(var(--border-subtle))]"
    >
      {views.map(([id, label, href]) => (
        <Link
          key={id}
          href={href}
          aria-current={active === id ? "page" : undefined}
          className="focus-ring inline-flex h-10 items-center border-b-2 border-transparent px-0.5 text-label font-medium text-[rgb(var(--text-muted))] transition-colors duration-fast hover:text-[rgb(var(--foreground))] aria-[current=page]:border-[rgb(var(--interaction))] aria-[current=page]:text-[rgb(var(--foreground))]"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
