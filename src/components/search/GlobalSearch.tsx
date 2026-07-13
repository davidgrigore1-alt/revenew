"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { searchWorkspace, type WorkspaceSearchResult } from "@/lib/search/actions";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkspaceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 0);
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
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm font-medium text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
        aria-label="Caută în workspace"
      >
        <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
        <span className="hidden lg:inline">Caută</span>
        <kbd className="hidden rounded border border-[rgb(var(--border))] px-1.5 py-0.5 text-[10px] font-semibold xl:inline">Ctrl K</kbd>
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/55 px-3 pt-[8vh]" role="dialog" aria-modal="true" aria-label="Căutare globală">
          <button type="button" className="absolute inset-0" onClick={close} aria-label="Închide căutarea" />
          <section className="relative z-10 flex max-h-[78vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3 border-b border-[rgb(var(--border))] px-4">
              <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-[rgb(var(--muted-foreground))]" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, results.length - 1)); }
                  if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
                  if (event.key === "Enter" && results[activeIndex]) window.location.assign(results[activeIndex].href);
                }}
                className="h-14 min-w-0 flex-1 bg-transparent text-base text-[rgb(var(--foreground))] outline-none placeholder:text-[rgb(var(--muted-foreground))]"
                placeholder="Companie, contact, oportunitate, activitate sau document"
                aria-label="Termen de căutare"
                aria-controls="workspace-search-results"
              />
              <button type="button" onClick={close} className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg" aria-label="Închide căutarea">
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div id="workspace-search-results" className="app-scrollbar min-h-52 overflow-y-auto p-3" aria-live="polite">
              {loading ? <SearchSkeleton /> : null}
              {!loading && error ? <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</p> : null}
              {!loading && !error && query.trim().length < 2 ? <p className="p-5 text-sm text-[rgb(var(--muted-foreground))]">Introdu cel puțin două caractere. Rezultatele sunt limitate la workspace-ul curent.</p> : null}
              {!loading && !error && query.trim().length >= 2 && results.length === 0 ? <p className="p-5 text-sm text-[rgb(var(--muted-foreground))]">Nu am găsit rezultate accesibile. Verifică termenul sau încearcă o denumire mai scurtă.</p> : null}
              {!loading && !error ? Object.entries(grouped).map(([group, items]) => (
                <div key={group} className="mb-4 last:mb-0">
                  <p className="px-2 py-1 text-xs font-semibold uppercase text-[rgb(var(--muted-foreground))]">{group}</p>
                  <div className="grid gap-1">
                    {items.map((result) => {
                      const index = results.findIndex((item) => item.group === result.group && item.id === result.id);
                      return <Link key={`${result.group}-${result.id}`} href={result.href} onClick={close} onMouseEnter={() => setActiveIndex(index)} className={`focus-ring rounded-lg px-3 py-2 ${activeIndex === index ? "bg-[rgb(var(--primary)_/_0.12)]" : "hover:bg-[rgb(var(--muted))]"}`}>
                        <span className="block truncate text-sm font-semibold text-[rgb(var(--foreground))]">{result.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-[rgb(var(--muted-foreground))]">{result.context}</span>
                      </Link>;
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
    {[0, 1, 2].map((item) => <div key={item} className="h-14 animate-pulse rounded-lg bg-[rgb(var(--muted))] motion-reduce:animate-none" />)}
  </div>;
}
