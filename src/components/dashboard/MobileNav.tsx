"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavigationIcon } from "@/components/dashboard/NavigationIcon";
import { cn } from "@/lib/utils";
import { isNavItemActive, primaryNavigation, type NavigationItem } from "@/lib/navigation";

const mobileRouteOrder = ["/dashboard", "/inbox", "/today", "/opportunities"];

export function MobileNav({ items = primaryNavigation }: { items?: NavigationItem[] }) {
  const pathname = usePathname();
  const availableItems = new Map(items.map((item) => [item.href, item]));
  const mobileItems = mobileRouteOrder.flatMap((href) => {
    const item = availableItems.get(href);
    return item ? [item] : [];
  });

  if (mobileItems.length === 0) return null;

  return (
    <nav aria-label="Navigare rapidă" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.96)] px-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] pt-1.5 shadow-elevated backdrop-blur-md lg:hidden">
      {mobileItems.map((item) => {
        const active = isNavItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            aria-label={item.name}
            className={cn(
              "focus-ring flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-control px-1 text-[0.6875rem] font-semibold transition-colors duration-fast",
              active
                ? "bg-[rgb(var(--brand-50))] text-[rgb(var(--brand-800))] dark:bg-[rgb(var(--brand-950))] dark:text-[rgb(var(--brand-300))]"
                : "text-[rgb(var(--text-muted))] active:bg-[rgb(var(--surface-muted))]"
            )}
          >
            <NavigationIcon name={item.icon} className="h-5 w-5 shrink-0" />
            <span className="mt-0.5 max-w-full truncate">{item.shortName ?? item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
