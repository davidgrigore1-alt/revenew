import type { ReactNode } from "react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type PricingCardProps = {
  eyebrow: string;
  title: string;
  price: string;
  billing: string;
  description: string;
  audience: string;
  items: readonly string[];
  action?: ReactNode;
  selected?: boolean;
  featured?: boolean;
  className?: string;
};

export function PricingCard({ eyebrow, title, price, billing, description, audience, items, action, selected = false, featured = false, className }: PricingCardProps) {
  return (
    <article className={cn("relative flex min-h-full flex-col rounded-panel border bg-[rgb(var(--surface))] p-5 text-[rgb(var(--foreground))] shadow-[0_18px_50px_rgba(15,23,42,0.07)] transition-[border-color,box-shadow,transform] duration-normal ease-standard hover:-translate-y-1 hover:shadow-[0_24px_64px_rgba(15,23,42,0.11)] sm:p-6", featured ? "border-[rgb(var(--brand-600))]" : "border-[rgb(var(--border))]", className)}>
      {featured ? <span aria-hidden="true" className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#12b981] to-transparent" /> : null}
      <div className="flex min-h-6 items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">{eyebrow}</p>
        {selected ? <Badge tone="success">Selectat</Badge> : null}
      </div>
      <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="mt-5 flex flex-wrap items-end gap-x-2 gap-y-1">
        <strong className="text-3xl font-semibold tracking-[-0.035em]">{price}</strong>
        <span className="pb-1 text-sm text-[rgb(var(--text-muted))]">{billing}</span>
      </p>
      <p className="mt-4 text-sm leading-6 text-[rgb(var(--text-secondary))]">{description}</p>
      <p className="mt-4 rounded-control bg-[rgb(var(--surface-muted))] px-3 py-2.5 text-xs leading-5 text-[rgb(var(--text-secondary))]"><strong>Pentru:</strong> {audience}</p>
      <ul className="mt-5 flex-1 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-5 text-[rgb(var(--text-secondary))]">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--brand-600))]" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {action ? <div className="mt-6">{action}</div> : null}
    </article>
  );
}
