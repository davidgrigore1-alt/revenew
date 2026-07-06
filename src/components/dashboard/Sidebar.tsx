"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { isNavItemActive, primaryNavigation, utilityNavigation, type NavigationItem } from "@/lib/navigation";
import { Logo } from "@/components/ui/Logo";
import { NavigationIcon } from "@/components/dashboard/NavigationIcon";

function NavLink({ item }: { item: NavigationItem }) {
  const pathname = usePathname();
  const active = isNavItemActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "focus-ring flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition",
        active
          ? "bg-[rgb(var(--primary)_/_0.12)] text-[rgb(var(--primary))] shadow-[inset_3px_0_0_rgb(var(--primary))]"
          : "text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
      )}
    >
      <NavigationIcon name={item.icon} className="h-5 w-5 shrink-0" />
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

export function Sidebar({
  primaryItems = primaryNavigation,
  utilityItems = utilityNavigation
}: {
  primaryItems?: NavigationItem[];
  utilityItems?: NavigationItem[];
}) {
  return (
    <aside className="app-scrollbar fixed left-0 top-0 z-40 hidden h-dvh w-[248px] shrink-0 overflow-y-auto border-r border-[rgb(var(--border))] bg-[rgb(var(--sidebar))] px-4 py-5 xl:block">
      <div className="h-[72px]">
        <Logo />
      </div>

      <nav className="flex min-h-[calc(100dvh-112px)] flex-col">
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--muted-foreground))]">Principal</p>
          <div className="mt-3 space-y-1">
            {primaryItems.map((item) => <NavLink key={item.href} item={item} />)}
          </div>
        </div>

        <div className="mt-auto border-t border-[rgb(var(--border))] pt-4">
          <div className="space-y-1">
            {utilityItems.map((item) => <NavLink key={item.href} item={item} />)}
          </div>
        </div>
      </nav>
    </aside>
  );
}
