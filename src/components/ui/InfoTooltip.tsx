"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type InfoTooltipProps = {
  content: React.ReactNode;
  className?: string;
};

export function InfoTooltip({ content, className }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="inline-flex size-5 items-center justify-center rounded-full border border-white/15 bg-white/[0.07] text-[11px] font-bold leading-none text-zinc-300 outline-none transition hover:border-mint-400/40 hover:text-mint-300 focus:border-mint-400/60 focus:ring-2 focus:ring-mint-400/20"
      >
        i
      </button>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-1/2 top-7 z-40 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border border-white/10 bg-ink-950/95 p-3 text-left text-xs font-normal leading-5 text-zinc-300 shadow-2xl shadow-black/40 backdrop-blur sm:w-72"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
