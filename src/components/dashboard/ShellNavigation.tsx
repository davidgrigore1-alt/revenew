"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavigationIcon } from "@/components/dashboard/NavigationIcon";
import { cn } from "@/lib/utils";
import { groupNavigationItems, isNavItemActive, type NavigationItem } from "@/lib/navigation";

type ShellNavigationProps = {
  items: NavigationItem[];
  onNavigate?: () => void;
  variant?: "sidebar" | "drawer";
};

export function ShellNavigation({ items, onNavigate, variant = "sidebar" }: ShellNavigationProps) {
  const pathname = usePathname();
  const groups = groupNavigationItems(items);

  return (
    <nav aria-label="Navigare principală" className={cn("flex h-full flex-col", variant === "sidebar" ? "gap-4" : "gap-5")}>
      {groups.map((group) => (
        <div key={group.id} className={cn(group.id === "utility" && variant === "sidebar" && "mt-auto border-t border-[rgb(var(--border))] pt-4")}>
          <p className="px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-faint))]">{group.label}</p>
          <div className="mt-1.5 grid gap-0.5">
            {group.items.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring group flex min-h-9 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors duration-fast",
                    active
                      ? "bg-[rgb(var(--brand-50))] text-[rgb(var(--brand-800))] shadow-[inset_2px_0_0_rgb(var(--primary))] dark:bg-[rgb(var(--brand-950))] dark:text-[rgb(var(--brand-300))]"
                      : "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]"
                  )}
                >
                  <NavigationIcon name={item.icon} className={cn("h-[18px] w-[18px] shrink-0", active ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--text-faint))] group-hover:text-[rgb(var(--text-secondary))]")} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
