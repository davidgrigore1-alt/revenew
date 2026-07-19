import { ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type AssistedPreparationProps = {
  context: string;
  suggestion: string;
  reason: string;
  missingInformation?: string[];
  href?: string;
  actionLabel?: string;
};

export function AssistedPreparation({
  context,
  suggestion,
  reason,
  missingInformation = [],
  href,
  actionLabel = "Revizuiește oportunitatea"
}: AssistedPreparationProps) {
  return (
    <Card as="section" variant="subtle" padding="default" aria-labelledby="assisted-preparation-title" className="overflow-hidden border-[rgb(var(--gold-300)/0.5)] dark:border-[rgb(var(--gold-700)/0.45)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-[rgb(var(--gold-100))] text-[rgb(var(--gold-700))] dark:bg-[rgb(var(--gold-700)/0.16)] dark:text-[rgb(var(--gold-300))]">
          <ClipboardDocumentCheckIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]">Pregătire asistată</p>
          <h2 id="assisted-preparation-title" className="mt-1 text-section-title font-semibold tracking-[-0.015em]">Pregătire pentru următoarea acțiune</h2>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">{context}</p>
        </div>
      </div>
      <dl className="mt-5 grid gap-4 border-t border-[rgb(var(--border))] pt-4 md:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Pas sugerat</dt>
          <dd className="mt-1 font-semibold text-[rgb(var(--foreground))]">{suggestion}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">De ce</dt>
          <dd className="mt-1 text-sm leading-6 text-[rgb(var(--text-secondary))]">{reason}</dd>
        </div>
      </dl>
      {missingInformation.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Informații de confirmat</p>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Informații lipsă">
            {missingInformation.map((item) => <li key={item} className="status-pill status-pill-warning">{item}</li>)}
          </ul>
        </div>
      ) : null}
      <div className="mt-5 flex flex-col gap-3 border-t border-[rgb(var(--border))] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-xs leading-5 text-[rgb(var(--text-muted))]">ReveNew pregătește și explică acest pas. Nu trimite mesaje, nu contactează clienți și nu modifică date fără acțiunea explicită a utilizatorului.</p>
        {href ? <Button href={href} variant="secondary" size="small" className="shrink-0">{actionLabel}</Button> : null}
      </div>
    </Card>
  );
}
