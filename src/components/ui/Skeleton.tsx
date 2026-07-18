import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  shape?: "line" | "block" | "circle";
};

export function Skeleton({ shape = "block", className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "skeleton-pulse bg-[rgb(var(--surface-muted))]",
        shape === "line" && "h-3 rounded-full",
        shape === "block" && "rounded-control",
        shape === "circle" && "aspect-square rounded-full",
        className
      )}
      {...props}
    />
  );
}
