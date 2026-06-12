"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { dashboardNavigation } from "@/lib/navigation";
import { Logo } from "@/components/ui/Logo";
import { LogoutButton } from "@/components/auth/LogoutButton";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 shrink-0 overflow-y-auto border-r border-white/10 bg-ink-950/75 px-4 py-5 backdrop-blur xl:block">
      <Logo />
      <nav className="mt-9 space-y-1">
        {dashboardNavigation.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition",
                active
                  ? "bg-mint-400/12 text-mint-400"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <LogoutButton />
    </aside>
  );
}
