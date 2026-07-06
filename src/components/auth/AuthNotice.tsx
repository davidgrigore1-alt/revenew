type AuthNoticeProps = {
  tone: "success" | "warning" | "error" | "info";
  title: string;
  message?: string;
};

export function AuthNotice({ tone, title, message }: AuthNoticeProps) {
  const toneClasses = {
    success: "border-emerald-400/30 bg-emerald-950/30 text-emerald-100",
    warning: "border-amber-300/30 bg-amber-950/20 text-amber-100",
    error: "border-red-400/30 bg-red-950/30 text-red-100",
    info: "border-white/10 bg-white/[0.05] text-zinc-100"
  };

  return (
    <div className={`mt-6 rounded-xl border p-4 text-sm leading-6 ${toneClasses[tone]}`} role={tone === "error" ? "alert" : "status"}>
      <p className="font-semibold">{title}</p>
      {message ? <p className="mt-1 opacity-85">{message}</p> : null}
    </div>
  );
}
