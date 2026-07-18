import type { ReactNode } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";

type PageShellProps = {
  title: string;
  eyebrow: string;
  description: string;
  children?: ReactNode;
  actions?: ReactNode;
};

export function PageShell({ title, eyebrow, description, children, actions }: PageShellProps) {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-6 pb-24 sm:px-6 sm:py-7 lg:px-8 lg:pb-8">
      <PageHeader eyebrow={eyebrow} title={title} description={description}>
        {actions}
      </PageHeader>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}
