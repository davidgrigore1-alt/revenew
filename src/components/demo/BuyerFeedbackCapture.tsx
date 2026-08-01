"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckIcon, ClipboardDocumentIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  assessBuyerFit,
  createEmptyBuyerFeedback,
  generateBuyerFeedbackSummary,
  type BuyerFeedbackInput,
  type ComprehensionKey,
  type FitLabel
} from "@/lib/buyer-feedback";

const storageKey = "revenew-buyer-feedback-v1";

const comprehensionOptions: Array<{ key: ComprehensionKey; label: string }> = [
  { key: "problem", label: "Problema comercială" },
  { key: "recommendation", label: "Recomandarea asistată" },
  { key: "evidence", label: "Dovezile recomandării" },
  { key: "missingInformation", label: "Informațiile lipsă" },
  { key: "safeAction", label: "Acțiunea sigură" },
  { key: "humanApproval", label: "Aprobarea umană" },
  { key: "valueSeparation", label: "Valoare estimată vs. confirmată" },
  { key: "validationPath", label: "Audit → pilot → dovada valorii" }
];

const objectionOptions = [
  "Avem deja CRM",
  "Nu vrem acces la inbox",
  "Nu avem timp",
  "Nu credem în AI",
  "Nu avem date structurate",
  "Nu este prioritar",
  "Buget neclar",
  "Decidentul nu este prezent",
  "Valoarea estimată nu este suficient de clară",
  "Altă obiecție"
];

type HistoryEntry = {
  id: string;
  company: string;
  date: string;
  fit: FitLabel;
  nextStep: string;
};

const fieldClass = "grid min-w-0 gap-1.5 text-sm font-semibold";
const helperClass = "text-xs font-normal leading-5 text-[rgb(var(--text-muted))]";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className={fieldClass}><span>{label}</span>{children}{hint ? <span className={helperClass}>{hint}</span> : null}</label>;
}

