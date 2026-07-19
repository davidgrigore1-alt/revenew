import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/dashboard/Breadcrumbs";
import { PageHeader } from "@/components/dashboard/PageHeader";

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
    <section className="mx-auto min-w-0 w-full max-w-[1440px] px-4 py-6 pb-24 sm:px-6 sm:py-7 lg:px-8 lg:pb-8">
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      <PageHeader eyebrow={eyebrow} title={title} description={description}>
        {actions}
      </PageHeader>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}
