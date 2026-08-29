"use client";

import Link from "next/link";
import { QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { pageGuideForPath } from "@/lib/guidance/page-guides";
import { cn } from "@/lib/utils";

const SHOW_GETTING_STARTED_EVENT = "revenew:show-getting-started";

export function ContextualHelpMenu({ className }: { className?: string }) {
  const pathname = usePathname();
  const guide = pageGuideForPath(pathname);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutside(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOnOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, []);

  return <div ref={menuRef} className={cn("relative", className)}>
    <button type="button" aria-expanded={open} aria-haspopup="dialog" aria-controls="contextual-help-menu" onClick={() => setOpen((value) => !value)} className="focus-ring inline-flex min-h-8 items-center gap-1.5 rounded-control px-2 text-xs font-medium text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]">
      <QuestionMarkCircleIcon className="h-4 w-4" aria-hidden="true" />Ajutor
    </button>
    {open ? <section id="contextual-help-menu" role="dialog" aria-label="Ajutor pentru această pagină" className="absolute right-0 top-10 z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-card border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] p-4 shadow-modal">
      <div className="flex items-start justify-between gap-3"><div><p className="text-metadata font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary-active))]">Ghid pentru această pagină</p><h2 className="mt-1 text-sm font-semibold">{guide?.title ?? "Ajutor ReveNew"}</h2></div><button type="button" className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-control text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))]" aria-label="Închide ajutorul" onClick={() => setOpen(false)}><XMarkIcon className="h-4 w-4" aria-hidden="true" /></button></div>
      {guide ? <dl className="mt-3 grid gap-2 border-y border-[rgb(var(--border))] py-3 text-xs leading-5"><div><dt className="font-semibold text-[rgb(var(--foreground))]">Ce este</dt><dd className="text-[rgb(var(--text-muted))]">{guide.purpose}</dd></div><div><dt className="font-semibold text-[rgb(var(--foreground))]">Ce faci aici</dt><dd className="text-[rgb(var(--text-muted))]">{guide.whatYouDo}</dd></div><div><dt className="font-semibold text-[rgb(var(--foreground))]">Următorul pas</dt><dd className="text-[rgb(var(--text-muted))]">{guide.nextStep}</dd></div></dl> : <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]">Găsești ghiduri scurte pentru principalele fluxuri comerciale în Centrul de ajutor.</p>}
      <div className="mt-3 flex flex-wrap items-center gap-3"><Link href="/help" onClick={() => setOpen(false)} className="focus-ring rounded text-xs font-semibold text-[rgb(var(--primary-active))] hover:underline">Centru de ajutor</Link><button type="button" className="focus-ring rounded text-xs font-medium text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]" onClick={() => { window.dispatchEvent(new Event(SHOW_GETTING_STARTED_EVENT)); setOpen(false); }}>Arată primii pași</button></div>
    </section> : null}
  </div>;
}
