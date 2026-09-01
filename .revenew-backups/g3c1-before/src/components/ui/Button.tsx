import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = {
  href?: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "small" | "default" | "large" | "icon";
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
  download?: boolean | string;
  "aria-label"?: string;
  "aria-controls"?: string;
  "aria-expanded"?: boolean;
};

const variants = {
  primary: "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] hover:bg-[rgb(var(--primary-hover))] active:bg-[rgb(var(--primary-active))]",
  secondary: "border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--foreground))] hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-elevated))]",
  ghost: "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]",
  danger: "bg-[rgb(var(--danger-solid))] text-white shadow-sm hover:bg-[rgb(var(--danger-solid-hover))] active:brightness-90"
};

const sizes = {
  small: "h-8 px-3 text-[0.8125rem]",
  default: "h-9 px-4 text-sm",
  large: "min-h-12 px-5 text-sm",
  icon: "h-8 w-8 p-0"
};

export function Button({
  href,
  children,
  variant = "primary",
  size = "default",
  className,
  type = "button",
  onClick,
  disabled = false,
  loading = false,
  ...accessibilityProps
}: ButtonProps) {
  const unavailable = disabled || loading;
  const classes = cn(
    "focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-button font-semibold transition-[background-color,border-color,color,transform] duration-fast ease-standard hover:-translate-y-px active:translate-y-0 active:scale-[0.985] disabled:translate-y-0 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transform-none",
    variants[variant],
    sizes[size],
    unavailable && href && "pointer-events-none opacity-55",
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        tabIndex={unavailable ? -1 : undefined}
        onClick={unavailable ? undefined : onClick}
        aria-disabled={unavailable || undefined}
        {...accessibilityProps}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={unavailable}
      aria-busy={loading || undefined}
      {...accessibilityProps}
    >
      {children}
    </button>
  );
}
