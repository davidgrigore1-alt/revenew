"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { FirstTimeGuide } from "@/components/dashboard/FirstTimeGuide";
import type { FirstValueJourney } from "@/lib/first-value-journey";

const STORAGE_KEY = "revenew.dismissedGettingStarted";
const SHOW_GETTING_STARTED_EVENT = "revenew:show-getting-started";

export function GettingStarted({ journey }: { journey: FirstValueJourney }) {
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === "true");
    function show() { window.localStorage.removeItem(STORAGE_KEY); setDismissed(false); }
    window.addEventListener(SHOW_GETTING_STARTED_EVENT, show);
    return () => window.removeEventListener(SHOW_GETTING_STARTED_EVENT, show);
  }, []);
  if (dismissed || journey.complete) return null;
  return <section className="relative"><button type="button" className="focus-ring absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-control text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))]" aria-label="Închide primii pași" onClick={() => { window.localStorage.setItem(STORAGE_KEY, "true"); setDismissed(true); }}><XMarkIcon className="h-4 w-4" aria-hidden="true" /></button><FirstTimeGuide journey={journey} compact /></section>;
}
