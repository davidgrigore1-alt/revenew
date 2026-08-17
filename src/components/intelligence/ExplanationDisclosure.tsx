import Link from "next/link";
import { ArrowRightIcon, DocumentMagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { ReveNewExplanation } from "@/lib/revenew-explanation";
import { formatCurrency, formatDate } from "@/lib/utils";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-t border-[rgb(var(--border))] pt-3 first:border-t-0 first:pt-0"><h4 className="text-xs font-semibold text-[rgb(var(--foreground))]">{title}</h4>{children}</section>;
}

export function ExplanationDisclosure({ explanation, controlLabel = "De ce apare?", className = "" }: {
  explanation?: ReveNewExplanation | null;
  controlLabel?: "De ce apare?" | "De ce este prioritar?" | "De unde vine valoarea?";
  className?: string;
}) {
  if (explanation === null) return <p className={`text-xs text-[rgb(var(--warning-text))] ${className}`}>Nu am putut încărca detaliile explicației.</p>;
  if (!explanation) return <p className={`text-xs text-[rgb(var(--text-muted))] ${className}`}>Nu există suficiente date pentru o explicație mai detaliată.</p>;

  const hasDetail = explanation.facts.length > 0 || explanation.derivedInsights.length > 0 || explanation.evidence.length > 0
    || explanation.missingInformation.length > 0 || explanation.assumptions.length > 0 || Boolean(explanation.valueProvenance) || Boolean(explanation.safeAction);
  if (!hasDetail) return <p className={`text-xs text-[rgb(var(--text-muted))] ${className}`}>Nu există suficiente date pentru o explicație mai detaliată.</p>;

  const value = explanation.valueProvenance;
  return (
    <details className={`group rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] ${className}`}>
      <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-control px-3 py-2 text-sm font-semibold marker:hidden">
        <span className="flex items-center gap-2"><DocumentMagnifyingGlassIcon className="h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />{controlLabel}</span>
        <span aria-hidden="true" className="text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="grid gap-3 border-t border-[rgb(var(--border))] p-3 text-xs leading-5">
        <Section title="De ce apare"><p className="mt-1 text-[rgb(var(--text-muted))]">{explanation.reason}</p></Section>
        {explanation.facts.length > 0 ? <Section title="Fapte"><ul className="mt-1 grid gap-1 text-[rgb(var(--text-muted))]">{explanation.facts.map((fact, index) => <li key={`${fact.label}-${index}`}>• <span className="font-medium text-[rgb(var(--foreground))]">{fact.label}</span>{fact.value ? `: ${fact.value}` : ""}</li>)}</ul></Section> : null}
        {explanation.derivedInsights.length > 0 ? <Section title="Interpretare ReveNew"><ul className="mt-1 grid gap-1 text-[rgb(var(--text-muted))]">{explanation.derivedInsights.map((insight, index) => <li key={`${insight.label}-${index}`}>• <span className="font-medium text-[rgb(var(--foreground))]">{insight.label}</span>{insight.detail ? ` — ${insight.detail}` : ""}</li>)}</ul></Section> : null}
        {explanation.missingInformation.length > 0 ? <Section title="Ce lipsește"><ul className="mt-1 grid gap-1 text-[rgb(var(--text-muted))]">{explanation.missingInformation.map((item) => <li key={item}>• {item}</li>)}</ul></Section> : null}
        {explanation.assumptions.length > 0 ? <Section title="Limită"><ul className="mt-1 grid gap-1 text-[rgb(var(--text-muted))]">{explanation.assumptions.map((item) => <li key={item}>• {item}</li>)}</ul></Section> : null}
        {value ? <Section title="De unde vine valoarea"><p className="mt-1 font-semibold text-[rgb(var(--foreground))]">{formatCurrency(value.amount, value.currency)}</p><p className="text-[rgb(var(--text-muted))]">{value.kind === "estimated_unconfirmed" ? "Valoare estimată, neconfirmată." : value.kind === "explicit_source" ? "Valoare menționată explicit în sursă; nu este venit confirmat." : "Valoare confirmată în datele disponibile."} Sursă: {value.sourceHref ? <Link href={value.sourceHref} className="focus-ring rounded-sm font-semibold text-[rgb(var(--primary))] hover:underline">{value.sourceLabel}</Link> : value.sourceLabel}</p></Section> : null}
        {explanation.evidence.length > 0 ? <Section title="Surse"><ul className="mt-1 grid gap-1.5 text-[rgb(var(--text-muted))]">{explanation.evidence.map((item) => <li key={`${item.id}-${item.sourceTypeLabel}`} className="min-w-0">• <span>{item.sourceTypeLabel}: </span>{item.href ? <Link href={item.href} className="focus-ring break-words rounded-sm font-semibold text-[rgb(var(--primary))] hover:underline">{item.label}</Link> : <span className="break-words font-medium text-[rgb(var(--foreground))]">{item.label}</span>}{item.occurredAt ? <span> · {formatDate(item.occurredAt)}</span> : null}</li>)}</ul>{explanation.hiddenEvidenceCount > 0 ? <p className="mt-1 text-[rgb(var(--text-faint))]">+{explanation.hiddenEvidenceCount} alte dovezi</p> : null}</Section> : null}
        {explanation.safeAction ? <Section title="Ce poți face"><p className="mt-1 text-[rgb(var(--text-muted))]">{explanation.safeAction.guidance ?? "Verifică sursele înainte de orice acțiune cu impact comercial."}</p><Link href={explanation.safeAction.href} className="focus-ring mt-1 inline-flex min-h-8 items-center gap-1 rounded-button font-semibold text-[rgb(var(--primary))] hover:underline">{explanation.safeAction.label}<ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" /></Link></Section> : null}
      </div>
    </details>
  );
}
