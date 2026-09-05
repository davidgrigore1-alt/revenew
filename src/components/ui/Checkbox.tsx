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
    <span className={cn("rn-checkbox relative inline-flex size-4 shrink-0", className)}>
      <input
        {...props}
        ref={inputRef}
        type="checkbox"
        disabled={disabled}
        className="peer absolute inset-0 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span
        aria-hidden="true"
        className={cn(
          "rn-checkbox-mark pointer-events-none grid size-4 place-items-center rounded-[4px] border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] text-[rgb(var(--primary-foreground))] shadow-[inset_0_1px_0_rgb(255_255_255/0.05)] transition-colors duration-100 motion-reduce:transition-none peer-hover:border-[rgb(var(--text-faint))] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[rgb(var(--focus-ring))] peer-checked:border-[rgb(var(--primary))] peer-checked:bg-[rgb(var(--primary))] peer-indeterminate:border-[rgb(var(--primary))] peer-indeterminate:bg-[rgb(var(--primary))] peer-disabled:opacity-70"
        )}
      >
        <CheckIcon className="rn-checkbox-check size-3" /><MinusIcon className="rn-checkbox-mixed size-3" />
      </span>
    </span>
  );
}
