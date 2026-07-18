import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

type EmptyStateProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export function EmptyState({ title, description, actions }: EmptyStateProps) {
  return (
    <Card variant="subtle" padding="spacious" className="border-dashed text-center">
      <h2 className="text-lg font-semibold text-[rgb(var(--foreground))]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[rgb(var(--text-muted))]">{description}</p>
      {actions ? <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </Card>
  );
}
