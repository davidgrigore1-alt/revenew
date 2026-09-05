import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid = false, ...props },
  ref
) {
  return (
    <input
      {...props}
      ref={ref}
      aria-invalid={invalid || props["aria-invalid"] || undefined}
      className={cn(
        "rn-field focus-ring min-h-[var(--control-height)] w-full rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--foreground))] shadow-[0_1px_1px_rgb(0_0_0/0.025)] caret-[rgb(var(--primary))] transition-[border-color,background-color,box-shadow] duration-fast placeholder:text-[rgb(var(--text-faint))] hover:border-[rgb(var(--border-strong))] focus-visible:border-[rgb(var(--primary))] disabled:cursor-not-allowed disabled:bg-[rgb(var(--surface-muted))] disabled:text-[rgb(var(--text-muted))] motion-reduce:transition-none",
        className
      )}
    />
  );
});
