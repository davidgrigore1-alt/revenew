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
  "aria-label"?: string;
  "aria-controls"?: string;
  "aria-expanded"?: boolean;
};

const variants = {
  primary: "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-sm hover:bg-[rgb(var(--primary-hover))] active:bg-[rgb(var(--primary-active))]",
  secondary: "border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--foreground))] shadow-sm hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-muted))]",
  ghost: "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]",
  danger: "bg-[rgb(var(--danger-solid))] text-white shadow-sm hover:bg-[rgb(var(--danger-solid-hover))] active:brightness-90"
};

const sizes = {
  small: "min-h-8 px-3 text-[0.8125rem]",
  default: "min-h-10 px-4 text-sm",
  large: "min-h-12 px-5 text-sm",
  icon: "h-10 w-10 p-0"
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
    "focus-ring inline-flex items-center justify-center gap-2 rounded-button font-semibold transition-colors duration-fast ease-standard disabled:cursor-not-allowed disabled:opacity-55",
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
