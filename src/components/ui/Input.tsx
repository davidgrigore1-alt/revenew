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
      ref={ref}
      aria-invalid={invalid || props["aria-invalid"] || undefined}
      className={cn(
        "focus-ring min-h-10 w-full rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--foreground))] shadow-sm transition-colors duration-fast placeholder:text-[rgb(var(--text-faint))] hover:border-[rgb(var(--border-strong))] disabled:cursor-not-allowed disabled:bg-[rgb(var(--surface-muted))] disabled:text-[rgb(var(--text-muted))] disabled:opacity-70",
        invalid && "border-[rgb(var(--danger-border))]",
        className
      )}
      {...props}
    />
  );
});
