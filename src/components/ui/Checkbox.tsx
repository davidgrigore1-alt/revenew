"use client";

import { CheckIcon, MinusIcon } from "@heroicons/react/20/solid";
import { useEffect, useRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  indeterminate?: boolean;
};

export function Checkbox({ className, indeterminate = false, disabled, ...props }: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <span className={cn("relative inline-flex size-4 shrink-0", className)}>
      <input
        {...props}
        ref={inputRef}
        type="checkbox"
        disabled={disabled}
        aria-checked={indeterminate ? "mixed" : props.checked}
        className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none grid size-4 place-items-center rounded-[4px] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] text-[rgb(var(--primary-foreground))] shadow-[inset_0_1px_0_rgb(255_255_255/0.05)] transition-[border-color,background-color,box-shadow] duration-fast peer-hover:border-[rgb(var(--text-faint))] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[rgb(var(--focus-ring))] peer-checked:border-[rgb(var(--primary))] peer-checked:bg-[rgb(var(--primary))] peer-disabled:opacity-50",
          indeterminate && "border-[rgb(var(--primary))] bg-[rgb(var(--primary))]"
        )}
      >
        {indeterminate ? <MinusIcon className="size-3" /> : props.checked ? <CheckIcon className="size-3" /> : null}
      </span>
    </span>
  );
}
