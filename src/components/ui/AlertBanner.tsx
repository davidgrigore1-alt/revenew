import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AlertBannerProps = {
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

const tones = {
  neutral: "border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] text-[rgb(var(--text-secondary))]",
  info: "border-[rgb(var(--info-border))] bg-[rgb(var(--info-background))] text-[rgb(var(--info-text))]",
  success: "border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] text-[rgb(var(--success-text))]",
  warning: "border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] text-[rgb(var(--warning-text))]",
  danger: "border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] text-[rgb(var(--danger-text))]"
};

export function AlertBanner({ tone = "neutral", title, children, action, className }: AlertBannerProps) {
  const role = tone === "danger" ? "alert" : "status";

  return (
    <div role={role} className={cn("rounded-control border p-4 text-sm", tones[tone], className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {title ? <p className="font-semibold">{title}</p> : null}
          <div className={cn("leading-6", title && "mt-1")}>{children}</div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
