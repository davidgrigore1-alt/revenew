"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { searchWorkspace, type WorkspaceSearchResult } from "@/lib/search/actions";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkspaceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape" && open) close();
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setResults([]);
      setError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(async () => {
      const response = await searchWorkspace(normalized);
      setResults(response.results);
      setError(response.error ?? "");
      setLoading(false);
      setActiveIndex(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const grouped = useMemo(() => {
    return results.reduce<Record<string, WorkspaceSearchResult[]>>((groups, result) => {
      (groups[result.group] ??= []).push(result);
      return groups;
    }, {});
  }, [results]);

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setError("");
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring inline-flex h-10 w-10 items-center justify-center gap-2 rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-sm font-medium text-[rgb(var(--text-muted))] shadow-sm transition-colors duration-fast hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))] xl:w-auto xl:px-3"
        aria-label="Caută în workspace"
        aria-controls="workspace-search-dialog"
        aria-expanded={open}
      >
        <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
        <span className="hidden xl:inline">Caută</span>
        <kbd className="hidden rounded border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-1.5 py-0.5 text-[10px] font-semibold text-[rgb(var(--text-faint))] 2xl:inline">Ctrl K</kbd>
      </button>

      {open ? (
        <div id="workspace-search-dialog" className="fixed inset-0 z-[70] flex items-start justify-center bg-black/45 px-3 pt-[max(1rem,8vh)] backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-labelledby="workspace-search-title">
          <button type="button" className="absolute inset-0" onClick={close} aria-label="Închide căutarea" />
          <section className="relative z-10 flex max-h-[min(42rem,84dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-overlay border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-modal">
            <h2 id="workspace-search-title" className="sr-only">Căutare în workspace</h2>
            <div className="flex items-center gap-3 border-b border-[rgb(var(--border))] px-4 focus-within:ring-2 focus-within:ring-inset focus-within:ring-[rgb(var(--focus-ring))]">
              <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-[rgb(var(--text-faint))]" aria-hidden="true" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0))); }
                  if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
                  if (event.key === "Enter" && results[activeIndex]) window.location.assign(results[activeIndex].href);
                }}
                className="h-14 min-h-14 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none hover:border-transparent focus-visible:outline-none"
                placeholder="Companie, contact, oportunitate, activitate sau document"
                aria-label="Termen de căutare"
                aria-controls="workspace-search-results"
              />
              <button type="button" onClick={close} className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-button text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]" aria-label="Închide căutarea">
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div id="workspace-search-results" className="app-scrollbar min-h-52 overflow-y-auto p-3" aria-live="polite">
              {loading ? <SearchSkeleton /> : null}
              {!loading && error ? <p role="alert" className="rounded-control border border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] p-4 text-sm text-[rgb(var(--danger-text))]">{error}</p> : null}
              {!loading && !error && query.trim().length < 2 ? <p className="p-5 text-sm text-[rgb(var(--text-muted))]">Introdu cel puțin două caractere. Rezultatele sunt limitate la workspace-ul curent.</p> : null}
              {!loading && !error && query.trim().length >= 2 && results.length === 0 ? <p className="p-5 text-sm text-[rgb(var(--text-muted))]">Nu am găsit rezultate accesibile. Verifică termenul sau încearcă o denumire mai scurtă.</p> : null}
              {!loading && !error ? Object.entries(grouped).map(([group, items]) => (
                <div key={group} className="mb-4 last:mb-0">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">{group}</p>
                  <div className="grid gap-1">
                    {items.map((result) => {
                      const index = results.findIndex((item) => item.group === result.group && item.id === result.id);
                      return (
                        <Link
                          key={`${result.group}-${result.id}`}
                          href={result.href}
                          onClick={close}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={cn(
                            "focus-ring rounded-control px-3 py-2.5 transition-colors duration-fast",
                            activeIndex === index ? "bg-[rgb(var(--brand-50))] dark:bg-[rgb(var(--brand-950))]" : "hover:bg-[rgb(var(--surface-muted))]"
                          )}
                        >
                          <span className="block truncate text-sm font-semibold text-[rgb(var(--foreground))]">{result.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-[rgb(var(--text-muted))]">{result.context}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function SearchSkeleton() {
  return <div className="grid gap-2 p-2" aria-label="Se caută">
    {[0, 1, 2].map((item) => <Skeleton key={item} className="h-14" />)}
  </div>;
}
