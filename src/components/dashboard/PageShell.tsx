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
};

export function PageShell({ title, eyebrow, description, children, actions, breadcrumbs }: PageShellProps) {
  return (
    <section className="app-page mx-auto min-w-0 w-full max-w-[1440px] px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:px-8 lg:pb-8">
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      <PageHeader eyebrow={eyebrow} title={title} description={description}>
        {actions}
      </PageHeader>
      <ContextualPageGuide className="mt-4" />
      {children ? <div className="app-section-stack mt-6">{children}</div> : null}
    </section>
  );
}
