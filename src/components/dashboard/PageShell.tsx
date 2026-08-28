import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/dashboard/Breadcrumbs";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ContextualPageGuide } from "@/components/guidance/ContextualPageGuide";

type PageShellProps = {
  title: string;
  eyebrow: string;
  description: string;
  children?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  showGuide?: boolean;
  wide?: boolean;
};

export function PageShell({ title, eyebrow, description, children, actions, breadcrumbs, showGuide = false, wide = false }: PageShellProps) {
  return (
    <div className={`app-page mx-auto min-w-0 w-full ${wide ? "max-w-[1760px]" : "max-w-[1480px]"} px-4 py-4 pb-24 sm:px-6 sm:py-5 lg:px-8 lg:pb-8`}>
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      <PageHeader eyebrow={eyebrow} title={title} description={description}>
        {actions}
      </PageHeader>
      {children ? <div className="app-section-stack mt-5">{children}</div> : null}
      {showGuide ? <ContextualPageGuide className="mt-8 border-t border-[rgb(var(--border))] pt-4" /> : null}
    </div>
  );
}
