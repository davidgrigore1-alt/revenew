"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { authPath } from "@/lib/auth/redirects";
import { marketingSections } from "@/lib/marketing/navigation";

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const opener = openButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-[rgb(var(--border))] bg-[rgb(var(--background)_/_0.92)] backdrop-blur">
      <div className="mx-auto flex h-[72px] w-full max-w-[1220px] items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm font-medium text-[rgb(var(--muted-foreground))] lg:flex" aria-label="Navigare principală">
          {marketingSections.map((item) => (
            <a key={item.id} href={item.href} className="focus-ring rounded px-1 py-2 transition hover:text-[rgb(var(--foreground))]">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Button href={authPath("/login", "login")} variant="ghost" className="min-h-10 px-4">
            Intră în cont
          </Button>
          <Button href="#preturi" className="min-h-10 px-4">
            Solicită auditul
          </Button>
        </div>
        <button
          ref={openButtonRef}
          type="button"
          className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--foreground))] lg:hidden"
          aria-label="Deschide meniul de navigare"
          aria-expanded={open}
          aria-controls="marketing-mobile-menu"
          onClick={() => setOpen(true)}
        >
          <Bars3Icon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigare ReveNew">
          <button className="absolute inset-0 bg-black/45" type="button" aria-label="Închide meniul" onClick={() => setOpen(false)} />
          <div id="marketing-mobile-menu" className="absolute right-0 top-0 h-full w-[min(23rem,92vw)] overflow-y-auto border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between gap-4">
              <Logo />
              <button ref={closeButtonRef} type="button" className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[rgb(var(--border))]" aria-label="Închide meniul" onClick={() => setOpen(false)}>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="mt-8 grid gap-2" aria-label="Navigare mobilă">
              {marketingSections.map((item) => (
                <a key={item.id} href={item.href} onClick={() => setOpen(false)} className="focus-ring rounded-lg px-3 py-3 text-sm font-semibold text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))]">
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-8 grid gap-3">
              <Button href="#preturi" onClick={() => setOpen(false)}>
                Solicită auditul
              </Button>
              <Link href={authPath("/login", "login")} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg border border-[rgb(var(--border))] px-4 text-sm font-semibold text-[rgb(var(--foreground))]">
                Intră în cont
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
