import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid = false, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || props["aria-invalid"] || undefined}
      className={cn(
        "focus-ring min-h-24 w-full resize-y rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2.5 text-sm text-[rgb(var(--foreground))] shadow-sm transition-colors duration-fast placeholder:text-[rgb(var(--text-faint))] hover:border-[rgb(var(--border-strong))] disabled:cursor-not-allowed disabled:bg-[rgb(var(--surface-muted))] disabled:text-[rgb(var(--text-muted))] disabled:opacity-70",
        invalid && "border-[rgb(var(--danger-border))]",
        className
      )}
      {...props}
    />
  );
});
