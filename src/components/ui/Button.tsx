import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = {
  href?: string;
  children: ReactNode;
  variant?: "primary" | "intelligence" | "secondary" | "ghost" | "danger";
  size?: "small" | "compact" | "default" | "large" | "icon";
  fullWidth?: boolean;
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
  intelligence: "bg-[rgb(var(--intelligence))] text-[rgb(var(--intelligence-foreground))] hover:bg-[rgb(var(--intelligence-hover))] active:bg-[rgb(var(--intelligence-strong))]",
  secondary: "border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] text-[rgb(var(--foreground))] hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-elevated))]",
  ghost: "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]",
  danger: "bg-[rgb(var(--danger-solid))] text-white hover:bg-[rgb(var(--danger-solid-hover))] active:brightness-90"
};

const sizes = {
  small: "min-h-[var(--control-height-compact)] px-3 py-1 text-label",
  compact: "min-h-[var(--control-height-compact)] px-3 py-1 text-label",
  default: "min-h-[var(--control-height)] px-4 py-1.5 text-sm",
  large: "min-h-12 px-5 py-2 text-sm",
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
  fullWidth = false,
  ...accessibilityProps
}: ButtonProps) {
  const unavailable = disabled || loading;
  const classes = cn(
    "rn-button focus-ring relative inline-flex max-w-full shrink-0 self-start justify-self-start items-center justify-center gap-2 rounded-control font-semibold transition-colors duration-100 motion-reduce:transition-none",
    variants[variant],
    sizes[size],
    fullWidth && "w-full",
    className
  );

  const content = <><span className="rn-button-label inline-flex min-w-0 items-center justify-center gap-2">{children}</span>{loading ? <span aria-hidden="true" className="rn-button-spinner absolute size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" /> : null}</>;

  // An unavailable navigation action must not retain an activatable destination.
  if (href && unavailable) {
    return <span role="link" aria-disabled="true" aria-busy={loading || undefined} data-loading={loading || undefined} className={classes} {...accessibilityProps}>{content}</span>;
  }

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        onClick={onClick}
        {...accessibilityProps}
      >
        {content}
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
      data-loading={loading || undefined}
      {...accessibilityProps}
    >
      {content}
    </button>
  );
}
