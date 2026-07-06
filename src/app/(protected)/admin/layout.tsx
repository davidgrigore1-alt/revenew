import Link from "next/link";
import { ForbiddenState } from "@/components/authz/ForbiddenState";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { hasPermission } from "@/lib/authz/has-permission";

const adminLinks = [
  ["Prezentare generală", "/admin"],
  ["Firme", "/admin/businesses"],
  ["Utilizare", "/admin/usage"],
  ["Costuri", "/admin/costs"],
  ["Audit", "/admin/audit"],
  ["Sistem", "/admin/system"]
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authorization = await getAuthorizationContext();
  const canAccessAdmin = hasPermission(authorization, "platform.admin.access");

  if (!canAccessAdmin) {
    return (
      <div className="px-4 py-8 sm:px-6 xl:px-8">
        <ForbiddenState
          title="Nu ai permisiunea necesară pentru a accesa această secțiune."
          description="Accesul Admin este controlat server-side prin rolurile platformei. Datele protejate nu au fost încărcate."
        />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface)_/_0.72)] px-4 py-3 backdrop-blur sm:px-6 xl:px-8">
        <nav aria-label="Admin ReveNew" className="app-scrollbar flex gap-2 overflow-x-auto">
          {adminLinks.map(([label, href]) => (
            <Link key={href} href={href} className="focus-ring whitespace-nowrap rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-semibold text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
