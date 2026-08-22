"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bars3Icon, MoonIcon, SunIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { authPath } from "@/lib/auth/redirects";
import { marketingSections } from "@/lib/marketing/navigation";
import { cn } from "@/lib/utils";

function MarketingThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text-secondary))] transition-colors hover:border-[rgb(var(--border-strong))] hover:text-[rgb(var(--foreground))]"
      aria-label={isDark ? "Activează tema luminoasă" : "Activează tema întunecată"}
      title={isDark ? "Temă luminoasă" : "Temă întunecată"}
    >
      {isDark ? <SunIcon className="h-4 w-4" aria-hidden="true" /> : <MoonIcon className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}
export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

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
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = Array.from(
        menuPanelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
      const first = focusableElements[0];
      const last = focusableElements.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
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
    <>
      <header
        data-scrolled={scrolled}
        className={cn(
          "sticky top-0 z-[80] border-b backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-normal ease-standard",
          scrolled
            ? "border-[rgb(var(--border))] bg-[rgb(var(--background)/0.97)] shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
            : "border-[rgb(var(--border)/0.72)] bg-[rgb(var(--background)/0.92)]"
        )}
      >
      <div className="mx-auto flex h-16 w-full max-w-[1360px] items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-5 text-[0.8125rem] font-medium text-[rgb(var(--text-secondary))] xl:flex" aria-label="Navigare principală">
          {marketingSections.map((item) => (
            <a key={item.id} href={item.href} className="focus-ring rounded px-1.5 py-2 transition-colors duration-fast hover:text-[rgb(var(--foreground))]">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 xl:flex">
          <MarketingThemeToggle />
          <Button href={authPath("/login", "login")} variant="ghost" className="min-h-10 px-4 text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--foreground))]">Intră în cont</Button>
          <Button href="#preturi" className="min-h-10 px-4">Solicită auditul</Button>
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
          <div ref={menuPanelRef} id="marketing-mobile-menu" className="absolute right-0 top-0 h-full w-[min(23rem,92vw)] overflow-y-auto border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-modal">
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
            <div className="mt-8 grid gap-3">
              <div className="flex items-center justify-between rounded-button border border-[rgb(var(--border))] px-3 py-2 text-sm font-semibold">
                <span>Aspect</span>
                <MarketingThemeToggle />
              </div>
              <Button href="#preturi" onClick={() => setOpen(false)}>Solicită auditul</Button>
              <Link href={authPath("/login", "login")} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-button border border-[rgb(var(--border))] px-4 text-sm font-semibold text-[rgb(var(--foreground))]">Intră în cont</Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
