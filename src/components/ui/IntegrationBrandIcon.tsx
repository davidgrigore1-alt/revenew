import Image from "next/image";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";

export type IntegrationBrand = "gmail" | "google_calendar" | "google_drive" | "revenew";

const sources: Record<Exclude<IntegrationBrand, "revenew">, { src: string; label: string }> = {
  google_drive: { src: "/brands/applications/google-drive.svg", label: "Google Drive" },
  gmail: { src: "/brands/google/gmail.svg", label: "Gmail" },
  google_calendar: { src: "/brands/google/calendar.svg", label: "Google Calendar" }
};

export function IntegrationBrandIcon({ provider, size = "medium", className, withContainer = true }: { provider: IntegrationBrand; size?: "small" | "medium" | "large"; className?: string; withContainer?: boolean }) {
  const pixels = size === "small" ? 16 : size === "large" ? 28 : 20;
  const dimensions = size === "small" ? "h-6 w-6 rounded-md" : size === "large" ? "h-11 w-11 rounded-[10px]" : "h-9 w-9 rounded-[9px]";
  if (provider === "revenew") return <span role="img" aria-label="ReveNew" className={cn("grid shrink-0 place-items-center border border-[rgb(var(--primary-border))] bg-[rgb(var(--primary-soft))] text-[rgb(var(--primary))]", dimensions, className)}><span className={cn("font-black tracking-[-0.06em]", size === "small" ? "text-[0.5rem]" : "text-[0.65rem]")} aria-hidden="true">{brand.mark}</span></span>;
  const source = sources[provider];
  const image = <Image src={source.src} alt={source.label} width={pixels} height={pixels} className="object-contain" />;
  if (!withContainer) return <span className={cn("inline-grid shrink-0 place-items-center", className)}>{image}</span>;
  return <span className={cn("grid shrink-0 place-items-center border border-black/5 bg-white shadow-sm", dimensions, className)}>{image}</span>;
}