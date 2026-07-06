"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { saveOnboarding } from "@/lib/actions";
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

type Draft = {
  businessName: string;
  legalName: string;
  cui: string;
  website: string;
  industry: string;
  customIndustry: string;
  countryCode: string;
  administrativeArea: string;
  city: string;
  postalCode: string;
  companyPhoneCountry: string;
  companyPhone: string;
  mainOffering: string;
  shortDescription: string;
  averageContractValue: string;
  currency: string;
  leadSources: string[];
  customLeadSource: string;
  mainCommercialProblem: string;
  customCommercialProblem: string;
};

type FieldName = keyof Draft;

const initialDraft: Draft = {
  businessName: "",
  legalName: "",
  cui: "",
  website: "",
  industry: "",
  customIndustry: "",
  countryCode: "RO",
  administrativeArea: "",
  city: "",
  postalCode: "",
  companyPhoneCountry: "RO",
  companyPhone: "",
  mainOffering: "",
  shortDescription: "",
  averageContractValue: "",
  currency: "RON",
  leadSources: [],
  customLeadSource: "",
  mainCommercialProblem: "",
  customCommercialProblem: ""
};

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
      <span className="text-sm font-medium text-zinc-300">{label}</span>
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
        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-mint-400/60"
      />
      {error ? <p id={`${name}-error`} className="mt-2 text-sm text-red-300">{error}</p> : null}
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
  const visibleOptions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ro-RO");
    const filtered = normalized
      ? options.filter((option) => option.label.toLocaleLowerCase("ro-RO").includes(normalized))
      : options;
    return filtered.slice(0, 60);
  }, [options, query]);

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
    <label className="relative block">
      <span className="text-sm font-medium text-zinc-300">{label}{required ? " *" : ""}</span>
      <input
        id={name}
        role="combobox"
        required={required}
        disabled={disabled}
        value={open ? query : selected?.label ?? ""}
        onChange={(event) => updateQuery(event.target.value)}
        onInput={(event) => updateQuery(event.currentTarget.value)}
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
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.min(index + 1, Math.max(visibleOptions.length - 1, 0)));
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
            return;
          }
          if (event.key === "Enter") {
            const typedValue = event.currentTarget.value.trim().toLocaleLowerCase("ro-RO");
            const exactOption = options.find((option) => option.label.toLocaleLowerCase("ro-RO") === typedValue);
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
        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-mint-400/60 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {open && !disabled ? (
        <div id={listboxId} role="listbox" className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-white/10 bg-ink-950 p-1 shadow-xl">
          {visibleOptions.length ? visibleOptions.map((option, index) => (
            <button
              id={`${name}-option-${option.value}`}
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${index === activeIndex ? "bg-mint-400/15 text-white" : "text-zinc-200 hover:bg-white/[0.08]"}`}
            >
              {option.label}
            </button>
          )) : <p className="px-3 py-2 text-sm text-zinc-400">{emptyLabel}</p>}
        </div>
      ) : null}
      {error ? <p id={`${name}-error`} className="mt-2 text-sm text-red-300">{error}</p> : null}
    </label>
  );
}

function ErrorSummary({ errors }: { errors: FieldErrors<FieldName> }) {
  const entries = Object.entries(errors).filter((entry): entry is [FieldName, string] => Boolean(entry[1]));
  if (!entries.length) return null;

  return (
    <div className="rounded-lg border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-100" role="alert">
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

function validateStep(draft: Draft, step: number) {
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

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initialDraft);
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

  function focusFirstError(nextErrors: FieldErrors<FieldName>) {
    const first = Object.keys(nextErrors)[0];
    window.requestAnimationFrame(() => {
      if (first) document.getElementById(first)?.focus();
      errorRef.current?.scrollIntoView({ block: "nearest" });
    });
  }

  function updateField(name: FieldName, value: string) {
    setDraft((current) => {
      if (name === "countryCode") {
        return { ...current, countryCode: value, companyPhoneCountry: value, administrativeArea: "", city: "", cui: value === "RO" ? current.cui : "" };
      }
      if (name === "administrativeArea") {
        return { ...current, administrativeArea: value, city: "" };
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

  function goNext() {
    const nextErrors = validateStep(draft, step);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      focusFirstError(nextErrors);
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
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

    const result = await saveOnboarding(formData);
    if (!result.ok) {
      setServerError(result.error ?? "Nu am putut crea spațiul firmei.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="grid gap-6">
      <nav aria-label="Pași onboarding" className="grid gap-2 sm:grid-cols-4">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => index <= step && setStep(index)}
            className={`focus-ring rounded-lg border px-3 py-3 text-left text-sm font-semibold transition ${
              index === step ? "border-mint-400/50 bg-mint-400/[0.08] text-white" : "border-white/10 bg-white/[0.04] text-zinc-400"
            }`}
          >
            <span className="block text-xs text-mint-300">{index + 1}.</span>
            {label}
          </button>
        ))}
      </nav>

      <div ref={errorRef}>
        <ErrorSummary errors={errors} />
      </div>

      <section className="rounded-xl border border-white/10 bg-white/[0.045] p-5">
        <h2 className="text-lg font-semibold text-white">{steps[step]}</h2>

        {step === 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field required label="Numele firmei" name="businessName" value={draft.businessName} onChange={updateField} error={errors.businessName} placeholder="Auto Management SRL" autoComplete="organization" />
            <label className="block">
              <span className="text-sm font-medium text-zinc-300">Domeniul de activitate</span>
              <select id="industry" required value={draft.industry} onChange={(event) => updateField("industry", event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-900 px-4 text-white outline-none transition focus:border-mint-400/60">
                <option value="">Alege domeniul</option>
                {industryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              {errors.industry ? <p className="mt-2 text-sm text-red-300">{errors.industry}</p> : null}
            </label>
            {draft.industry === "Alt domeniu" ? <Field required label="Alt domeniu" name="customIndustry" value={draft.customIndustry} onChange={updateField} error={errors.customIndustry} placeholder="Descrie domeniul" /> : null}
            <label className="block">
              <span className="text-sm font-medium text-zinc-300">Țara</span>
              <select id="countryCode" required value={draft.countryCode} autoComplete="country" onChange={(event) => updateField("countryCode", event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-900 px-4 text-white outline-none transition focus:border-mint-400/60">
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
              <p className="mt-2 text-xs leading-5 text-zinc-500">Introdu localitatea sediului sau punctului principal de lucru.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr] md:col-span-2">
              <label className="block">
                <span className="text-sm font-medium text-zinc-300">Țara telefonului</span>
                <select id="companyPhoneCountry" value={draft.companyPhoneCountry} onChange={(event) => updateField("companyPhoneCountry", event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-900 px-4 text-white outline-none transition focus:border-mint-400/60">
                  {countryOptions.map((country) => <option key={country.code} value={country.code}>{country.label} {country.callingCode}</option>)}
                </select>
              </label>
              <Field required label="Telefonul firmei" name="companyPhone" value={draft.companyPhone} onChange={updateField} error={errors.companyPhone} placeholder="+40 721 000 000" type="tel" autoComplete="tel" />
            </div>
            <Field label="Denumirea juridică" name="legalName" value={draft.legalName} onChange={updateField} placeholder="Auto Management SRL" />
            {draft.countryCode === "RO" ? <Field label="CUI" name="cui" value={draft.cui} onChange={updateField} error={errors.cui} placeholder="RO12345678" /> : null}
            <Field label="Website" name="website" value={draft.website} onChange={updateField} error={errors.website} placeholder="firma.ro" autoComplete="url" />
            <Field label="Cod poștal" name="postalCode" value={draft.postalCode} onChange={updateField} placeholder="077190" autoComplete="postal-code" />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-5 grid gap-4">
            <Field required label="Serviciul sau produsul principal" name="mainOffering" value={draft.mainOffering} onChange={updateField} error={errors.mainOffering} placeholder="Închiriere auto pentru companii" />
            <label className="block">
              <span className="text-sm font-medium text-zinc-300">Descriere scurtă</span>
              <textarea
                id="shortDescription"
                required
                value={draft.shortDescription}
                onChange={(event) => updateField("shortDescription", event.target.value)}
                rows={4}
                aria-invalid={Boolean(errors.shortDescription)}
                placeholder="Descrie pe scurt oferta, piața țintă și ce fel de cereri merită urmărite."
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-mint-400/60"
              />
              {errors.shortDescription ? <p className="mt-2 text-sm text-red-300">{errors.shortDescription}</p> : null}
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <Field required label="Valoarea medie a unui client sau contract" name="averageContractValue" value={draft.averageContractValue} onChange={updateField} error={errors.averageContractValue} placeholder="6200" type="number" />
              <label className="block">
                <span className="text-sm font-medium text-zinc-300">Moneda</span>
                <select id="currency" required value={draft.currency} onChange={(event) => updateField("currency", event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-900 px-4 text-white outline-none transition focus:border-mint-400/60">
                  {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-5 grid gap-5">
            <div>
              <p className="text-sm font-medium text-zinc-300">Surse de cereri</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {leadSourceOptions.map((source) => (
                  <label key={source} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-300">
                    <input type="checkbox" checked={draft.leadSources.includes(source)} onChange={() => toggleSource(source)} className="h-4 w-4 accent-mint-400" />
                    {source}
                  </label>
                ))}
              </div>
              {errors.leadSources ? <p className="mt-2 text-sm text-red-300">{errors.leadSources}</p> : null}
            </div>
            {draft.leadSources.includes("Alte surse") ? <Field required label="Alte surse" name="customLeadSource" value={draft.customLeadSource} onChange={updateField} error={errors.customLeadSource} placeholder="Descrie sursa" /> : null}
            <label className="block">
              <span className="text-sm font-medium text-zinc-300">Care este problema comercială principală?</span>
              <select id="mainCommercialProblem" required value={draft.mainCommercialProblem} onChange={(event) => updateField("mainCommercialProblem", event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-900 px-4 text-white outline-none transition focus:border-mint-400/60">
                <option value="">Alege problema</option>
                {commercialProblemOptions.map((problem) => <option key={problem} value={problem}>{problem}</option>)}
              </select>
              {errors.mainCommercialProblem ? <p className="mt-2 text-sm text-red-300">{errors.mainCommercialProblem}</p> : null}
            </label>
            {draft.mainCommercialProblem === "Altă problemă" ? <Field required label="Altă problemă" name="customCommercialProblem" value={draft.customCommercialProblem} onChange={updateField} error={errors.customCommercialProblem} placeholder="Descrie problema" /> : null}
            <p className="text-xs leading-5 text-zinc-500">Selectarea unei surse precum Gmail, WhatsApp sau CRM nu activează o integrare. Sursele descriu contextul auditului.</p>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-5 grid gap-4 text-sm leading-6 text-zinc-300">
            {[
              ["Firmă", `${draft.businessName} · ${draft.industry === "Alt domeniu" ? draft.customIndustry : draft.industry}`],
              ["Localizare", `${draft.countryCode}, ${administrativeAreaDisplayName(draft.countryCode, draft.administrativeArea) || "fără regiune"}, ${draft.city}`],
              ["Telefon firmă", draft.companyPhone],
              ["Date opționale", [draft.legalName, draft.countryCode === "RO" ? draft.cui : "", draft.website, draft.postalCode].filter(Boolean).join(" · ") || "Nicio valoare opțională completată"],
              ["Ofertă", `${draft.mainOffering} · ${draft.shortDescription}`],
              ["Valoare medie", `${draft.averageContractValue} ${draft.currency}`],
              ["Surse", [...draft.leadSources, draft.customLeadSource].filter(Boolean).join(", ")],
              ["Problemă", draft.mainCommercialProblem === "Altă problemă" ? draft.customCommercialProblem : draft.mainCommercialProblem]
            ].map(([label, value], index) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-3">
                  <p><span className="font-semibold text-white">{label}:</span> {value}</p>
                  {index < 4 ? <button type="button" onClick={() => setStep(0)} className="focus-ring rounded px-2 py-1 text-xs font-semibold text-mint-300">Editează</button> : index < 6 ? <button type="button" onClick={() => setStep(1)} className="focus-ring rounded px-2 py-1 text-xs font-semibold text-mint-300">Editează</button> : <button type="button" onClick={() => setStep(2)} className="focus-ring rounded px-2 py-1 text-xs font-semibold text-mint-300">Editează</button>}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center" aria-live="polite">
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
            {loading ? "Se creează..." : "Creează spațiul firmei"}
          </Button>
        )}
        {serverError ? <p className="text-sm text-red-300">{serverError}</p> : null}
      </div>
    </div>
  );
}
