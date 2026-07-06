import Link from "next/link";
import { NavigationIcon } from "@/components/dashboard/NavigationIcon";
import { PageShell } from "@/components/dashboard/PageShell";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";
import type { Permission } from "@/lib/authz/permissions";
import type { NavigationIconName } from "@/lib/navigation";

export const dynamic = "force-dynamic";

type ToolModule = {
  title: string;
  description: string;
  href: string;
  icon: NavigationIconName;
  permission: Permission;
  eyebrow: string;
  emphasis?: "primary" | "wide" | "internal";
};

const workflowSteps = [
  { label: "Primești cererea", href: "/inbox" },
  { label: "Verifici potențialul", href: "/opportunities/analyze" },
  { label: "Acționezi", href: "/outreach" },
  { label: "Urmărești rezultatul", href: "/reports" }
] as const;

const requestModules: ToolModule[] = [
  {
    title: "Inbox Comercial",
    description: "Revizuiește cererile și semnalele comerciale primite.",
    href: "/inbox",
    icon: "inbox-stack",
    permission: "signals.read",
    eyebrow: "Cereri"
  },
  {
    title: "Lead-uri",
    description: "Organizează firmele și persoanele cu potențial comercial.",
    href: "/leads",
    icon: "user-group",
    permission: "workspace.read",
    eyebrow: "Contacte"
  }
];

const executionModules: ToolModule[] = [
  {
    title: "Oportunități",
    description: "Urmărește oportunitățile active și următorul pas recomandat.",
    href: "/opportunities",
    icon: "sparkles",
    permission: "opportunities.read",
    eyebrow: "Prioritate",
    emphasis: "primary"
  },
  {
    title: "Verifică potențialul",
    description: "Transformă o cerere într-o oportunitate evaluată.",
    href: "/opportunities/analyze",
    icon: "sparkles",
    permission: "opportunities.analyze",
    eyebrow: "Validare"
  },
  {
    title: "Outreach",
    description: "Pregătește mesajele și pașii de contact comercial.",
    href: "/outreach",
    icon: "megaphone",
    permission: "documents.read",
    eyebrow: "Execuție"
  }
];

const analysisModules: ToolModule[] = [
  {
    title: "Rapoarte detaliate",
    description: "Analizează activitatea, rezultatele și oportunitățile pierdute.",
    href: "/reports",
    icon: "chart-bar",
    permission: "reports.read",
    eyebrow: "Rezultate",
    emphasis: "wide"
  }
];

const internalModules: ToolModule[] = [
  {
    title: "Admin",
    description: "Control center pentru operare internă și administrarea platformei.",
    href: "/admin",
    icon: "shield-check",
    permission: "platform.admin.access",
    eyebrow: "Platformă",
    emphasis: "internal"
  },
  {
    title: "Demo",
    description: "Scenarii de prezentare disponibile doar echipei ReveNew.",
    href: "/demo",
    icon: "clipboard-check",
    permission: "platform.internal_tools.access",
    eyebrow: "Intern",
    emphasis: "internal"
  },
  {
    title: "Costuri provider",
    description: "Monitorizare internă pentru costuri și consum operațional.",
    href: "/admin/costs",
    icon: "chart-bar",
    permission: "platform.usage.read_all",
    eyebrow: "Intern",
    emphasis: "internal"
  },
  {
    title: "Audit",
    description: "Evenimente interne de securitate și roluri platformă.",
    href: "/admin/audit",
    icon: "shield-check",
    permission: "platform.audit.read",
    eyebrow: "Intern",
    emphasis: "internal"
  },
  {
    title: "System Health",
    description: "Stare operațională pentru componentele platformei.",
    href: "/admin/system",
    icon: "cog",
    permission: "platform.system_health.read",
    eyebrow: "Intern",
    emphasis: "internal"
  }
];

function filterModules(modules: ToolModule[], authorization: Awaited<ReturnType<typeof getAuthorizationContext>>) {
  return modules.filter((module) => hasPermission(authorization, module.permission));
}

