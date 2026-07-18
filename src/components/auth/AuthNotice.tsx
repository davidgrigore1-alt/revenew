type AuthNoticeProps = {
  tone: "success" | "warning" | "error" | "info";
  title: string;
  message?: string;
};

export function AuthNotice({ tone, title, message }: AuthNoticeProps) {
  const toneClasses = {
    success: "border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] text-[rgb(var(--success-text))]",
    warning: "border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] text-[rgb(var(--warning-text))]",
    error: "border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] text-[rgb(var(--danger-text))]",
    info: "border-[rgb(var(--info-border))] bg-[rgb(var(--info-background))] text-[rgb(var(--info-text))]"
  };

  return (
    <div className={`mt-6 rounded-control border p-4 text-sm leading-6 ${toneClasses[tone]}`} role={tone === "error" ? "alert" : "status"}>
      <p className="font-semibold">{title}</p>
      {message ? <p className="mt-1 opacity-85">{message}</p> : null}
    </div>
  );
}
