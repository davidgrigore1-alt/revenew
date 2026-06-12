import { cn } from "@/lib/utils";

type StatusNoticeProps = {
  tone?: "success" | "warning" | "error" | "neutral";
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

const tones = {
  success: "border-mint-400/20 bg-mint-400/10 text-mint-100",
  warning: "border-gold-400/20 bg-gold-400/10 text-gold-100",
  error: "border-red-400/20 bg-red-400/10 text-red-100",
  neutral: "border-white/10 bg-white/[0.05] text-zinc-200"
};

export function StatusNotice({ tone = "neutral", children, action, className }: StatusNoticeProps) {
  return (
    <div className={cn("rounded-lg border p-3 text-sm leading-6", tones[tone], className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>{children}</div>
        {action}
      </div>
    </div>
  );
}
