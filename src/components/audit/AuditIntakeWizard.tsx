"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  LockClosedIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  assessAuditIntake,
  caseVolumeLabels,
  createEmptyAuditIntake,
  generateAuditPlan,
  type AuditFitLabel,
  type AuditIntakeInput
} from "@/lib/audit-intake";

const draftStorageKey = "revenew.auditIntake.draft";

const steps = [
  { title: "Compania", progressLabel: "Compania", description: "Contextul minim pentru o recomandare relevantă." },
  { title: "Blocaje", progressLabel: "Blocaje", description: "Unde se întrerupe execuția comercială." },
  { title: "Cazuri", progressLabel: "Cazuri", description: "Volumul și tipurile disponibile pentru analiză." },
  { title: "Date și confidențialitate", progressLabel: "Date", description: "Date minime, anonimizare și limite de acces." },
  { title: "Obiectiv", progressLabel: "Obiectiv", description: "Rezultatul care ar face auditul util." },
  { title: "Plan recomandat", progressLabel: "Plan", description: "Evaluare explicabilă și următorul pas sigur." }
] as const;

const industries = ["Rent-a-car / leasing operațional", "Distribuție B2B", "Logistică / transport", "Clinici private", "Service auto / servicii pentru flote", "Construcții B2B", "Facility management", "Servicii B2B", "Altă industrie"];
const blockerOptions = ["Follow-up întârziat", "Responsabil neclar", "Ofertă neverificată", "Client fără următor pas", "Aprobare internă blocată", "Date împrăștiate", "Decident neconfirmat", "Termene depășite"];
const caseTypeOptions = ["Cereri de ofertă", "Oportunități în pipeline", "Follow-up-uri", "Oferte trimise", "Aprobări", "Conversații comerciale exportate", "Documente comerciale", "Alt tip de caz"];
const availableFieldGroups = [
  { title: "Context comercial", values: ["Companie", "Contact", "Valoare estimată", "Monedă", "Status"] },
  { title: "Execuție și dovezi", values: ["Termen", "Responsabil", "Ultimul contact", "Documente / dovezi", "Următor pas"] }
];
const objectiveOptions = ["Identificarea oportunităților blocate", "Clarificarea valorii estimate expuse", "Reducerea follow-up-urilor întârziate", "Clarificarea responsabililor", "Verificarea decidenților", "Pregătirea unui pilot", "Raport executiv pentru management", "Alt obiectiv"];

const fitTone: Record<AuditFitLabel, BadgeTone> = {
  "Pregătit pentru audit controlat": "brand",
  "Audit posibil, necesită clarificare": "warning",
  "Audit dificil acum": "neutral",
  "Nu concluziona încă": "info"
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="grid min-w-0 gap-1.5 text-sm font-semibold"><span>{label}</span>{children}{hint ? <span className="text-xs font-normal leading-5 text-[rgb(var(--text-muted))]">{hint}</span> : null}</label>;
}

