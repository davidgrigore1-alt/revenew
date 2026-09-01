"use client";

import { cn } from "@/lib/utils";

export type SegmentedFilterOption<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

export function SegmentedFilter<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly SegmentedFilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-1 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-1",
        className,
      )}
    >
      {options.map((option) => {
        const selected = value === option.id;

        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "focus-ring inline-flex min-h-8 items-center rounded-[calc(var(--radius-control)-0.125rem)] border px-2.5 text-xs font-medium transition-[background-color,border-color,color] duration-fast",
              selected
                ? "border-[rgb(var(--interaction-border))] bg-[rgb(var(--surface))] text-[rgb(var(--foreground))]"
                : "border-transparent text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface))] hover:text-[rgb(var(--foreground))]",
            )}
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span className="ml-1.5 text-metadata tabular-nums text-[rgb(var(--text-muted))]">
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