function ToolModuleCard({ module }: { module: ToolModule }) {
  const isPrimary = module.emphasis === "primary";
  const isWide = module.emphasis === "wide";
  const isInternal = module.emphasis === "internal";

  return (
    <Link
      href={module.href}
      className={[
        "focus-ring group relative flex min-h-36 flex-col justify-between rounded-xl border p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]",
        isPrimary ? "border-[rgb(var(--primary)_/_0.35)] bg-[rgb(var(--primary)_/_0.1)] md:row-span-2 md:min-h-[18rem]" : "",
        isWide ? "border-[rgb(var(--border))] bg-[rgb(var(--surface))] md:col-span-2" : "",
        isInternal ? "border-dashed border-[rgb(var(--border))] bg-[rgb(var(--muted))]" : "",
        !isPrimary && !isWide && !isInternal ? "border-[rgb(var(--border))] bg-[rgb(var(--surface))]" : ""
      ].join(" ")}
    >
      <span className="flex items-start justify-between gap-4">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] text-[rgb(var(--primary))]">
          <NavigationIcon name={module.icon} className="h-5 w-5" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">{module.eyebrow}</span>
      </span>
      <span className="mt-5 block">
        <span className={isPrimary ? "block text-2xl font-semibold text-[rgb(var(--foreground))]" : "block text-lg font-semibold text-[rgb(var(--foreground))]"}>
          {module.title}
        </span>
        <span className="mt-2 block text-sm leading-6 text-[rgb(var(--muted-foreground))]">{module.description}</span>
      </span>
      <span className="mt-5 text-sm font-semibold text-[rgb(var(--primary))] transition group-hover:translate-x-1">Deschide</span>
    </Link>
  );
}

function ModuleSection({ title, modules, layout = "grid" }: { title: string; modules: ToolModule[]; layout?: "grid" | "execution" }) {
  if (!modules.length) return null;

  return (
    <section className="grid gap-4">
      <h2 className="text-xl font-semibold text-[rgb(var(--foreground))]">{title}</h2>
      <div className={layout === "execution" ? "grid gap-4 md:grid-cols-[1.12fr_0.88fr]" : "grid gap-4 md:grid-cols-2"}>
        {layout === "execution" && modules.length > 1 ? (
          <>
            <ToolModuleCard module={modules[0]} />
            <div className="grid gap-4">{modules.slice(1).map((module) => <ToolModuleCard key={module.href} module={module} />)}</div>
          </>
        ) : (
          modules.map((module) => <ToolModuleCard key={module.href} module={module} />)
        )}
      </div>
    </section>
  );
}

export default async function ToolsPage() {
  const authorization = await getAuthorizationContext();
  const requestTools = filterModules(requestModules, authorization);
  const executionTools = filterModules(executionModules, authorization);
  const analysisTools = filterModules(analysisModules, authorization);
  const internalTools = filterModules(internalModules, authorization);

  return (
    <PageShell eyebrow="Instrumente" title="Instrumente" description="De la cererea inițială până la acțiune și rezultat.">
      <div className="grid gap-8">
        <nav aria-label="Flux comercial ReveNew" className="grid gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 sm:grid-cols-2 lg:grid-cols-4">
          {workflowSteps.map((step, index) => (
            <Link key={step.href} href={step.href} className="focus-ring rounded-lg px-3 py-3 transition hover:bg-[rgb(var(--muted))]">
              <span className="text-xs font-semibold text-[rgb(var(--primary))]">{index + 1}.</span>
              <span className="ml-2 text-sm font-semibold text-[rgb(var(--foreground))]">{step.label}</span>
            </Link>
          ))}
        </nav>

        <ModuleSection title="Cereri și contacte" modules={requestTools} />
        <ModuleSection title="Oportunități și execuție" modules={executionTools} layout="execution" />
        <ModuleSection title="Analiză și rezultate" modules={analysisTools} />

        {internalTools.length ? (
          <section className="grid gap-4 border-t border-[rgb(var(--border))] pt-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted-foreground))]">Intern</p>
              <h2 className="mt-2 text-xl font-semibold text-[rgb(var(--foreground))]">Instrumente interne</h2>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">Instrumente disponibile doar echipei ReveNew.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {internalTools.map((module) => <ToolModuleCard key={module.href} module={module} />)}
            </div>
          </section>
        ) : null}
      </div>
    </PageShell>
  );
}
