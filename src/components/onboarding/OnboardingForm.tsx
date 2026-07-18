"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { saveOnboarding } from "@/lib/actions";
import { emptyOnboardingDraft, type OnboardingDraft } from "@/lib/onboarding/draft";
import { saveOnboardingProgress } from "@/lib/onboarding/progress-actions";
import { exactSearchableOption, filterSearchableOptions } from "@/lib/forms/searchable-options";
import {
  administrativeAreaDisplayName,
  administrativeAreaLabel,
  commercialProblemOptions,
  countryOptions,
  currencyOptions,
  getAdministrativeAreaOptions,
  hasControlledAdministrativeAreas,
  industryOptions,
  isAdministrativeAreaRequired,
  leadSourceOptions,
  validateAdministrativeArea,
  validateInternationalPhone,
  validateLocality,
  validateRomanianCui,
  validateSafeText,
  validateWebsite,
  type FieldErrors
} from "@/lib/forms/validation";

const steps = ["Despre firmă", "Ce vinde firma?", "De unde vin cererile?", "Verificare"] as const;

type FieldName = keyof OnboardingDraft;

function Field({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  placeholder,
  type = "text",
  autoComplete
}: {
  label: string;
  name: FieldName;
  value: string;
  onChange: (name: FieldName, value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[rgb(var(--foreground))]">{label}{required ? " *" : ""}</span>
      <input
        id={name}
        required={required}
        name={name}
        type={type}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--foreground))] outline-none transition placeholder:text-[rgb(var(--text-faint))] focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.18)]"
      />
      {error ? <p id={`${name}-error`} className="mt-2 text-sm text-[rgb(var(--danger-text))]">{error}</p> : null}
    </label>
  );
}

function SearchableSelect({
  label,
  name,
  value,
  options,
  onChange,
  error,
  required = false,
  placeholder,
  disabled = false,
  emptyLabel = "Nu există opțiuni pentru filtrul curent."
}: {
  label: string;
  name: FieldName;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (name: FieldName, value: string) => void;
  error?: string;
  required?: boolean;
  placeholder: string;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = options.find((option) => option.value === value);
  const listboxId = `${name}-listbox`;
  const visibleOptions = useMemo(() => filterSearchableOptions(options, query), [options, query]);

  function choose(option: { value: string; label: string }) {
    onChange(name, option.value);
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
  }

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setOpen(true);
    setActiveIndex(0);
  }

  return (
    <div className="relative block">
      <label htmlFor={name} className="text-sm font-medium text-[rgb(var(--foreground))]">{label}{required ? " *" : ""}</label>
      <input
        id={name}
        role="combobox"
        required={required}
        disabled={disabled}
        value={open ? query : selected?.label ?? ""}
        onChange={(event) => updateQuery(event.target.value)}
        onClick={() => setOpen(true)}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => {
          setQuery("");
          setOpen(false);
          setActiveIndex(0);
        }, 120)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
            setActiveIndex(0);
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => open ? Math.min(index + 1, Math.max(visibleOptions.length - 1, 0)) : 0);
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
            return;
          }
          if (event.key === "Enter") {
            const exactOption = exactSearchableOption(options, event.currentTarget.value);
            const option = exactOption ?? (open ? visibleOptions[activeIndex] : undefined);
            if (!option) return;
            event.preventDefault();
            choose(option);
          }
        }}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-activedescendant={open && visibleOptions[activeIndex] ? `${name}-option-${visibleOptions[activeIndex].value}` : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        placeholder={placeholder}
        autoComplete="address-level1"
        className="mt-2 h-11 w-full rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--foreground))] outline-none transition placeholder:text-[rgb(var(--text-faint))] focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.18)] disabled:cursor-not-allowed disabled:opacity-60"
      />
      {open && !disabled ? (
        <div id={listboxId} role="listbox" className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-control border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-elevated))] p-1 shadow-premium">
          {visibleOptions.length ? visibleOptions.map((option, index) => (
            <div
              id={`${name}-option-${option.value}`}
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onPointerDown={(event) => {
                event.preventDefault();
                choose(option);
              }}
              onPointerMove={() => setActiveIndex(index)}
              className={`w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm transition ${index === activeIndex ? "bg-[rgb(var(--primary)/0.13)] text-[rgb(var(--foreground))]" : "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))]"}`}
            >
              {option.label}
            </div>
          )) : <p className="px-3 py-2 text-sm text-[rgb(var(--text-muted))]">{emptyLabel}</p>}
        </div>
      ) : null}
      {error ? <p id={`${name}-error`} className="mt-2 text-sm text-[rgb(var(--danger-text))]">{error}</p> : null}
    </div>
  );
}

