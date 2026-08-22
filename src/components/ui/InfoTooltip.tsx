"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type InfoTooltipProps = {
  content: ReactNode;
  className?: string;
  label?: string;
};

export function InfoTooltip({ content, className, label = "Mai multe informații" }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pointerFocusRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span
      ref={rootRef}
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!rootRef.current?.contains(document.activeElement)) setOpen(false);
      }}
      onFocusCapture={() => {
        if (!pointerFocusRef.current) setOpen(true);
      }}
      onBlurCapture={(event) => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        onPointerDown={() => { pointerFocusRef.current = true; }}
        onPointerUp={() => { pointerFocusRef.current = false; }}
        onPointerCancel={() => { pointerFocusRef.current = false; }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          pointerFocusRef.current = false;
          setOpen((current) => !current);
        }}
        className="focus-ring inline-flex size-5 items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] text-[11px] font-bold leading-none text-[rgb(var(--text-muted))] transition-colors duration-fast hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]"
      >
        i
      </button>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-1/2 top-7 z-40 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-3 text-left text-xs font-normal leading-5 text-[rgb(var(--text-secondary))] shadow-elevated sm:w-72"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
