"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OpportunityCard } from "@/components/dashboard/OpportunityCard";
import { ScoreBadge } from "@/components/dashboard/ScoreBadge";
import { Button } from "@/components/ui/Button";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { saveAnalyzedOpportunity } from "@/lib/actions";
import { scoreOpportunity } from "@/lib/scoring";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import type { Business, Opportunity, OpportunityType } from "@/lib/types";
import type { ValidatedOpportunityAnalysis } from "@/lib/openai/validation";

const sourceTypes: OpportunityType[] = [
  "public_procurement",
  "b2b_lead",
  "grant",
  "partnership",
  "invoice_followup",
  "contract_renewal",
  "cold_outreach",
  "website_lead",
  "manual"
];

type AnalyzeOpportunityFormProps = {
  business: Business;
  openAIConfigured: boolean;
};

export function AnalyzeOpportunityForm({ business, openAIConfigured }: AnalyzeOpportunityFormProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<Opportunity | null>(null);
  const [analysis, setAnalysis] = useState<ValidatedOpportunityAnalysis | null>(null);
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [standardAnalysisAvailable, setStandardAnalysisAvailable] = useState(false);

  function toOpportunity(result: ValidatedOpportunityAnalysis, rawSourceText: string, sourceUrl: string): Opportunity {
    return {
      id: "manual-preview",
      title: result.title,
      type: result.type,
      status: "reviewed",
      source: result.mode === "ai" ? "Draft asistat" : "Draft pregatit",
      sourceUrl: sourceUrl || undefined,
      estimatedValueLow: result.estimated_value_low,
      estimatedValueHigh: result.estimated_value_high,
      deadline: result.deadline ?? undefined,
      city: result.city ?? business.city,
      county: result.county ?? business.county,
      fitScore: result.fit_score,
      urgencyScore: result.urgency_score,
      moneyScore: result.money_score,
      confidenceScore: result.confidence_score,
      analysisMode: result.mode,
      contact: result.contact_name || result.contact_email || result.contact_phone
        ? {
            name: result.contact_name ?? "Contact neconfirmat",
            role: "Contact oportunitate",
            email: result.contact_email ?? undefined,
            phone: result.contact_phone ?? undefined,
            company: ""
          }
        : undefined,
      summary: result.ai_summary,
      relevance: [result.why_relevant],
      risks: result.risks,
      recommendedAction: result.recommended_next_action,
      rawSourceText,
      timeline: [
        {
          id: "manual-event-1",
          type: "analyzed",
          label: result.mode === "ai" ? "Analiza asistata" : "Analiza standard",
          date: new Date().toISOString(),
          description: "Sistemul a pregatit o analiza structurata pentru validare comerciala."
        }
      ],
      documents: [],
      actions: []
    };
  }

  function buildStandardAnalysis(form: FormData): ValidatedOpportunityAnalysis {
    const title = String(form.get("title") || "Oportunitate manuala");
    const rawText = String(form.get("rawSourceText") || "");
    const city = String(form.get("city") || business.city);
    const county = String(form.get("county") || business.county);
    const estimatedValue = Number(form.get("estimatedValue") || business.averageContractValue || 0);
    const deadline = String(form.get("deadline") || "");
    const type = String(form.get("type") || "manual") as OpportunityType;
    const summary = `Analiza standard: ${title} pare relevanta pentru ${business.name}.`;
    const scores = scoreOpportunity({ title, summary, rawSourceText: rawText, city, county, deadline, estimatedValueHigh: estimatedValue }, business);

    return {
      mode: "local_fallback",
      type,
      title,
      description: summary,
      estimated_value_low: Math.round(estimatedValue * 0.65),
      estimated_value_high: estimatedValue,
      fit_score: scores.fitScore,
      urgency_score: scores.urgencyScore,
      money_score: scores.moneyScore,
      confidence_score: scores.confidenceScore,
      deadline: deadline || null,
      city,
      county,
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      ai_summary: summary,
      why_relevant: "Oportunitatea se potriveste cu profilul firmei si merita validata comercial.",
      risks: ["Analiza trebuie validata manual inainte de contact."],
      recommended_next_action: "Verifica sursa si pregateste un prim mesaj de contact.",
      suggested_documents: ["outreach_email", "call_script"]
    };
  }

  function useStandardAnalysis() {
    if (!draft) return;
    const form = new FormData();
    Object.entries(draft).forEach(([key, value]) => form.set(key, value));
    const standard = buildStandardAnalysis(form);
    setAnalysis(standard);
    setPreview(toOpportunity(standard, String(form.get("rawSourceText") || ""), String(form.get("sourceUrl") || "")));
    setError("");
    setStandardAnalysisAvailable(false);
    setWarning("Analiza standard este pregatita pentru revizuire.");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "");
    const rawSourceText = String(form.get("rawSourceText") || "");
    const sourceUrl = String(form.get("sourceUrl") || "");
    const nextDraft = Object.fromEntries(form.entries()) as Record<string, string>;
    setDraft(nextDraft);
    setError("");
    setWarning("");
    setStandardAnalysisAvailable(false);
    setSaved(false);
    setLoading(openAIConfigured ? "advanced" : "standard");

    if (!title || !rawSourceText) {
      setError("Titlul si textul oportunitatii sunt obligatorii.");
      setLoading("");
      return;
    }

    if (!openAIConfigured) {
      const standard = buildStandardAnalysis(form);
      setAnalysis(standard);
      setPreview(toOpportunity(standard, rawSourceText, sourceUrl));
      setWarning("Analiza standard este pregatita pentru revizuire.");
      setLoading("");
      return;
    }

    try {
      const response = await fetch("/api/ai/analyze-opportunity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business,
          title,
          sourceType: String(form.get("type") || "manual"),
          rawText: rawSourceText,
          sourceUrl: sourceUrl || null,
          city: String(form.get("city") || "") || null,
          county: String(form.get("county") || "") || null,
          estimatedValue: Number(form.get("estimatedValue") || 0) || null,
          deadline: String(form.get("deadline") || "") || null
        })
      });
      const result = await response.json();
      if (!response.ok) {
        console.error("AI analysis API error", result);
        setError("Analiza avansata nu a putut fi finalizata. Poti continua cu analiza standard.");
        setStandardAnalysisAvailable(Boolean(result.canUseLocalFallback || result.code === "insufficient_quota"));
        setLoading("");
        return;
      }

      setAnalysis(result as ValidatedOpportunityAnalysis);
      setPreview(toOpportunity(result as ValidatedOpportunityAnalysis, rawSourceText, sourceUrl));
      setWarning(result.warning ?? "");
    } catch (apiError) {
      console.error("AI analysis client error", apiError);
      setError("Analiza avansata nu a putut fi finalizata. Poti continua cu analiza standard.");
      setStandardAnalysisAvailable(true);
    } finally {
      setLoading("");
    }
  }

  async function savePreview() {
    if (!draft || !analysis) return;
    setLoading("save");
    setError("");

    if (!isSupabaseConfigured) {
      setSaved(true);
      setLoading("");
      window.setTimeout(() => router.push("/opportunities"), 600);
      return;
    }

    const formData = new FormData();
    Object.entries(draft).forEach(([key, value]) => formData.set(key, value));
    formData.set("analysis", JSON.stringify(analysis));
    const result = await saveAnalyzedOpportunity(formData);
    if (result && "ok" in result && !result.ok) {
      setError(result.error ?? "Salvarea oportunitatii a esuat.");
      setLoading("");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/[0.045] p-5">
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-zinc-300">
              Analiza oportunitate
            </span>
            {analysis ? (
              <span className="rounded-lg border border-mint-400/20 bg-mint-400/10 px-3 py-1 text-xs font-semibold text-mint-400">
                {analysis.mode === "ai" ? "Draft asistat" : "Draft pregatit"}
              </span>
            ) : null}
          </div>
          <label className="block">
            <span className="text-sm font-medium text-zinc-300">Titlu oportunitate</span>
            <input name="title" required className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-ink-900/80 px-4 text-white outline-none focus:border-mint-400/60" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-300">Tip sursa</span>
            <select name="type" className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-ink-900/80 px-4 text-white outline-none focus:border-mint-400/60">
              {sourceTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-300">Text brut oportunitate</span>
            <textarea name="rawSourceText" required rows={7} className="mt-2 w-full rounded-lg border border-white/10 bg-ink-900/80 px-4 py-3 text-white outline-none focus:border-mint-400/60" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <input name="sourceUrl" placeholder="URL sursa" className="h-11 rounded-lg border border-white/10 bg-ink-900/80 px-4 text-white outline-none focus:border-mint-400/60" />
            <input name="deadline" type="date" className="h-11 rounded-lg border border-white/10 bg-ink-900/80 px-4 text-white outline-none focus:border-mint-400/60" />
            <input name="city" placeholder="Oras" defaultValue={business.city || "Bucuresti"} className="h-11 rounded-lg border border-white/10 bg-ink-900/80 px-4 text-white outline-none focus:border-mint-400/60" />
            <input name="county" placeholder="Judet" defaultValue={business.county || "Ilfov"} className="h-11 rounded-lg border border-white/10 bg-ink-900/80 px-4 text-white outline-none focus:border-mint-400/60" />
            <input name="estimatedValue" type="number" placeholder="Valoare estimata EUR" className="h-11 rounded-lg border border-white/10 bg-ink-900/80 px-4 text-white outline-none focus:border-mint-400/60 md:col-span-2" />
          </div>
          <div className="grid gap-2">
            <Button type="submit">{loading === "advanced" ? "Se analizeaza oportunitatea..." : "Analizeaza oportunitatea"}</Button>
            <p className="text-xs leading-5 text-zinc-500">Rezultatul poate fi revizuit inainte de salvare.</p>
          </div>
        </div>
      </form>

      <div className="grid content-start gap-4">
        {error ? (
          <StatusNotice
            tone="warning"
            action={
              draft && standardAnalysisAvailable ? (
                <button type="button" onClick={useStandardAnalysis} className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white">
                  Foloseste analiza standard
                </button>
              ) : null
            }
          >
            {error}
          </StatusNotice>
        ) : null}
        {preview ? (
          <>
            <OpportunityCard opportunity={preview} />
            <div className="flex flex-wrap gap-2">
              <ScoreBadge label="Fit" score={preview.fitScore} />
              <ScoreBadge label="Urgenta" score={preview.urgencyScore} />
              <ScoreBadge label="Bani" score={preview.moneyScore} />
              <ScoreBadge label="Incredere" score={preview.confidenceScore} />
            </div>
            {warning ? <StatusNotice tone="success">{warning}</StatusNotice> : null}
            <button
              type="button"
              onClick={savePreview}
              disabled={loading === "save"}
              className="min-h-11 rounded-lg bg-mint-500 px-5 text-sm font-semibold text-ink-950 transition hover:bg-mint-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "save" ? "Se salveaza..." : "Salveaza oportunitate"}
            </button>
            {saved ? <StatusNotice tone="success">Oportunitate salvata pentru sesiunea curenta.</StatusNotice> : null}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-sm leading-6 text-zinc-400">
            Completeaza formularul ca sa vezi preview-ul oportunitatii analizate.
          </div>
        )}
      </div>
    </div>
  );
}
