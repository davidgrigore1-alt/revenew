"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { WorkspaceMenu } from "@/components/dashboard/WorkspaceMenu";
import { NavigationIcon } from "@/components/dashboard/NavigationIcon";
import { isNavItemActive, primaryNavigation, utilityNavigation } from "@/lib/navigation";

const pageCopy: Record<string, { title: string; subtitle: string; cta?: { label: string; href: string } }> = {
  "/dashboard": {
    title: "Acasă",
    subtitle: "Vezi ce bani poți recupera și ce trebuie să faci acum.",
    cta: { label: "Adaugă semnal", href: "/inbox" }
  },
  "/recoverable": {
    title: "Bani recuperabili",
    subtitle: "Cererile și oportunitățile care încă pot produce venit."
  },
  "/today": {
    title: "Acțiuni",
    subtitle: "Pașii importanți de făcut acum."
  },
  "/results": {
    title: "Rezultate",
    subtitle: "Valoare estimată, acțiuni și rezultate obținute."
  },
  "/tools": {
    title: "Instrumente",
    subtitle: "Funcții suplimentare pentru cereri, oportunități și rapoarte."
  },
  "/settings": {
    title: "Setări",
    subtitle: "Workspace, aspect și confidențialitate."
  },
  "/help": {
    title: "Ajutor",
    subtitle: "Răspunsuri rapide despre folosirea ReveNew."
  }
};

function getPageCopy(pathname: string) {
  const exact = pageCopy[pathname];
  if (exact) return exact;
  if (pathname.startsWith("/opportunities") || pathname.startsWith("/inbox") || pathname.startsWith("/leads") || pathname.startsWith("/outreach") || pathname.startsWith("/reports")) {
    return { title: "Instrumente", subtitle: "Lucrează în instrumentele avansate ReveNew." };
  }
  return { title: "ReveNew", subtitle: "Recuperare venituri B2B." };
}

export function AppHeader({
  businessName,
  userEmail,
  userName,
  isDemo = false
}: {
  businessName?: string;
  userEmail?: string;
  userName?: string;
  isDemo?: boolean;
}) {
  const pathname = usePathname();
  const copy = getPageCopy(pathname);
  const [open, setOpen] = useState(false);
  const drawerItems = [...primaryNavigation, ...utilityNavigation];

  return (
    <>
      <header className="sticky top-0 z-30 h-16 border-b border-[rgb(var(--border))] bg-[rgb(var(--background)_/_0.9)] backdrop-blur">
        <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--foreground))] xl:hidden"
              aria-label="Deschide navigarea"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Bars3Icon className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-[rgb(var(--foreground))]">{copy.title}</p>
              <p className="hidden truncate text-sm text-[rgb(var(--muted-foreground))] sm:block">{copy.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {copy.cta ? (
              <Link href={copy.cta.href} className="focus-ring hidden h-10 items-center rounded-lg bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))] md:inline-flex">
                {copy.cta.label}
              </Link>
            ) : null}
            <WorkspaceMenu businessName={businessName} userEmail={userEmail} userName={userName} isDemo={isDemo} />
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Navigare ReveNew">
          <button className="absolute inset-0 bg-black/40" aria-label="Închide navigarea" type="button" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[min(20rem,88vw)] overflow-y-auto border-r border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[rgb(var(--foreground))]">ReveNew</p>
              <button type="button" className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[rgb(var(--border))]" aria-label="Închide navigarea" onClick={() => setOpen(false)}>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="mt-6 space-y-1">
              {drawerItems.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "focus-ring flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium",
                      active ? "bg-[rgb(var(--primary)_/_0.12)] text-[rgb(var(--primary))]" : "text-[rgb(var(--muted-foreground))]"
                    )}
                  >
                    <NavigationIcon name={item.icon} className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