function Section({ number, title, description, children }: { number: string; title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-card sm:p-5" aria-labelledby={`feedback-section-${number}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--gold-500)/0.34)] bg-[rgb(var(--gold-500)/0.08)] text-xs font-semibold text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]">{number}</span>
        <div><h2 id={`feedback-section-${number}`} className="text-base font-semibold">{title}</h2><p className="mt-1 text-sm leading-5 text-[rgb(var(--text-muted))]">{description}</p></div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

const fitTone: Record<FitLabel, BadgeTone> = {
  "Fit puternic pentru audit": "gold",
  "Fit posibil, necesită clarificare": "warning",
  "Fit slab acum": "neutral",
  "Nu concluziona încă": "info"
};

export function BuyerFeedbackCapture() {
  const [feedback, setFeedback] = useState<BuyerFeedbackInput>(createEmptyBuyerFeedback);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const assessment = useMemo(() => assessBuyerFit(feedback), [feedback]);
  const summary = useMemo(() => generateBuyerFeedbackSummary(feedback, assessment), [feedback, assessment]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      setHistory(stored ? (JSON.parse(stored) as HistoryEntry[]).slice(0, 5) : []);
    } catch {
      setHistory([]);
    }
    setHistoryLoaded(true);
  }, []);

  function update<K extends keyof BuyerFeedbackInput>(key: K, value: BuyerFeedbackInput[K]) {
    setFeedback((current) => ({ ...current, [key]: value }));
    setNotice("");
  }

  function loadHistory() {
    if (historyLoaded) return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      setHistory(stored ? (JSON.parse(stored) as HistoryEntry[]).slice(0, 5) : []);
    } catch {
      setHistory([]);
    }
    setHistoryLoaded(true);
  }

  function saveLocally() {
    const entry: HistoryEntry = {
      id: `${Date.now()}`,
      company: feedback.companyName.trim() || "Companie necompletată",
      date: feedback.demoDate || new Date().toISOString().slice(0, 10),
      fit: assessment.label,
      nextStep: assessment.nextStep
    };
    const next = [entry, ...history].slice(0, 5);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setHistory(next);
      setHistoryLoaded(true);
      setNotice("Concluziile au fost păstrate numai în acest browser.");
    } catch {
      setNotice("Browserul nu a permis păstrarea locală. Rezumatul poate fi copiat manual.");
    }
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setNotice("Rezumatul intern a fost copiat.");
    } catch {
      summaryRef.current?.focus();
      summaryRef.current?.select();
      setNotice("Selectează și copiază manual rezumatul evidențiat.");
    }
  }

  function resetFeedback() {
    setFeedback(createEmptyBuyerFeedback());
    setNotice("Formular pregătit pentru o discuție nouă.");
  }

  function toggleObjection(value: string) {
    update("objections", feedback.objections.includes(value)
      ? feedback.objections.filter((item) => item !== value)
      : [...feedback.objections, value]);
  }

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:items-start">
      <div className="grid min-w-0 gap-5">
        <Section number="1" title="Cumpărător" description="Contextul minim necesar pentru a interpreta corect conversația.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Companie"><Input value={feedback.companyName} onChange={(event) => update("companyName", event.target.value)} placeholder="Ex.: companie B2B de servicii" /></Field>
            <Field label="Industrie"><Input value={feedback.industry} onChange={(event) => update("industry", event.target.value)} placeholder="Ex.: logistică, producție, servicii" /></Field>
            <Field label="Rolul cumpărătorului"><Input value={feedback.buyerRole} onChange={(event) => update("buyerRole", event.target.value)} placeholder="Ex.: director comercial" /></Field>
            <Field label="Dimensiunea companiei"><Select value={feedback.companySize} onChange={(event) => update("companySize", event.target.value)}><option value="">Selectează</option><option>1–49 angajați</option><option>50–249 angajați</option><option>250–999 angajați</option><option>1.000+ angajați</option></Select></Field>
            <Field label="Complexitatea procesului comercial"><Select value={feedback.processComplexity} onChange={(event) => update("processComplexity", event.target.value as BuyerFeedbackInput["processComplexity"])}><option value="unknown">Neclară</option><option value="none">Fără proces recurent</option><option value="simple">Simplu, puține transferuri</option><option value="recurring">Recurent, cu mai multe transferuri</option><option value="complex">Complex, cu aprobări și mai multe echipe</option></Select></Field>
            <Field label="Volum lunar estimat"><Input value={feedback.monthlyVolume} onChange={(event) => update("monthlyVolume", event.target.value)} placeholder="Ex.: 80–120 oportunități" /></Field>
            <Field label="Proces sau instrument actual"><Input value={feedback.currentProcess} onChange={(event) => update("currentProcess", event.target.value)} placeholder="Ex.: CRM + foi de calcul + email" /></Field>
            <Field label="Data demonstrației"><Input type="date" value={feedback.demoDate} onChange={(event) => update("demoDate", event.target.value)} /></Field>
          </div>
        </Section>

        <Section number="2" title="Durere comercială" description="Notează problema observată și datele minime care ar permite o validare.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Claritatea durerii"><Select value={feedback.painClarity} onChange={(event) => update("painClarity", event.target.value as BuyerFeedbackInput["painClarity"])}><option value="unknown">Neclarificată</option><option value="unclear">Generală sau ipotetică</option><option value="clear">Clar exprimată și observabilă</option></Select></Field>
            <Field label="Prioritatea percepută"><Select value={feedback.urgency} onChange={(event) => update("urgency", event.target.value as BuyerFeedbackInput["urgency"])}><option value="unknown">Neclară</option><option value="low">Redusă</option><option value="medium">Medie</option><option value="high">Ridicată</option></Select></Field>
            <Field label="Durerea comercială principală"><Textarea rows={3} value={feedback.commercialPain} onChange={(event) => update("commercialPain", event.target.value)} placeholder="Ce costă timp, lasă oportunități fără răspuns sau blochează decizia?" /></Field>
            <Field label="Unde se blochează oportunitățile"><Textarea rows={3} value={feedback.blockage} onChange={(event) => update("blockage", event.target.value)} placeholder="Între ce persoane, sisteme, aprobări sau pași?" /></Field>
          </div>
          <details className="group mt-4 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
            <summary className="focus-ring cursor-pointer list-none rounded-button text-sm font-semibold marker:hidden">Detalii suplimentare despre proces și date <span className="ml-1 text-[rgb(var(--primary))] group-open:hidden">+</span><span className="ml-1 hidden text-[rgb(var(--primary))] group-open:inline">−</span></summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Procesul actual de follow-up"><Textarea rows={3} value={feedback.currentFollowUp} onChange={(event) => update("currentFollowUp", event.target.value)} /></Field>
              <Field label="Blocaje de aprobare"><Textarea rows={3} value={feedback.approvalBottlenecks} onChange={(event) => update("approvalBottlenecks", event.target.value)} /></Field>
              <Field label="Responsabil pentru follow-up"><Input value={feedback.followUpOwner} onChange={(event) => update("followUpOwner", event.target.value)} placeholder="Rol sau echipă" /></Field>
              <Field label="Date disponibile pentru audit"><Input value={feedback.auditData} onChange={(event) => update("auditData", event.target.value)} placeholder="Ex.: export CRM cu 30 de cazuri" /></Field>
              <Field label="Disponibilitatea datelor"><Select value={feedback.dataAvailability} onChange={(event) => update("dataAvailability", event.target.value as BuyerFeedbackInput["dataAvailability"])}><option value="unknown">Neconfirmată</option><option value="none">Nu sunt disponibile acum</option><option value="partial">Parțiale</option><option value="available">Disponibile</option></Select></Field>
              <Field label="Datele pot fi anonimizate?"><Select value={feedback.anonymizable} onChange={(event) => update("anonymizable", event.target.value as BuyerFeedbackInput["anonymizable"])}><option value="unknown">Neconfirmat</option><option value="yes">Da</option><option value="no">Nu</option></Select></Field>
              <Field label="Există rezistență la acces în inbox?" hint="Primul audit nu necesită acces complet la inbox."><Select value={feedback.inboxResistance} onChange={(event) => update("inboxResistance", event.target.value as BuyerFeedbackInput["inboxResistance"])}><option value="unknown">Neclar</option><option value="yes">Da</option><option value="no">Nu</option></Select></Field>
            </div>
          </details>
        </Section>

        <Section number="3" title="Înțelegere" description="Bifează numai ideile pe care cumpărătorul le-a putut explica înapoi clar.">
          <div className="grid gap-2 sm:grid-cols-2">
            {comprehensionOptions.map((item) => (
              <label key={item.key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-3 py-2 text-sm font-medium">
                <input type="checkbox" checked={feedback.comprehension[item.key]} onChange={(event) => update("comprehension", { ...feedback.comprehension, [item.key]: event.target.checked })} className="focus-ring h-4 w-4 shrink-0 rounded border-[rgb(var(--border-strong))] accent-[rgb(var(--primary))]" />
                {item.label}
              </label>
            ))}
          </div>
        </Section>

        <Section number="4" title="Obiecții" description="Selectează obiecțiile exprimate, fără a le interpreta ca refuz automat.">
          <div className="grid gap-2 sm:grid-cols-2">
            {objectionOptions.map((item) => (
              <label key={item} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-[rgb(var(--border))] px-3 py-2 text-sm">
                <input type="checkbox" checked={feedback.objections.includes(item)} onChange={() => toggleObjection(item)} className="focus-ring h-4 w-4 shrink-0 rounded border-[rgb(var(--border-strong))] accent-[rgb(var(--primary))]" />
                {item}
              </label>
            ))}
          </div>
          <details className="group mt-4">
            <summary className="focus-ring cursor-pointer list-none rounded-button text-sm font-semibold marker:hidden">Note interne despre obiecții <span className="text-[rgb(var(--primary))] group-open:hidden">+</span><span className="hidden text-[rgb(var(--primary))] group-open:inline">−</span></summary>
            <Textarea className="mt-3" rows={3} value={feedback.objectionNotes} onChange={(event) => update("objectionNotes", event.target.value)} placeholder="Ce a spus exact și ce trebuie clarificat?" />
          </details>
        </Section>

        <Section number="5" title="Fit și următor pas" description="Evaluarea folosește numai răspunsurile introduse și rămâne o decizie internă explicabilă.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Disponibilitate pentru audit"><Select value={feedback.auditReadiness} onChange={(event) => update("auditReadiness", event.target.value as BuyerFeedbackInput["auditReadiness"])}><option value="unknown">Neconfirmată</option><option value="no">Nu acum</option><option value="possible">Posibil, după clarificări</option><option value="accepted">Acceptat ca pas următor</option></Select></Field>
            <Field label="Acces la persoana care decide"><Select value={feedback.decisionAccess} onChange={(event) => update("decisionAccess", event.target.value as BuyerFeedbackInput["decisionAccess"])}><option value="unknown">Neconfirmat</option><option value="no">Nu</option><option value="indirect">Indirect</option><option value="direct">Direct</option></Select></Field>
          </div>
          <div className="mt-4 rounded-card border border-[rgb(var(--gold-500)/0.3)] bg-[rgb(var(--gold-500)/0.06)] p-4">
            <Badge tone={fitTone[assessment.label]}>{assessment.label}</Badge>
            <p className="mt-3 text-sm font-semibold">Următor pas recomandat</p>
            <p className="mt-1 text-sm leading-6 text-[rgb(var(--text-secondary))]">{assessment.nextStep}</p>
          </div>
        </Section>

        <Section number="6" title="Rezumat intern" description="Notează schimbarea utilă pentru următoarea demonstrație; rezumatul complet se generează automat.">
          <Field label="Ce trebuie îmbunătățit în ReveNew sau în explicație"><Textarea rows={4} value={feedback.productFeedback} onChange={(event) => update("productFeedback", event.target.value)} placeholder="Ce a creat ezitare, ce dovadă a lipsit sau ce explicație trebuie scurtată?" /></Field>
        </Section>
      </div>

      <aside className="min-w-0 space-y-5 lg:sticky lg:top-24" aria-label="Evaluarea și rezumatul conversației">
        <section data-guide-anchor="demo-feedback-fit" className="rounded-panel border border-[rgb(var(--gold-500)/0.36)] bg-[linear-gradient(145deg,rgb(var(--surface)),rgb(var(--surface-subtle)))] p-5 shadow-card">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]">Evaluare transparentă</p><h2 className="mt-2 text-lg font-semibold">Fit pentru audit</h2></div><ShieldCheckIcon className="h-5 w-5 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" /></div>
          <Badge tone={fitTone[assessment.label]} className="mt-4">{assessment.label}</Badge>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">Motive</p>
            <ul className="mt-2 space-y-2 text-sm leading-5 text-[rgb(var(--text-secondary))]">{assessment.reasons.map((reason) => <li key={reason} className="flex gap-2"><CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />{reason}</li>)}</ul>
          </div>
          <div className="mt-4 border-t border-[rgb(var(--border))] pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.09em] text-[rgb(var(--text-faint))]">Ce lipsește</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-5 text-[rgb(var(--text-muted))]">{assessment.missing.length ? assessment.missing.map((item) => <li key={item}>— {item}</li>) : <li>Nicio lipsă critică notată.</li>}</ul>
          </div>
          <div className="mt-4 rounded-card bg-[rgb(var(--gold-500)/0.08)] p-3"><p className="text-xs font-semibold uppercase tracking-[0.09em] text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]">Următor pas</p><p className="mt-1 text-sm leading-6">{assessment.nextStep}</p></div>
        </section>

        <section className="rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Generat local</p><h2 className="mt-1 text-base font-semibold">Rezumat pentru echipa internă</h2></div><ClipboardDocumentIcon className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden="true" /></div>
          <Textarea ref={summaryRef} readOnly value={summary} rows={16} className="mt-4 font-mono text-xs leading-5" aria-label="Rezumat intern generat" />
          <div className="mt-4 flex flex-wrap gap-2"><Button onClick={copySummary} size="small">Copiază rezumatul</Button><Button onClick={saveLocally} variant="secondary" size="small">Păstrează local</Button><Button onClick={resetFeedback} variant="ghost" size="small">Discuție nouă</Button></div>
          {notice ? <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]" role="status">{notice}</p> : null}
          <p className="mt-4 border-t border-[rgb(var(--border))] pt-4 text-xs leading-5 text-[rgb(var(--text-muted))]">Datele rămân numai în acest browser. Nicio comunicare externă nu este trimisă automat.</p>
        </section>

        <details className="group rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-card" onToggle={(event) => event.currentTarget.open && loadHistory()}>
          <summary className="focus-ring cursor-pointer list-none rounded-button text-sm font-semibold marker:hidden">Istoric local recent <span className="text-[rgb(var(--primary))] group-open:hidden">+</span><span className="hidden text-[rgb(var(--primary))] group-open:inline">−</span></summary>
          <div className="mt-3 space-y-3">{history.length ? history.map((item) => <article key={item.id} className="rounded-card bg-[rgb(var(--surface-subtle))] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{item.company}</p><span className="text-xs text-[rgb(var(--text-faint))]">{item.date}</span></div><p className="mt-1 text-xs font-medium text-[rgb(var(--text-secondary))]">{item.fit}</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">{item.nextStep}</p></article>) : <p className="text-sm text-[rgb(var(--text-muted))]">Nu există concluzii păstrate în acest browser.</p>}</div>
        </details>
      </aside>
    </div>
  );
}
