import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "subtle" | "muted" | "elevated" | "interactive";
  padding?: "none" | "compact" | "default" | "spacious";
};

const variants = {
  default: "border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card",
  subtle: "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]",
  muted: "border-transparent bg-[rgb(var(--surface-muted))]",
  elevated: "border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-elevated",
  interactive: "border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card transition-[border-color,box-shadow] duration-normal hover:border-[rgb(var(--border-strong))] hover:shadow-elevated"
};

const paddings = {
  none: "",
  compact: "p-4",
  default: "p-5",
  spacious: "p-6"
};

export function Card({ variant = "default", padding = "default", className, ...props }: CardProps) {
  return <div className={cn("rounded-card border", variants[variant], paddings[padding], className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-card-title font-semibold tracking-[-0.01em] text-[rgb(var(--foreground))]", className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-6 text-[rgb(var(--text-muted))]", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-5", className)} {...props} />;
}

export function CardActions({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-5 flex flex-wrap items-center gap-2", className)} {...props} />;
}
