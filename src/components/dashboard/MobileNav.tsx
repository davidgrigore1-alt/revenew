"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { isNavItemActive, primaryNavigation, type NavigationItem } from "@/lib/navigation";
import { NavigationIcon } from "@/components/dashboard/NavigationIcon";

export function MobileNav({ items = primaryNavigation }: { items?: NavigationItem[] }) {
  const pathname = usePathname();
  const mobileLabels: Record<string, string> = { "/inbox": "Inbox", "/today": "Activitate", "/opportunities": "Oportunități" };
  const mobileItems = items.filter((item) => ["/dashboard", "/inbox", "/today", "/pipeline", "/companies", "/opportunities"].includes(item.href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface)_/_0.96)] px-2 py-2 shadow-[var(--shadow-card)] backdrop-blur xl:hidden">
      {mobileItems.map((item) => {
        const active = isNavItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.name}
            className={clsx(
              "focus-ring flex h-12 flex-col items-center justify-center rounded-lg text-[11px] font-semibold transition",
              active ? "bg-[rgb(var(--primary)_/_0.12)] text-[rgb(var(--primary))]" : "text-[rgb(var(--muted-foreground))]"
            )}
          >
            <NavigationIcon name={item.icon} className="h-5 w-5" />
            <span className="mt-1 max-w-full text-center">{mobileLabels[item.href] ?? item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
