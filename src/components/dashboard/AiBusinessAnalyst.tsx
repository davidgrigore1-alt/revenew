"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowPathIcon, ArrowRightIcon, ShieldCheckIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { PremiumPanel } from "@/components/dashboard/PremiumPanel";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { analystQuestions, type AiBusinessAnalystResult, type AnalystQuestionId, type AnalystStatus } from "@/lib/ai-business-analyst-core";
import { formatDate } from "@/lib/utils";

const statusCopy: Record<AnalystStatus, { label: string; tone: BadgeTone }> = {
  grounded: { label: "Susținută de dovezi", tone: "success" },
  partial: { label: "Necesită verificare", tone: "warning" },
  insufficient_data: { label: "Date insuficiente", tone: "neutral" }
};

function fallbackMessage(result: AiBusinessAnalystResult) {
  if (result.mode === "ai") return "Analiză asistată, validată strict pe baza dovezilor curente.";
  if (result.fallbackReason === "not_configured") return "Analiză deterministă. ReveNew afișează direct interpretarea verificabilă construită din dovezile curente.";
  if (result.fallbackReason === "provider_failure") return "Analiză deterministă. ReveNew păstrează răspunsul verificabil pe baza acelorași dovezi, fără afirmații nesusținute.";
  if (result.fallbackReason === "usage_unavailable") return "Analiză deterministă. ReveNew afișează interpretarea sigură pe baza datelor existente, în limitele curente de utilizare.";
  return "Interpretare verificabilă limitată la dovezile disponibile. Contextul lipsă nu este completat prin presupuneri.";
}

