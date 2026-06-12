import { PageHeader } from "@/components/dashboard/PageHeader";

type PageShellProps = {
  title: string;
  eyebrow: string;
  description: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
};

export function PageShell({ title, eyebrow, description, children, actions }: PageShellProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 pb-24 sm:px-6 lg:px-8 xl:pb-8">
      <PageHeader eyebrow={eyebrow} title={title} description={description}>
        {actions}
      </PageHeader>
      <div className="mt-8">{children}</div>
    </section>
  );
}
