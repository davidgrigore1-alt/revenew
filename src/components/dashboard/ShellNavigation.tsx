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
    <nav aria-label={ariaLabel} className={cn("flex flex-col", variant === "sidebar" ? "gap-1.5" : "h-full gap-5")}>
      {groups.map((group) => (
        <div key={group.id} className={cn(group.id === "utility" && variant === "sidebar" && "mt-0.5 border-t border-[rgb(var(--border))] pt-1.5")}>
          <p className={cn("px-2 font-medium text-[rgb(var(--text-faint))]", variant === "sidebar" ? "text-micro leading-4" : "text-metadata")}>{group.label}</p>
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
                    "focus-ring group relative flex items-center rounded-control border border-transparent font-medium transition-[background-color,border-color,color] duration-fast ease-standard",
                    variant === "sidebar" ? "min-h-8 gap-2 px-2 text-label" : "min-h-9 gap-3 px-3 text-sm",
                    active
                      ? "border-[rgb(var(--border)/0.72)] bg-[rgb(var(--surface-muted)/0.82)] text-[rgb(var(--foreground))] before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-[rgb(var(--primary))]"
                      : "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-subtle))] hover:text-[rgb(var(--foreground))]"
                  )}
                >
                  <NavigationIcon name={item.icon} className={cn(variant === "sidebar" ? "h-[17px] w-[17px]" : "h-[18px] w-[18px]", "shrink-0", active ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--foreground))]")} />
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
