import type { ReactNode } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { buildSignalPreparation } from "@/lib/ai-preparation";
import { recommendationFeedbackForSignal } from "@/lib/recommendation-feedback";
import type { CommercialSignal } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { StatusPill } from "@/components/ui/StatusPill";

type SignalPreparationPanelProps = {
  signal: CommercialSignal;
  action?: ReactNode;
  compact?: boolean;
};

function DetailList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">{title}</h4>
      {items.length > 0
        ? <ul className="mt-2 grid gap-1.5 text-sm leading-5 text-[rgb(var(--text-secondary))]">{items.map((item) => <li key={item}>• {item}</li>)}</ul>
        : <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">{empty}</p>}
    </div>
  );
}

export function SignalPreparationPanel({ signal, action, compact = false }: SignalPreparationPanelProps) {
  const preparation = buildSignalPreparation(signal);
  const prepared = preparation.mode !== "not_prepared";
  const feedback = recommendationFeedbackForSignal(signal);
  const feedbackMessage = feedback.state === "applied"
    ? feedback.wasEdited ? "Aprobată cu modificări. Schimbarea internă a fost aplicată." : "Recomandarea a fost aprobată și aplicată."
    : feedback.state === "rejected" || feedback.state === "not_useful"
      ? "Respinsă cu motiv."
      : feedback.state === "edited_before_approval"
        ? "Modificată și în așteptarea unei decizii umane."
        : "În așteptarea unei decizii umane.";

  return (
    <section aria-labelledby={`signal-preparation-${signal.id}`} className="overflow-hidden rounded-card border border-[rgb(var(--gold-500)/0.3)] bg-[linear-gradient(145deg,rgb(var(--surface)),rgb(var(--surface-subtle)))] shadow-card">
      <div className="flex flex-col gap-3 border-b border-[rgb(var(--border))] p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-control border border-[rgb(var(--gold-500)/0.28)] bg-[rgb(var(--gold-100)/0.5)] text-[rgb(var(--gold-700))] dark:bg-[rgb(var(--gold-700)/0.12)] dark:text-[rgb(var(--gold-300))]">
            <SparklesIcon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]">Inteligență operațională</p>
            <h3 id={`signal-preparation-${signal.id}`} className="mt-1 font-semibold">{compact ? "Ce a înțeles ReveNew" : "Recomandare structurată pentru revizuire"}</h3>
            <p className="mt-1 text-sm leading-5 text-[rgb(var(--text-muted))]">AI pregătește. Omul aprobă. ReveNew aplică numai schimbări interne confirmate.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={preparation.mode === "ai" ? "info" : prepared ? "neutral" : "warning"}>{preparation.modeLabel}</StatusPill>
          {prepared ? <StatusPill tone={preparation.evidenceStrength === "sufficient" ? "success" : preparation.evidenceStrength === "partial" ? "info" : "warning"}>{preparation.evidenceStrengthLabel}</StatusPill> : null}
          {action}
        </div>
      </div>

      {prepared && compact ? (
        <div className="grid gap-4 p-4 sm:p-5">
          <div className="grid gap-px overflow-hidden rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--border))] sm:grid-cols-3">
            <div className="bg-[rgb(var(--surface))] p-3.5">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">Situație</p>
              <p className="mt-2 text-sm leading-5 text-[rgb(var(--text-secondary))]">{preparation.summary}</p>
            </div>
            <div className="bg-[rgb(var(--surface))] p-3.5">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">Dovadă</p>
              <p className="mt-2 text-sm font-medium leading-5 text-[rgb(var(--foreground))]">{preparation.evidence[0] ?? signal.sourceLabel ?? "Semnal comercial înregistrat"}</p>
            </div>
            <div className="bg-[rgb(var(--surface))] p-3.5">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">Ce lipsește</p>
              <p className="mt-2 text-sm leading-5 text-[rgb(var(--text-secondary))]">{preparation.missingInfo[0] ?? "Nu a fost identificată o lipsă critică."}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-control border border-[rgb(var(--brand-500)/0.26)] bg-[rgb(var(--brand-50)/0.58)] p-4 dark:bg-[rgb(var(--brand-950)/0.34)] sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">Acțiune sigură recomandată</p>
              <p className="mt-1 text-sm font-semibold leading-5">{preparation.recommendedNextAction}</p>
              <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">De ce acum:</strong> {preparation.whyNow}</p>
              <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Necesită verificare și decizie umană.</p>
            </div>
            {signal.estimatedRecoverableValue !== null && signal.estimatedRecoverableValue !== undefined ? (
              <div className="shrink-0 sm:text-right">
                <p className="text-xs text-[rgb(var(--text-muted))]">Valoare estimată, neconfirmată</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(Number(signal.estimatedRecoverableValue), signal.currency)}</p>
              </div>
            ) : null}
          </div>

          <details open className="group rounded-control border border-[rgb(var(--primary)/0.24)] bg-[rgb(var(--surface))]">
            <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-control px-3 py-2 text-sm font-semibold marker:hidden">
              <span><span className="block">Context pentru decizie</span><span className="mt-0.5 block text-xs font-normal text-[rgb(var(--text-muted))]">Dovezi, riscuri și informații lipsă</span></span>
              <span aria-hidden="true" className="text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="grid gap-4 border-t border-[rgb(var(--border))] p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailList title="Dovezi din semnal" items={preparation.evidence} empty="Nu există încă dovezi structurate suficiente." />
                <DetailList title="Riscuri / neclarități" items={preparation.risks} empty="Nu au fost identificate riscuri suplimentare; contextul rămâne de verificat." />
              </div>
              <div><h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Riscul inacțiunii</h4><p className="mt-2 text-sm leading-5 text-[rgb(var(--text-secondary))]">{preparation.consequenceOfInaction}</p></div>
              <DetailList title="Informații lipsă" items={preparation.missingInfo} empty="Nu au fost identificate lipsuri critice." />
              <div className="rounded-control bg-[rgb(var(--surface-subtle))] p-3">
                <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Notă internă sugerată</h4>
                <p className="mt-2 text-sm leading-5 text-[rgb(var(--text-secondary))]">{preparation.internalNote}</p>
                {preparation.emailDraft ? <><h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Draft propus</h4><p className="mt-2 whitespace-pre-line text-sm leading-5 text-[rgb(var(--text-secondary))]">{preparation.emailDraft}</p></> : null}
              </div>
            </div>
          </details>
        </div>
      ) : prepared ? (
        <div className={`grid gap-5 p-4 sm:p-5 ${compact ? "" : "lg:grid-cols-2"}`}>
          <div className="grid gap-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Ce a detectat ReveNew</h4>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{preparation.summary}</p>
            </div>
            <dl className="grid gap-3 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-[rgb(var(--text-muted))]">Intenție probabilă</dt><dd className="mt-1 font-semibold">{preparation.intent}</dd></div>
              <div><dt className="text-xs text-[rgb(var(--text-muted))]">Forța dovezilor</dt><dd className="mt-1 font-semibold">{preparation.evidenceStrengthLabel}</dd></div>
              <div><dt className="text-xs text-[rgb(var(--text-muted))]">Înregistrare afectată</dt><dd className="mt-1 font-medium">{preparation.affectedRecord}</dd></div>
              <div><dt className="text-xs text-[rgb(var(--text-muted))]">Termen sugerat</dt><dd className="mt-1 font-medium">{preparation.suggestedActionDueHint}</dd></div>
            </dl>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Următoarea acțiune recomandată</h4>
              <p className="mt-2 text-sm font-semibold leading-5">{preparation.recommendedNextAction}</p>
              <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">De ce acum:</strong> {preparation.whyNow}</p>
              <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{preparation.approvalRecommendation}</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailList title="Dovezi din semnal" items={preparation.evidence} empty="Nu există încă dovezi structurate suficiente." />
              <DetailList title="Riscuri / neclarități" items={preparation.risks} empty="Nu au fost identificate riscuri suplimentare; contextul rămâne de verificat." />
            </div>
            <DetailList title="Informații lipsă" items={preparation.missingInfo} empty="Nu au fost identificate lipsuri critice." />
            <div className="rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
              <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Notă internă sugerată</h4>
              <p className="mt-2 text-sm leading-5 text-[rgb(var(--text-secondary))]">{preparation.internalNote}</p>
              {preparation.emailDraft ? <><h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Draft propus</h4><p className="mt-2 whitespace-pre-line text-sm leading-5 text-[rgb(var(--text-secondary))]">{preparation.emailDraft}</p></> : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-2 p-4 sm:p-5">
          <p className="text-sm font-medium">Pregătirea pornește numai după acțiunea ta explicită.</p>
          <p className="text-sm leading-5 text-[rgb(var(--text-muted))]">Dacă serviciul de analiză asistată nu este disponibil, ReveNew folosește reguli locale și marchează clar rezultatul.</p>
        </div>
      )}

      <div className="flex flex-col gap-1 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-muted)/0.5)] px-4 py-3 text-xs sm:px-5">
        {prepared ? <span className="font-semibold text-[rgb(var(--text-secondary))]">{feedbackMessage}</span> : null}
        <span className="font-medium text-[rgb(var(--text-muted))]">Nu se aplică și nu se trimite nimic fără aprobare. Nimic nu este trimis extern.</span>
      </div>
    </section>
  );
}
