"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { authPath } from "@/lib/auth/redirects";
import { marketingSections } from "@/lib/marketing/navigation";
import { cn } from "@/lib/utils";

const darkNavTokens = {
  "--foreground": "250 250 250",
  "--text-secondary": "202 202 207",
  "--text-muted": "151 151 159",
  "--surface": "15 16 17",
  "--surface-subtle": "20 21 23",
  "--surface-muted": "27 28 30",
  "--border": "44 45 48",
  "--border-strong": "70 71 76",
  "--primary": "216 189 118",
  "--primary-hover": "226 202 143",
  "--primary-active": "191 157 78",
  "--primary-foreground": "23 19 11"
} as CSSProperties;

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 10);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
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

      const focusable = Array.from(
        menuPanelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );

      const first = focusable[0];
      const last = focusable.at(-1);

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
        style={darkNavTokens}
        className={cn(
          "sticky top-0 z-[80] border-b bg-[#090a0c] text-white transition-[border-color,box-shadow] duration-200",
          scrolled
            ? "border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
            : "border-white/[0.07]"
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1360px] items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <Logo />

          <nav
            className="hidden items-center gap-1 text-[0.8125rem] font-medium text-white/62 xl:flex"
            aria-label="Navigare principală"
          >
            {marketingSections.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className="focus-ring rounded-[0.55rem] px-3 py-2 transition-colors hover:bg-white/[0.055] hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 xl:flex">
            <Button
              href={authPath("/login", "login")}
              variant="ghost"
              className="min-h-10 px-4 text-white/66 hover:bg-white/[0.055] hover:text-white"
            >
              Autentificare
            </Button>

            <Button
              href="#preturi"
              className="min-h-10 border-[#d8bd76] bg-[#d8bd76] px-4 text-[#17130b] hover:bg-[#e2ca88]"
            >
              Vezi planurile
            </Button>
          </div>

          <button
            ref={openButtonRef}
            type="button"
            className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-[0.65rem] border border-white/12 bg-white/[0.035] text-white xl:hidden"
            aria-label="Deschide meniul"
            aria-expanded={open}
            aria-controls="marketing-mobile-menu"
            onClick={() => setOpen(true)}
          >
            <Bars3Icon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {open ? (
        <div
          className="fixed inset-0 z-[90] xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigare ReveNew"
        >
          <button
            className="absolute inset-0 bg-black/60"
            type="button"
            aria-label="Închide meniul"
            onClick={() => setOpen(false)}
          />

          <div
            ref={menuPanelRef}
            id="marketing-mobile-menu"
            style={darkNavTokens}
            className="absolute right-0 top-0 h-full w-[min(23rem,92vw)] overflow-y-auto border-l border-white/10 bg-[#0b0c0e] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-center justify-between gap-4">
              <Logo />

              <button
                ref={closeButtonRef}
                type="button"
                className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-[0.65rem] border border-white/12 bg-white/[0.035]"
                aria-label="Închide meniul"
                onClick={() => setOpen(false)}
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav className="mt-8 grid gap-1" aria-label="Navigare mobilă">
              {marketingSections.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="focus-ring rounded-[0.65rem] px-3 py-3 text-sm font-semibold text-white/78 hover:bg-white/[0.055] hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="mt-8 grid gap-3 border-t border-white/10 pt-5">
              <Button
                href="#preturi"
                onClick={() => setOpen(false)}
                className="border-[#d8bd76] bg-[#d8bd76] text-[#17130b] hover:bg-[#e2ca88]"
              >
                Vezi planurile
              </Button>

              <Link
                href={authPath("/login", "login")}
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-[0.65rem] border border-white/12 px-4 text-sm font-semibold text-white/80"
              >
                Autentificare
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