function ErrorSummary({ errors }: { errors: FieldErrors<FieldName> }) {
  const entries = Object.entries(errors).filter((entry): entry is [FieldName, string] => Boolean(entry[1]));
  if (!entries.length) return null;

  return (
    <div className="rounded-control border border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] p-4 text-sm text-[rgb(var(--danger-text))]" role="alert">
      <p className="font-semibold">Verifică înainte să continui:</p>
      <ul className="mt-2 grid gap-1">
        {entries.map(([field, message]) => (
          <li key={field}>
            <a href={`#${field}`} className="underline underline-offset-4">{message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function validateStep(draft: OnboardingDraft, step: number) {
  const errors: FieldErrors<FieldName> = {};

  if (step === 0) {
    const businessName = validateSafeText(draft.businessName, { label: "Numele firmei", min: 2, max: 160, required: true, rejectUrl: true });
    const area = validateAdministrativeArea(draft.administrativeArea, draft.countryCode);
    const city = validateLocality(draft.city, "Orașul/localitatea");
    const phone = validateInternationalPhone(draft.companyPhone, draft.companyPhoneCountry, "Telefonul firmei");
    const website = validateWebsite(draft.website);
    const industry = validateSafeText(draft.industry, { label: "Domeniul de activitate", required: true, max: 120 });
    const cui = validateRomanianCui(draft.cui, draft.countryCode);
    const customIndustry = draft.industry === "Alt domeniu" ? validateSafeText(draft.customIndustry, { label: "Alt domeniu", required: true, max: 120, rejectUrl: true }) : { ok: true as const };

    if (!businessName.ok) errors.businessName = businessName.error;
    if (!industry.ok) errors.industry = industry.error;
    if (!customIndustry.ok) errors.customIndustry = customIndustry.error;
    if (!draft.countryCode) errors.countryCode = "Țara este obligatorie.";
    if (!city.ok) errors.city = city.error;
    if (!area.ok) errors.administrativeArea = area.error;
    if (!phone.ok) errors.companyPhone = phone.error;
    if (!website.ok) errors.website = website.error;
    if (!cui.ok) errors.cui = cui.error;
  }

  if (step === 1) {
    const mainOffering = validateSafeText(draft.mainOffering, { label: "Serviciul sau produsul principal", min: 2, max: 160, required: true, rejectUrl: true });
    const shortDescription = validateSafeText(draft.shortDescription, { label: "Descrierea scurtă", min: 20, max: 500, required: true });
    if (!mainOffering.ok) errors.mainOffering = mainOffering.error;
    if (!shortDescription.ok) errors.shortDescription = shortDescription.error;
    if (!draft.averageContractValue || Number(draft.averageContractValue) <= 0) errors.averageContractValue = "Introdu o valoare medie pozitivă.";
    if (!currencyOptions.includes(draft.currency as (typeof currencyOptions)[number])) errors.currency = "Alege moneda.";
  }

  if (step === 2) {
    if (!draft.leadSources.length) errors.leadSources = "Alege cel puțin o sursă de cereri.";
    if (draft.leadSources.includes("Alte surse") && !draft.customLeadSource.trim()) errors.customLeadSource = "Descrie sursa suplimentară.";
    if (!draft.mainCommercialProblem) errors.mainCommercialProblem = "Alege problema comercială principală.";
    if (draft.mainCommercialProblem === "Altă problemă" && !draft.customCommercialProblem.trim()) errors.customCommercialProblem = "Descrie problema comercială.";
  }

  return errors;
}

export function OnboardingForm({ initialDraft = emptyOnboardingDraft, initialStep = 0, initialEntryMode = "manual", resumed = false }: { initialDraft?: OnboardingDraft; initialStep?: number; initialEntryMode?: "manual" | "import"; resumed?: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(Math.max(0, Math.min(initialStep, steps.length - 1)));
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);
  const [entryMode, setEntryMode] = useState<"manual" | "import">(initialEntryMode);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<FieldName>>({});
  const [serverError, setServerError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  const regionLabel = administrativeAreaLabel(draft.countryCode);
  const controlledAreas = hasControlledAdministrativeAreas(draft.countryCode);
  const administrativeAreaOptions = useMemo(() => getAdministrativeAreaOptions(draft.countryCode), [draft.countryCode]);

  const canReview = useMemo(() => {
    return [0, 1, 2].every((index) => Object.keys(validateStep(draft, index)).length === 0);
  }, [draft]);

  const reviewSections = [
    {
      title: "Companie",
      step: 0,
      rows: [
        ["Firmă", `${draft.businessName} · ${draft.industry === "Alt domeniu" ? draft.customIndustry : draft.industry}`],
        ["Date juridice", [draft.legalName, draft.countryCode === "RO" ? draft.cui : ""].filter(Boolean).join(" · ") || "Necompletate"]
      ]
    },
    {
      title: "Localizare și contact",
      step: 0,
      rows: [
        ["Localizare", `${draft.countryCode}, ${administrativeAreaDisplayName(draft.countryCode, draft.administrativeArea) || "fără regiune"}, ${draft.city}`],
        ["Contact", [draft.companyPhone, draft.website, draft.postalCode].filter(Boolean).join(" · ") || "Necompletat"]
      ]
    },
    {
      title: "Ofertă și valoare estimată",
      step: 1,
      rows: [
        ["Ofertă principală", draft.mainOffering],
        ["Valoare medie estimată", `${draft.averageContractValue} ${draft.currency}`],
        ["Context", draft.shortDescription]
      ]
    },
    {
      title: "Surse și problemă comercială",
      step: 2,
      rows: [
        ["Surse", [...draft.leadSources, draft.customLeadSource].filter(Boolean).join(", ")],
        ["Problemă principală", draft.mainCommercialProblem === "Altă problemă" ? draft.customCommercialProblem : draft.mainCommercialProblem]
      ]
    }
  ] as const;

  function focusFirstError(nextErrors: FieldErrors<FieldName>) {
    const first = Object.keys(nextErrors)[0];
    window.requestAnimationFrame(() => {
      if (first) document.getElementById(first)?.focus();
      errorRef.current?.scrollIntoView({ block: "nearest" });
    });
  }

  function updateField(name: FieldName, value: string) {
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setDraft((current) => {
      if (name === "countryCode") {
        return { ...current, countryCode: value, companyPhoneCountry: value, administrativeArea: "", cui: value === "RO" ? current.cui : "" };
      }
      if (name === "administrativeArea") {
        return { ...current, administrativeArea: value };
      }
      if (name === "companyPhoneCountry") {
        return { ...current, companyPhoneCountry: value };
      }
      return { ...current, [name]: value };
    });
  }

  function toggleSource(source: string) {
    setDraft((current) => ({
      ...current,
      leadSources: current.leadSources.includes(source) ? current.leadSources.filter((item) => item !== source) : [...current.leadSources, source]
    }));
  }

  async function goNext() {
    const nextErrors = validateStep(draft, step);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      focusFirstError(nextErrors);
      return;
    }
    const nextStep = Math.min(step + 1, steps.length - 1);
    const progress = await saveOnboardingProgress(nextStep, entryMode, draft);
    if (!progress.ok) setServerError(progress.error ?? "Progresul nu a putut fi salvat.");
    setStep(nextStep);
  }

  async function submit() {
    if (loading) return;
    const allErrors = [0, 1, 2].reduce<FieldErrors<FieldName>>((acc, index) => ({ ...acc, ...validateStep(draft, index) }), {});
    setErrors(allErrors);
    if (Object.keys(allErrors).length || !canReview) {
      focusFirstError(allErrors);
      return;
    }

    setServerError("");
    setLoading(true);

    const formData = new FormData();
    Object.entries(draft).forEach(([key, value]) => {
      if (key === "cui" && draft.countryCode !== "RO") {
        return;
      }
      formData.set(key, Array.isArray(value) ? value.join(", ") : value);
    });
    formData.set("entryMode", entryMode);

    const result = await saveOnboarding(formData);
    if (!result.ok) {
      setServerError(result.error ?? "Nu am putut crea spațiul firmei.");
      setLoading(false);
      return;
    }

    router.push(`/activation?mode=${entryMode}`);
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <section className="grid gap-4 overflow-hidden rounded-panel border border-[rgb(var(--border))] bg-[linear-gradient(135deg,rgb(var(--surface-subtle)),rgb(var(--surface)))] p-4 shadow-sm sm:p-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Metoda de pornire</p><h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-[rgb(var(--foreground))]">Cum aduci primele date în ReveNew?</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[rgb(var(--text-muted))]">Configurează manual sau importă un CSV. Echipa verifică informația înainte ca aceasta să devină oportunitate.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => setEntryMode("manual")} aria-pressed={entryMode === "manual"} className={`focus-ring rounded-control border p-3 text-left transition ${entryMode === "manual" ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)] shadow-sm" : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:border-[rgb(var(--border-strong))]"}`}><span className="block font-semibold text-[rgb(var(--foreground))]">Configurare manuală</span><span className="mt-1 block text-sm leading-5 text-[rgb(var(--text-muted))]">Completez contextul firmei, oferta și sursele comerciale.</span></button>
          <button type="button" onClick={() => setEntryMode("import")} aria-pressed={entryMode === "import"} className={`focus-ring rounded-control border p-3 text-left transition ${entryMode === "import" ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)] shadow-sm" : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:border-[rgb(var(--border-strong))]"}`}><span className="block font-semibold text-[rgb(var(--foreground))]">Import CSV controlat</span><span className="mt-1 block text-sm leading-5 text-[rgb(var(--text-muted))]">Încarc date existente și verific maparea înainte de import.</span></button>
        </div>
        <p className="flex items-center gap-2 text-xs leading-5 text-[rgb(var(--text-muted))]"><span className="text-[rgb(var(--primary))]" aria-hidden="true">✓</span> Importul nu trimite mesaje și nu pornește outreach extern. Tu păstrezi controlul.</p>
        {resumed ? <p className="text-sm font-semibold text-[rgb(var(--primary))]" role="status">Continui configurarea existentă. Ultimul pas salvat și datele valide au fost restaurate.</p> : null}
      </section>
      <nav aria-label="Pași onboarding" className="flex gap-1 overflow-x-auto rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-1">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => index <= step && setStep(index)}
            aria-current={index === step ? "step" : undefined}
            className={`focus-ring flex min-w-[150px] flex-1 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
              index === step ? "bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--foreground))]" : index < step ? "bg-[rgb(var(--surface))] text-[rgb(var(--foreground))]" : "text-[rgb(var(--text-muted))]"
            }`}
          >
            <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${index <= step ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "border border-[rgb(var(--border-strong))]"}`}>{index + 1}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div ref={errorRef}>
        <ErrorSummary errors={errors} />
      </div>

      <section className="rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 border-b border-[rgb(var(--border))] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">Pasul {step + 1} din {steps.length}</p><h2 className="mt-1 font-display text-2xl font-semibold text-[rgb(var(--foreground))]">{steps[step]}</h2></div>
          <p className="max-w-md text-sm leading-6 text-[rgb(var(--text-muted))]">{step === 0 ? "Definește identitatea și datele de contact ale firmei." : step === 1 ? "Ajută ReveNew să interpreteze valoarea și relevanța comercială." : step === 2 ? "Stabilește unde apar semnalele și ce probleme urmărești." : "Verifică informația înainte de crearea spațiului de lucru."}</p>
        </div>

        {step === 0 ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field required label="Numele firmei" name="businessName" value={draft.businessName} onChange={updateField} error={errors.businessName} placeholder="Auto Management SRL" autoComplete="organization" />
            <label className="block">
              <span className="text-sm font-medium text-[rgb(var(--foreground))]">Domeniul de activitate *</span>
              <select id="industry" required value={draft.industry} onChange={(event) => updateField("industry", event.target.value)} className="mt-2 h-11 w-full rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.18)]">
                <option value="">Alege domeniul</option>
                {industryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              {errors.industry ? <p className="mt-2 text-sm text-[rgb(var(--danger-text))]">{errors.industry}</p> : null}
            </label>
            {draft.industry === "Alt domeniu" ? <Field required label="Alt domeniu" name="customIndustry" value={draft.customIndustry} onChange={updateField} error={errors.customIndustry} placeholder="Descrie domeniul" /> : <Field label="Denumirea juridică" name="legalName" value={draft.legalName} onChange={updateField} placeholder="Auto Management SRL" />}
            <label className="block">
              <span className="text-sm font-medium text-[rgb(var(--foreground))]">Țara *</span>
              <select id="countryCode" required value={draft.countryCode} autoComplete="country" onChange={(event) => updateField("countryCode", event.target.value)} className="mt-2 h-11 w-full rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.18)]">
                {countryOptions.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}
              </select>
            </label>
            {controlledAreas ? (
              <SearchableSelect required label={regionLabel} name="administrativeArea" value={draft.administrativeArea} onChange={updateField} options={administrativeAreaOptions} error={errors.administrativeArea} placeholder="Selectează județul" />
            ) : (
              <Field required={isAdministrativeAreaRequired(draft.countryCode)} label={regionLabel} name="administrativeArea" value={draft.administrativeArea} onChange={updateField} error={errors.administrativeArea} placeholder={regionLabel} autoComplete="address-level1" />
            )}
            <div>
              <Field required label="Orașul/localitatea" name="city" value={draft.city} onChange={updateField} error={errors.city} placeholder="Exemplu: Ploiești" autoComplete="address-level2" />
              <p className="mt-2 text-[0.8125rem] leading-5 text-[rgb(var(--text-muted))]">Introdu localitatea sediului sau punctului principal de lucru.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr] md:col-span-2">
              <label className="block">
                <span className="text-sm font-medium text-[rgb(var(--foreground))]">Țara telefonului</span>
                <select id="companyPhoneCountry" value={draft.companyPhoneCountry} onChange={(event) => updateField("companyPhoneCountry", event.target.value)} className="mt-2 h-11 w-full rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.18)]">
                  {countryOptions.map((country) => <option key={country.code} value={country.code}>{country.label} {country.callingCode}</option>)}
                </select>
              </label>
              <Field required label="Telefonul firmei" name="companyPhone" value={draft.companyPhone} onChange={updateField} error={errors.companyPhone} placeholder="+40 721 000 000" type="tel" autoComplete="tel" />
            </div>
            {draft.industry === "Alt domeniu" ? <Field label="Denumirea juridică" name="legalName" value={draft.legalName} onChange={updateField} placeholder="Auto Management SRL" /> : null}
            {draft.countryCode === "RO" ? <Field label="CUI" name="cui" value={draft.cui} onChange={updateField} error={errors.cui} placeholder="RO12345678" /> : null}
            <Field label="Website" name="website" value={draft.website} onChange={updateField} error={errors.website} placeholder="firma.ro" autoComplete="url" />
            <Field label="Cod poștal" name="postalCode" value={draft.postalCode} onChange={updateField} placeholder="077190" autoComplete="postal-code" />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-5 grid gap-4">
            <Field required label="Serviciul sau produsul principal" name="mainOffering" value={draft.mainOffering} onChange={updateField} error={errors.mainOffering} placeholder="Închiriere auto pentru companii" />
            <label className="block">
              <span className="text-sm font-medium text-[rgb(var(--foreground))]">Descriere scurtă *</span>
              <textarea
                id="shortDescription"
                required
                value={draft.shortDescription}
                onChange={(event) => updateField("shortDescription", event.target.value)}
                rows={4}
                aria-invalid={Boolean(errors.shortDescription)}
                placeholder="Descrie pe scurt oferta, piața țintă și ce fel de cereri merită urmărite."
                className="mt-2 w-full rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-3 text-sm text-[rgb(var(--foreground))] outline-none placeholder:text-[rgb(var(--text-faint))] focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.18)]"
              />
              {errors.shortDescription ? <p className="mt-2 text-sm text-[rgb(var(--danger-text))]">{errors.shortDescription}</p> : null}
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <Field required label="Valoarea medie a unui client sau contract" name="averageContractValue" value={draft.averageContractValue} onChange={updateField} error={errors.averageContractValue} placeholder="6200" type="number" />
              <label className="block">
                <span className="text-sm font-medium text-[rgb(var(--foreground))]">Moneda *</span>
                <select id="currency" required value={draft.currency} onChange={(event) => updateField("currency", event.target.value)} className="mt-2 h-11 w-full rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.18)]">
                  {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-5 grid gap-5">
            <div>
              <p className="text-sm font-medium text-[rgb(var(--foreground))]">Surse de cereri *</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {leadSourceOptions.map((source) => (
                  <label key={source} className={`focus-within:focus-ring flex min-h-11 items-center gap-2 rounded-control border px-3 py-2 text-sm transition ${draft.leadSources.includes(source) ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--foreground))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] text-[rgb(var(--text-muted))]"}`}>
                    <input type="checkbox" checked={draft.leadSources.includes(source)} onChange={() => toggleSource(source)} className="h-4 w-4 accent-[rgb(var(--primary))]" />
                    {source}
                  </label>
                ))}
              </div>
              {errors.leadSources ? <p className="mt-2 text-sm text-[rgb(var(--danger-text))]">{errors.leadSources}</p> : null}
            </div>
            {draft.leadSources.includes("Alte surse") ? <Field required label="Alte surse" name="customLeadSource" value={draft.customLeadSource} onChange={updateField} error={errors.customLeadSource} placeholder="Descrie sursa" /> : null}
            <label className="block">
              <span className="text-sm font-medium text-[rgb(var(--foreground))]">Care este problema comercială principală? *</span>
              <select id="mainCommercialProblem" required value={draft.mainCommercialProblem} onChange={(event) => updateField("mainCommercialProblem", event.target.value)} className="mt-2 h-11 w-full rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.18)]">
                <option value="">Alege problema</option>
                {commercialProblemOptions.map((problem) => <option key={problem} value={problem}>{problem}</option>)}
              </select>
              {errors.mainCommercialProblem ? <p className="mt-2 text-sm text-[rgb(var(--danger-text))]">{errors.mainCommercialProblem}</p> : null}
            </label>
            {draft.mainCommercialProblem === "Altă problemă" ? <Field required label="Altă problemă" name="customCommercialProblem" value={draft.customCommercialProblem} onChange={updateField} error={errors.customCommercialProblem} placeholder="Descrie problema" /> : null}
            <p className="rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-3 text-[0.8125rem] leading-5 text-[rgb(var(--text-muted))]">Selectarea unei surse precum Gmail, WhatsApp sau CRM nu activează o integrare. Sursele descriu contextul comercial; nicio conexiune sau acțiune externă nu pornește automat.</p>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-5 grid gap-4 text-sm leading-6 text-[rgb(var(--text-muted))]">
            <p className="rounded-control border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--primary)/0.08)] p-4 text-[rgb(var(--text-muted))]">După creare vei continua în spațiul de lucru. Poți importa date în Inbox Comercial, iar fiecare semnal rămâne sub controlul echipei înainte de conversie sau contact extern.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {reviewSections.map((section) => <section key={section.title} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
                <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-3">
                  <h3 className="font-semibold text-[rgb(var(--foreground))]">{section.title}</h3>
                  <button type="button" onClick={() => setStep(section.step)} className="focus-ring rounded px-2 py-1 text-xs font-semibold text-[rgb(var(--primary))]">Editează</button>
                </div>
                <dl className="mt-3 grid gap-3">
                  {section.rows.map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-faint))]">{label}</dt><dd className="mt-1 text-sm text-[rgb(var(--foreground))]">{value || "Necompletat"}</dd></div>)}
                </dl>
              </section>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex flex-col gap-3 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
        <div className="flex flex-wrap gap-3">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={() => setStep((current) => current - 1)} disabled={loading}>
            Înapoi
          </Button>
        ) : null}
        {step < steps.length - 1 ? (
          <Button type="button" onClick={goNext}>
            Continuă
          </Button>
        ) : (
          <Button type="button" onClick={submit} disabled={loading || !canReview}>
            {loading ? "Se creează..." : "Creează spațiul de lucru"}
          </Button>
        )}
        </div>
        {step === steps.length - 1 ? <p className="text-[0.8125rem] text-[rgb(var(--text-muted))]">Poți modifica aceste date ulterior din Setări.</p> : null}
        {serverError ? <p className="text-sm text-[rgb(var(--danger-text))]">{serverError}</p> : null}
      </div>
    </div>
  );
}
