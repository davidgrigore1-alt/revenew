import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

type EmptyStateProps = {
  title: string;
  description: string;
  actions?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  icon?: ReactNode;
};

export function EmptyState({ title, description, actions, action, secondaryAction, icon }: EmptyStateProps) {
  return (
    <Card variant="subtle" padding="spacious" className="border-dashed text-center">
      {icon ? <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-control bg-[rgb(var(--surface-muted))] text-[rgb(var(--text-secondary))]">{icon}</div> : null}
      <h2 className="text-lg font-semibold text-[rgb(var(--foreground))]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[rgb(var(--text-muted))]">{description}</p>
      {actions || action || secondaryAction ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}{secondaryAction}{actions}</div> : null}
    </Card>
  );
}