export function AiBusinessAnalyst() {
  const [result, setResult] = useState<AiBusinessAnalystResult | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<AnalystQuestionId>("first_action");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateAnalysis(questionId: AnalystQuestionId = selectedQuestionId) {
    setSelectedQuestionId(questionId);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/business-analyst", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId }),
        credentials: "same-origin"
      });
      const payload = await response.json() as AiBusinessAnalystResult | { error?: string };
      if (!response.ok || !("status" in payload)) {
        throw new Error("error" in payload && payload.error ? payload.error : "Analiza nu a putut fi pregătită.");
      }
      setResult(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Analiza nu a putut fi pregătită.");
    } finally {
      setLoading(false);
    }
  }

  const status = result ? statusCopy[result.status] : null;
  const showMissingInformation = Boolean(result && (result.missingInformation.length > 0 || result.questionId === "missing_information"));

  return (
    <PremiumPanel tone="subtle" className="overflow-hidden" aria-labelledby="ai-business-analyst-title">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-[rgb(var(--brand-500)/0.28)] bg-[rgb(var(--brand-50))] text-[rgb(var(--primary))] dark:bg-[rgb(var(--brand-950))]">
            <SparklesIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.11em] text-[rgb(var(--primary))]">Analist business</p>
            <h2 id="ai-business-analyst-title" className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[rgb(var(--foreground))]">Analiză executivă</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[rgb(var(--text-muted))]">Explică brief-ul și deciziile prioritare folosind numai dovezile existente în spațiul de lucru. Analiza este generată doar la cerere și nu execută acțiuni.</p>
          </div>
        </div>
        <Button onClick={() => generateAnalysis()} disabled={loading} variant={result ? "secondary" : "primary"} className="w-full shrink-0 sm:w-auto">
          {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <SparklesIcon className="h-4 w-4" aria-hidden="true" />}
          {loading ? "Se pregătește răspunsul" : result ? "Regenerează răspunsul" : "Generează răspunsul"}
        </Button>
      </div>

      <div className="border-t border-[rgb(var(--border))] px-5 py-4 sm:px-6">
        <p className="text-xs font-semibold text-[rgb(var(--text-muted))]">Alege o întrebare executivă</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Întrebări executive disponibile">
          {analystQuestions.map((question) => {
            const selected = question.id === selectedQuestionId;
            return (
              <button
                key={question.id}
                type="button"
                aria-pressed={selected}
                disabled={loading}
                onClick={() => generateAnalysis(question.id)}
                className={`focus-ring min-h-9 rounded-full border px-3.5 text-xs font-semibold transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-55 ${selected ? "border-[rgb(var(--brand-500))] bg-[rgb(var(--brand-50))] text-[rgb(var(--brand-800))] dark:bg-[rgb(var(--brand-950))] dark:text-[rgb(var(--brand-300))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text-muted))] hover:border-[rgb(var(--border-strong))] hover:text-[rgb(var(--foreground))]"}`}
              >
                {question.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-faint))]">Întrebările sunt fixe. ReveNew nu trimite către provider text introdus liber de utilizator.</p>
      </div>

      <div aria-live="polite">
        {error ? (
          <div className="border-t border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] px-5 py-4 text-sm text-[rgb(var(--danger-text))] sm:px-6">
            <p className="font-semibold">Analiza nu este disponibilă</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : null}

        {result && status ? (
          <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={status.tone}>{status.label}</Badge>
              <span className="text-xs font-semibold text-[rgb(var(--text-muted))]">{result.mode === "ai" ? "Analiză asistată" : "Analiză deterministă"}</span>
              <span className="text-xs text-[rgb(var(--text-faint))] sm:ml-auto">Bazată pe datele existente din spațiul de lucru</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]">{fallbackMessage(result)}</p>
            <p className="mt-3 text-sm font-semibold text-[rgb(var(--foreground))]">{result.questionLabel}</p>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
              <div className="grid gap-3 sm:grid-cols-2">
                <section className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Răspuns</p>
                  <p className="mt-2 text-base font-semibold leading-6 text-[rgb(var(--foreground))]">{result.executiveSummary.text}</p>
                </section>
                <section className="rounded-card border border-[rgb(var(--border))] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Principalul risc</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[rgb(var(--foreground))]">{result.topRisk.text}</p>
                </section>
                <section className="rounded-card border border-[rgb(var(--border))] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">De ce contează</p>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{result.whyItMatters.text}</p>
                </section>
              </div>

              <section className="rounded-card border border-[rgb(var(--brand-500)/0.3)] bg-[rgb(var(--brand-50)/0.48)] p-4 dark:bg-[rgb(var(--brand-950)/0.28)]">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">Prima acțiune sigură</p>
                <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">Recomandare pentru revizuire; nu este executată de sistem.</p>
                <Button href={result.firstSafeAction.route} className="mt-4 w-full">{result.firstSafeAction.label} <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
              </section>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <section className="rounded-card border border-[rgb(var(--border))] p-4">
                <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">Dovezi folosite</h3>
                {result.evidenceUsed.length > 0 ? (
                  <ul className="mt-3 grid gap-2.5">
                    {result.evidenceUsed.map((evidence) => (
                      <li key={evidence.id} className="text-xs leading-5 text-[rgb(var(--text-muted))]">
                        <Link href={evidence.route} className="focus-ring font-semibold text-[rgb(var(--foreground))] hover:text-[rgb(var(--primary))] hover:underline">{evidence.label}</Link>
                        {evidence.timestamp ? <span className="mt-0.5 block text-[rgb(var(--text-faint))]">{formatDate(evidence.timestamp)}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Date insuficiente. Nu este afișată nicio concluzie ca fapt.</p>}
              </section>

              {showMissingInformation ? <section className="rounded-card border border-[rgb(var(--border))] p-4">
                <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">Informații lipsă</h3>
                {result.missingInformation.length > 0 ? (
                  <ul className="mt-3 grid gap-2 text-xs leading-5 text-[rgb(var(--text-muted))]">
                    {result.missingInformation.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                ) : <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Nu sunt indicate lipsuri critice în pachetul analizat.</p>}
              </section> : null}

              <section className="rounded-card border border-[rgb(var(--border))] p-4">
                <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">Verificări umane necesare</h3>
                <ul className="mt-3 grid gap-2 text-xs leading-5 text-[rgb(var(--text-muted))]">
                  {result.humanChecksRequired.slice(0, 5).map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </section>
            </div>

            <div className="mt-4 flex gap-2 border-t border-[rgb(var(--border))] pt-4 text-xs leading-5 text-[rgb(var(--text-muted))]">
              <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />
              <p>Aprobarea umană rămâne obligatorie. Valoarea estimată nu este venit confirmat. Documentele pregătite nu sunt trimise automat și nicio comunicare externă nu este inițiată automat.</p>
            </div>
          </div>
        ) : null}
      </div>
    </PremiumPanel>
  );
}
