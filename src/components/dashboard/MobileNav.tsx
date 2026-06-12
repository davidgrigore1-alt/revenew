"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { dashboardNavigation } from "@/lib/navigation";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 border-t border-white/10 bg-ink-950/95 px-2 py-2 backdrop-blur xl:hidden">
      {dashboardNavigation.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.name}
            className={clsx(
              "flex h-12 items-center justify-center rounded-lg transition",
              active ? "bg-mint-400/12 text-mint-400" : "text-zinc-500 hover:text-white"
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </Link>
        );
      })}
    </nav>
  );
}