function Choice({ type, checked, label, onChange }: { type: "radio" | "checkbox"; checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-control border px-3 py-2.5 text-sm transition-colors ${checked ? "border-[rgb(var(--primary)/0.52)] bg-[rgb(var(--primary-muted))] text-[rgb(var(--foreground))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--border-strong))]"}`}>
      <input type={type} checked={checked} onChange={onChange} className="focus-ring h-4 w-4 shrink-0 border-[rgb(var(--border-strong))] accent-[rgb(var(--rn-accent))]" />
      <span>{label}</span>
    </label>
  );
}

export function AuditIntakeWizard() {
  const [intake, setIntake] = useState<AuditIntakeInput>(createEmptyAuditIntake);
  const [currentStep, setCurrentStep] = useState(0);
  const [notice, setNotice] = useState("");
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const assessment = useMemo(() => assessAuditIntake(intake), [intake]);
  const plan = useMemo(() => generateAuditPlan(intake, assessment), [intake, assessment]);
  const assessmentVisible = currentStep === steps.length - 1;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(draftStorageKey);
      if (stored) setIntake({ ...createEmptyAuditIntake(), ...(JSON.parse(stored) as Partial<AuditIntakeInput>) });
    } catch {
      setNotice("Draftul local nu a putut fi restaurat. Poți continua fără salvare.");
    }
  }, []);

  function update<K extends keyof AuditIntakeInput>(key: K, value: AuditIntakeInput[K]) {
    setIntake((current) => ({ ...current, [key]: value }));
    setNotice("");
  }

  function toggleList(key: "blockers" | "caseTypes" | "availableFields" | "objectives", value: string) {
    update(key, intake[key].includes(value) ? intake[key].filter((item) => item !== value) : [...intake[key], value]);
  }

  function goToStep(step: number) {
    setCurrentStep(Math.max(0, Math.min(steps.length - 1, step)));
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveDraft() {
    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(intake));
      setNotice("Draftul a fost salvat numai în acest browser.");
    } catch {
      setNotice("Browserul nu a permis salvarea locală. Poți copia planul manual.");
    }
  }

  async function copyPlan() {
    try {
      await navigator.clipboard.writeText(plan);
      setNotice("Planul de audit a fost copiat.");
    } catch {
      summaryRef.current?.focus();
      summaryRef.current?.select();
      setNotice("Selectează și copiază manual planul evidențiat.");
    }
  }

  function resetWizard() {
    if (!window.confirm("Resetezi răspunsurile și draftul local al acestui audit?")) return;
    setIntake(createEmptyAuditIntake());
    window.localStorage.removeItem(draftStorageKey);
    setCurrentStep(0);
    setNotice("Wizardul a fost resetat.");
  }

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <div className="min-w-0 overflow-hidden rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card">
        <nav className="grid grid-cols-3 gap-px border-b border-[rgb(var(--border))] bg-[rgb(var(--border))] sm:grid-cols-6" aria-label="Pașii auditului">
          {steps.map((step, index) => {
            const active = index === currentStep;
            const complete = index < currentStep;
            return (
              <button key={step.title} type="button" onClick={() => goToStep(index)} aria-current={active ? "step" : undefined} aria-label={`Pasul ${index + 1}: ${step.title}`} className={`focus-ring min-h-14 min-w-0 bg-[rgb(var(--surface))] px-2 py-2 text-center transition-colors ${active ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--text-faint))] hover:text-[rgb(var(--foreground))]"}`}>
                <span className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${active || complete ? "border-[rgb(var(--primary)/0.52)] bg-[rgb(var(--primary-muted))] text-[rgb(var(--primary))]" : "border-[rgb(var(--border))]"}`}>{complete ? <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}</span>
                <span className="mt-1 hidden text-[0.6875rem] font-semibold sm:block">{step.progressLabel}</span>
              </button>
            );
          })}
        </nav>

        <section className="p-4 sm:p-6 lg:p-7" aria-labelledby="audit-step-title">
          <p className="text-label text-[rgb(var(--primary))]">Pasul {currentStep + 1} din {steps.length}</p>
          <h2 id="audit-step-title" className="mt-2 text-xl font-semibold tracking-[-0.025em] sm:text-2xl">{steps[currentStep].title}</h2>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">{steps[currentStep].description}</p>

          <div className="mt-6 min-h-[330px]">
            {currentStep === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Denumirea companiei"><Input value={intake.companyName} onChange={(event) => update("companyName", event.target.value)} placeholder="Ex.: companie B2B de servicii" /></Field>
                <Field label="Industrie"><Select value={intake.industry} onChange={(event) => update("industry", event.target.value)}><option value="">Selectează industria</option>{industries.map((industry) => <option key={industry}>{industry}</option>)}</Select></Field>
                <Field label="Rolul persoanei care coordonează"><Input value={intake.buyerRole} onChange={(event) => update("buyerRole", event.target.value)} placeholder="Ex.: director comercial" /></Field>
                <Field label="Dimensiunea aproximativă"><Select value={intake.companySize} onChange={(event) => update("companySize", event.target.value)}><option value="">Selectează</option><option>1–49 angajați</option><option>50–249 angajați</option><option>250–999 angajați</option><option>1.000+ angajați</option></Select></Field>
                <Field label="Complexitatea procesului comercial" hint="Alege varianta care descrie cel mai bine transferurile și aprobările actuale."><Select value={intake.processComplexity} onChange={(event) => update("processComplexity", event.target.value)}><option value="">Selectează</option><option>Proces simplu, o singură echipă</option><option>Proces recurent, cu mai multe transferuri</option><option>Proces complex, cu aprobări și mai multe echipe</option><option>Proces încă neclar</option></Select></Field>
              </div>
            ) : null}

            {currentStep === 1 ? (
              <div className="grid gap-5">
                <fieldset><legend className="text-sm font-semibold">Unde se blochează oportunitățile?</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{blockerOptions.map((option) => <Choice key={option} type="checkbox" checked={intake.blockers.includes(option)} label={option} onChange={() => toggleList("blockers", option)} />)}</div></fieldset>
                <details className="group rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4"><summary className="focus-ring cursor-pointer list-none rounded-button text-sm font-semibold marker:hidden">Adaugă un alt blocaj sau un exemplu recent <span className="text-[rgb(var(--primary))] group-open:hidden">+</span><span className="hidden text-[rgb(var(--primary))] group-open:inline">−</span></summary><div className="mt-4"><Field label="Care este exemplul cel mai recent?"><Textarea rows={3} value={intake.recentExample} onChange={(event) => update("recentExample", event.target.value)} placeholder="Descrie pe scurt cazul, fără date personale inutile." /></Field></div></details>
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div className="grid gap-6">
                <fieldset><legend className="text-sm font-semibold">Câte cazuri comerciale recente puteți pregăti?</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{(["under10", "10to20", "20to50", "over50"] as const).map((value) => <Choice key={value} type="radio" checked={intake.caseVolume === value} label={caseVolumeLabels[value]} onChange={() => update("caseVolume", value)} />)}</div></fieldset>
                <fieldset><legend className="text-sm font-semibold">Ce tipuri de cazuri sunt disponibile?</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{caseTypeOptions.map((option) => <Choice key={option} type="checkbox" checked={intake.caseTypes.includes(option)} label={option} onChange={() => toggleList("caseTypes", option)} />)}</div></fieldset>
                <Field label="Perioada cazurilor"><Select value={intake.dataRecency} onChange={(event) => update("dataRecency", event.target.value)}><option value="">Selectează perioada</option><option>Ultimele 30 de zile</option><option>Ultimele 90 de zile</option><option>Ultimele 6 luni</option></Select></Field>
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="grid gap-6">
                <div className="grid gap-3 rounded-card border border-[rgb(var(--primary)/0.34)] bg-[rgb(var(--primary-muted))] p-4 text-sm leading-6 sm:grid-cols-3"><p><strong>Primul audit</strong><br />nu cere acces complet la inbox.</p><p><strong>Datele</strong><br />pot fi anonimizate.</p><p><strong>Comunicarea</strong><br />nu este trimisă automat.</p></div>
                <fieldset><legend className="text-sm font-semibold">Datele pot fi anonimizate?</legend><div className="mt-3 grid gap-2 sm:grid-cols-3">{[["yes", "Da"], ["partial", "Parțial"], ["unknown", "Nu știm încă"]].map(([value, label]) => <Choice key={value} type="radio" checked={intake.anonymization === value} label={label} onChange={() => update("anonymization", value as AuditIntakeInput["anonymization"])} />)}</div></fieldset>
                <fieldset><legend className="text-sm font-semibold">Poziția față de accesul la inbox</legend><div className="mt-3 grid gap-2">{["Nu este necesar pentru primul audit", "Nu dorim acces complet", "Poate fi discutat ulterior, numai cu aprobare"].map((option) => <Choice key={option} type="radio" checked={intake.inboxAccess === option} label={option} onChange={() => update("inboxAccess", option)} />)}</div></fieldset>
                <fieldset><legend className="text-sm font-semibold">Ce câmpuri sunt disponibile?</legend><div className="mt-3 grid gap-4 sm:grid-cols-2">{availableFieldGroups.map((group) => <div key={group.title}><p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">{group.title}</p><div className="grid gap-2">{group.values.map((option) => <Choice key={option} type="checkbox" checked={intake.availableFields.includes(option)} label={option} onChange={() => toggleList("availableFields", option)} />)}</div></div>)}</div></fieldset>
              </div>
            ) : null}

            {currentStep === 4 ? (
              <div className="grid gap-5">
                <fieldset><legend className="text-sm font-semibold">Ce trebuie să clarifice auditul?</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{objectiveOptions.map((option) => <Choice key={option} type="checkbox" checked={intake.objectives.includes(option)} label={option} onChange={() => toggleList("objectives", option)} />)}</div></fieldset>
                <Field label="Ce rezultat ar face auditul valoros?"><Textarea rows={3} value={intake.valuableOutcome} onChange={(event) => update("valuableOutcome", event.target.value)} placeholder="Ex.: o listă verificabilă de oportunități blocate și primul pas sigur pentru fiecare." /></Field>
                <details className="group"><summary className="focus-ring cursor-pointer list-none rounded-button text-sm font-semibold marker:hidden">Riscuri sau constrângeri cunoscute <span className="text-[rgb(var(--primary))] group-open:hidden">+</span><span className="hidden text-[rgb(var(--primary))] group-open:inline">−</span></summary><Textarea className="mt-3" rows={3} value={intake.constraints} onChange={(event) => update("constraints", event.target.value)} placeholder="Ex.: câmpuri incomplete, aprobare juridică sau interval limitat." /></details>
              </div>
            ) : null}

            {currentStep === 5 ? (
              <div className="grid gap-5">
                <section className="rounded-panel border border-[rgb(var(--primary)/0.42)] bg-[linear-gradient(145deg,rgb(var(--surface)),rgb(var(--primary-muted)))] p-4 sm:p-5" aria-labelledby="audit-plan-title">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-label text-[rgb(var(--primary))]">Plan de audit controlat</p><h3 id="audit-plan-title" className="mt-2 text-xl font-semibold">Recomandare bazată pe răspunsurile introduse</h3></div><Badge tone={fitTone[assessment.label]}>{assessment.label}</Badge></div>
                  <p className="mt-4 text-sm leading-6 text-[rgb(var(--text-secondary))]">{assessment.recommendedScope}</p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">De ce</p><ul className="mt-2 space-y-2 text-sm leading-5">{assessment.reasons.map((reason) => <li key={reason} className="flex gap-2"><CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />{reason}</li>)}</ul></div><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Informații de completat</p>{assessment.missingInformation.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 text-[rgb(var(--text-muted))]">{assessment.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">Informațiile minime sunt completate.</p>}</div></div>
                  <div className="mt-5 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">Următorul pas sigur</p><p className="mt-2 text-sm font-semibold leading-6">{assessment.nextStep}</p></div>
                </section>
                <Field label="Rezumat complet, disponibil și pentru copiere manuală"><Textarea ref={summaryRef} readOnly rows={16} value={plan} className="font-mono text-xs leading-5" /></Field>
                <div className="flex flex-wrap gap-2"><Button onClick={copyPlan}><ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />Copiază planul</Button><Button onClick={saveDraft} variant="secondary">Salvează draft local</Button><Button onClick={resetWizard} variant="ghost">Resetează wizardul</Button></div>
              </div>
            ) : null}
          </div>

          {notice ? <p className="mt-5 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-3 py-2 text-xs leading-5 text-[rgb(var(--text-muted))]" role="status">{notice}</p> : null}
          {currentStep < steps.length - 1 ? <div className="mt-6 flex items-center justify-between gap-3 border-t border-[rgb(var(--border))] pt-5"><Button variant="ghost" onClick={() => goToStep(currentStep - 1)} disabled={currentStep === 0}><ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />Înapoi</Button><Button onClick={() => goToStep(currentStep + 1)}>{currentStep === steps.length - 2 ? "Generează planul" : "Pasul următor"}<ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button></div> : <div className="mt-6 border-t border-[rgb(var(--border))] pt-5"><Button variant="ghost" onClick={() => goToStep(currentStep - 1)}><ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />Revizuiește răspunsurile</Button></div>}
        </section>
      </div>

      <aside className="min-w-0 space-y-4 xl:sticky xl:top-24" aria-label="Starea pregătirii auditului">
        <section className="rounded-panel border border-[rgb(var(--primary)/0.38)] bg-[rgb(var(--primary-muted))] p-5 shadow-card">
          <div className="flex items-start justify-between gap-3"><div><p className="text-label text-[rgb(var(--primary))]">Pregătire audit</p><h2 className="mt-2 text-lg font-semibold">Rezumat curent</h2></div><ShieldCheckIcon className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden="true" /></div>
          <Badge tone={assessmentVisible ? fitTone[assessment.label] : "info"} className="mt-4">{assessmentVisible ? assessment.label : "Evaluare în completare"}</Badge>
          <dl className="mt-5 grid gap-3 text-sm"><div><dt className="text-xs text-[rgb(var(--text-faint))]">Cazuri disponibile</dt><dd className="mt-1 font-semibold">{caseVolumeLabels[intake.caseVolume]}</dd></div><div><dt className="text-xs text-[rgb(var(--text-faint))]">Blocaje selectate</dt><dd className="mt-1 font-semibold">{intake.blockers.length || "Niciunul încă"}</dd></div><div><dt className="text-xs text-[rgb(var(--text-faint))]">Anonimizare</dt><dd className="mt-1 font-semibold">{{ yes: "Da", partial: "Parțial", unknown: "De clarificat", "": "Necompletat" }[intake.anonymization]}</dd></div><div><dt className="text-xs text-[rgb(var(--text-faint))]">Următor pas</dt><dd className="mt-1 leading-5 text-[rgb(var(--text-secondary))]">{assessmentVisible ? assessment.nextStep : `Continuă cu pasul ${currentStep + 1}: ${steps[currentStep].title.toLocaleLowerCase("ro-RO")}.`}</dd></div></dl>
        </section>
        <section className="rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5"><div className="flex gap-3"><LockClosedIcon className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" /><div><h2 className="font-semibold">Control și confidențialitate</h2><p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Răspunsurile rămân în acest browser când salvezi draftul. Nu există încărcare de fișiere, acces automat la inbox sau trimitere externă.</p></div></div></section>
      </aside>
    </div>
  );
}
