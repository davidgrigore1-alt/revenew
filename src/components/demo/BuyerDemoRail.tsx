"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { buyerDemoHref, buyerDemoSteps, demoStepIndexForPath } from "@/lib/buyer-demo";

const storageKey = "revenew-demo-mode";

export function BuyerDemoRail() {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("demo") === "buyer";
    if (requested) window.localStorage.setItem(storageKey, "buyer");
    setActive(requested || window.localStorage.getItem(storageKey) === "buyer");
  }, [pathname]);

  if (!active) return null;

  const currentIndex = demoStepIndexForPath(pathname);
  const current = buyerDemoSteps[currentIndex];
  const next = buyerDemoSteps[currentIndex + 1] ?? null;

  function stopDemo() {
    window.localStorage.removeItem(storageKey);
    setActive(false);
    router.replace(pathname);
  }

  return (
    <aside className="sticky top-0 z-40 border-b border-[rgb(var(--gold-500)/0.28)] bg-[rgb(var(--surface)/0.97)] shadow-card backdrop-blur" aria-label="Traseu demo activ">
      <div className="mx-auto flex min-h-16 w-full max-w-[1440px] flex-col gap-2 px-4 py-2.5 sm:px-6 lg:flex-row lg:items-center lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="inline-flex shrink-0 rounded-pill border border-[rgb(var(--gold-500)/0.32)] bg-[rgb(var(--gold-500)/0.1)] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]">Pasul {currentIndex + 1}/{buyerDemoSteps.length}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[rgb(var(--foreground))]">{current.shortTitle}</p>
            <p className="mt-0.5 hidden line-clamp-1 text-xs leading-5 text-[rgb(var(--text-muted))] sm:block">{current.understanding}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 lg:gap-2">
          <Link href={buyerDemoHref("/demo")} className="focus-ring hidden min-h-9 items-center rounded-button px-2.5 text-xs font-semibold text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))] sm:inline-flex">Traseu complet</Link>
          {next ? <Link href={buyerDemoHref(next.href)} className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-button bg-[rgb(var(--primary))] px-3 text-xs font-semibold text-[rgb(var(--primary-foreground))]">Următorul: {next.shortTitle}<ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" /></Link> : <Link href={buyerDemoHref("/demo#next-step")} className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-button bg-[rgb(var(--primary))] px-3 text-xs font-semibold text-[rgb(var(--primary-foreground))]">Încheie demo-ul<ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" /></Link>}
          <button type="button" onClick={stopDemo} className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-button px-2.5 text-xs font-semibold text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-subtle))] hover:text-[rgb(var(--foreground))]"><XMarkIcon className="h-4 w-4" aria-hidden="true" />Oprește</button>
        </div>
      </div>
    </aside>
  );
}
