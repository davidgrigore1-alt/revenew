"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { authPath } from "@/lib/auth/redirects";
import { marketingSections } from "@/lib/marketing/navigation";
import { cn } from "@/lib/utils";

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const updateScrolledState = () => setScrolled(window.scrollY > 12);
    updateScrolledState();
    window.addEventListener("scroll", updateScrolledState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolledState);
  }, []);

  useEffect(() => {
    if (!open) return;
    const opener = openButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [open]);

  return (
    <>
      <header
        data-scrolled={scrolled}
        className={cn(
          "sticky top-0 z-[80] border-b backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-normal ease-standard",
          scrolled
            ? "border-[rgb(var(--border)/0.92)] bg-[rgb(var(--background)/0.94)] shadow-[0_10px_32px_rgb(25_23_19/0.08)]"
            : "border-transparent bg-[rgb(var(--background)/0.76)]"
        )}
      >
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 rounded-full border border-[rgb(var(--border)/0.7)] bg-[rgb(var(--surface)/0.58)] p-1 text-[0.8125rem] font-semibold text-[rgb(var(--muted-foreground))] shadow-card xl:flex" aria-label="Navigare principală">
          {marketingSections.map((item) => (
            <a key={item.id} href={item.href} className="focus-ring rounded-full px-3 py-2 transition-colors duration-fast hover:bg-[rgb(var(--brand-100)/0.58)] hover:text-[rgb(var(--foreground))] dark:hover:bg-[rgb(var(--surface-muted))]">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle compact />
          <Button href={authPath("/login", "login")} variant="ghost" className="min-h-10 px-4">Intră în cont</Button>
          <Button href="#preturi" className="min-h-10 px-4 shadow-[0_10px_28px_rgb(var(--brand-700)/0.18)]">Solicită auditul</Button>
        </div>
        <button
          ref={openButtonRef}
          type="button"
          className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--foreground))] xl:hidden"
          aria-label="Deschide meniul de navigare"
          aria-expanded={open}
          aria-controls="marketing-mobile-menu"
          onClick={() => setOpen(true)}
        >
          <Bars3Icon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      </header>

      {open ? (
        <div className="fixed inset-0 z-[90] xl:hidden" role="dialog" aria-modal="true" aria-label="Navigare ReveNew">
          <button className="absolute inset-0 bg-black/50" type="button" aria-label="Închide meniul" onClick={() => setOpen(false)} />
          <div id="marketing-mobile-menu" className="absolute right-0 top-0 h-full w-[min(23rem,92vw)] overflow-y-auto border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-modal">
            <div className="flex items-center justify-between gap-4">
              <Logo />
              <button ref={closeButtonRef} type="button" className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-button border border-[rgb(var(--border))]" aria-label="Închide meniul" onClick={() => setOpen(false)}>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav className="mt-8 grid gap-2" aria-label="Navigare mobilă">
              {marketingSections.map((item) => (
                <a key={item.id} href={item.href} onClick={() => setOpen(false)} className="focus-ring rounded-button px-3 py-3 text-sm font-semibold text-[rgb(var(--foreground))] hover:bg-[rgb(var(--surface-muted))]">
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-6 border-t border-[rgb(var(--border))] pt-6"><ThemeToggle /></div>
            <div className="mt-8 grid gap-3">
              <Button href="#preturi" onClick={() => setOpen(false)}>Solicită auditul</Button>
              <Link href={authPath("/login", "login")} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-button border border-[rgb(var(--border))] px-4 text-sm font-semibold text-[rgb(var(--foreground))]">Intră în cont</Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
