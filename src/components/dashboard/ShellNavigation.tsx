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
  ariaLabel?: string;
};

export function ShellNavigation({ items, onNavigate, variant = "sidebar", ariaLabel = "Navigare principală" }: ShellNavigationProps) {
  const pathname = usePathname();
  const groups = groupNavigationItems(items);

  return (
    <nav aria-label={ariaLabel} className={cn("flex flex-col", variant === "sidebar" ? "gap-0.5" : "h-full gap-5")}>
      {groups.map((group) => (
        <div key={group.id} className={cn(group.id === "utility" && variant === "sidebar" && "mt-0.5 border-t border-[rgb(var(--border))] pt-1.5")}>
          <p className={cn("px-2.5 font-semibold uppercase text-[rgb(var(--text-faint))]", variant === "sidebar" ? "text-[0.625rem] leading-3 tracking-[0.1em]" : "text-[0.6875rem] tracking-[0.12em]")}>{group.label}</p>
          <div className={cn("grid", variant === "sidebar" ? "mt-0.5 gap-0" : "mt-1.5 gap-0.5")}>
            {group.items.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring group flex items-center rounded-control font-medium transition-colors duration-fast",
                    variant === "sidebar" ? "min-h-8 gap-2.5 px-2.5 text-[0.8125rem]" : "min-h-9 gap-3 px-3 text-sm",
                    active
                      ? "bg-[rgb(var(--brand-50))] text-[rgb(var(--brand-800))] shadow-[inset_2px_0_0_rgb(var(--primary))] dark:bg-[rgb(var(--brand-950))] dark:text-[rgb(var(--brand-300))]"
                      : "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]"
                  )}
                >
                  <NavigationIcon name={item.icon} className={cn(variant === "sidebar" ? "h-4 w-4" : "h-[18px] w-[18px]", "shrink-0", active ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--text-faint))] group-hover:text-[rgb(var(--text-secondary))]")} />
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
