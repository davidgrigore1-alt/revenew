import type { ReactNode } from "react";
import { AlertBanner, type AlertBannerProps } from "@/components/ui/AlertBanner";
import { cn } from "@/lib/utils";

type StatusNoticeProps = {
  tone?: "success" | "warning" | "error" | "neutral";
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

const toneMap: Record<NonNullable<StatusNoticeProps["tone"]>, NonNullable<AlertBannerProps["tone"]>> = {
  success: "success",
  warning: "warning",
  error: "danger",
  neutral: "neutral"
};

export function StatusNotice({ tone = "neutral", children, action, className }: StatusNoticeProps) {
  return (
    <AlertBanner tone={toneMap[tone]} action={action} className={cn("p-3", className)}>
      {children}
    </AlertBanner>
  );
}
