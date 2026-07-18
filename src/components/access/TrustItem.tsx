import type { ReactNode } from "react";

export function TrustItem({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-3 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-card">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-[rgb(var(--brand-50))] text-[rgb(var(--brand-700))]">{icon}</span>
      <div>
        <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{description}</p>
      </div>
    </div>
  );
}
