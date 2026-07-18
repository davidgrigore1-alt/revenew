import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

type DataCardProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  action?: ReactNode;
};

export function DataCard({ title, description, children, action }: DataCardProps) {
  return (
    <Card as="section">
      <div className="flex items-start justify-between gap-4">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}
