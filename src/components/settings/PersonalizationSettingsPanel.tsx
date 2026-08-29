"use client";

import { Select } from "@/components/ui/Select";
import { useEffect, useState } from "react";
import { CheckIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useTheme } from "@/components/theme/ThemeProvider";
import { WorkspaceIdentityMark } from "@/components/theme/WorkspaceIdentityMark";
import { WorkspaceLogoPicker } from "@/components/settings/WorkspaceLogoPicker";
import {
  accentThemePresets,
  accentThemeStyle,
  defaultAccentTheme,
  workspaceIndustryOptions,
  type AccentThemeId,
  type WorkspaceIdentityPreview
} from "@/lib/theme-presets";

const fieldClassName = "focus-ring min-h-9 w-full rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--foreground))]";

export function PersonalizationSettingsPanel({ baselineName, baselineIndustry }: { baselineName: string; baselineIndustry: string }) {
  const {
    accentTheme,
    setAccentTheme,
    identityPreview,
    setIdentityPreview,
    resetIdentityPreview,
    personalizationReady
  } = useTheme();
  const [draftAccent, setDraftAccent] = useState<AccentThemeId>(accentTheme);
  const [identity, setIdentity] = useState<WorkspaceIdentityPreview>({
    displayName: baselineName,
    initials: "",
    industry: baselineIndustry || "Servicii B2B",
    currency: "RON + EUR",
    language: "ro"
  });
  const [notice, setNotice] = useState("");
  const [showOtherAccents, setShowOtherAccents] = useState(false);
  const recommendedAccent = accentThemePresets.find((preset) => preset.id === defaultAccentTheme)!;
  const secondaryAccents = accentThemePresets.filter((preset) => preset.id !== defaultAccentTheme);

  useEffect(() => setDraftAccent(accentTheme), [accentTheme]);

  useEffect(() => {
    if (!personalizationReady) return;
    setIdentity(identityPreview ?? {
      displayName: baselineName,
      initials: "",
      industry: baselineIndustry || "Servicii B2B",
      currency: "RON + EUR",
      language: "ro"
    });
  }, [baselineIndustry, baselineName, identityPreview, personalizationReady]);

  function updateIdentity<Key extends keyof WorkspaceIdentityPreview>(key: Key, value: WorkspaceIdentityPreview[Key]) {
    setIdentity((current) => ({ ...current, [key]: value }));
    setNotice("");
  }

  function applyAccent() {
    setAccentTheme(draftAccent);
    setNotice("Culoarea accent se aplică în acest browser.");
  }

  function resetAccent() {
    setDraftAccent(defaultAccentTheme);
    setAccentTheme(defaultAccentTheme);
    setNotice("Accentul implicit ReveNew a fost restaurat în acest browser.");
  }

  function saveIdentity() {
    setIdentityPreview(identity);
    setNotice("Identitatea de afișare se aplică local în acest browser. Datele legale ale companiei nu se modifică.");
  }

  function resetIdentity() {
    resetIdentityPreview();
    setIdentity({ displayName: baselineName, initials: "", industry: baselineIndustry || "Servicii B2B", currency: "RON + EUR", language: "ro" });
    setNotice("Previzualizarea locală a identității a fost eliminată.");
  }

  return (
    <section id="aspect" data-guide-anchor="settings-appearance" className="scroll-mt-36 grid gap-5" aria-labelledby="appearance-title">
      <div>
        <h2 id="appearance-title" className="text-xl font-semibold">Aspect</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[rgb(var(--text-muted))]">Alege modul în care recunoști spațiul de lucru în acest browser. Logica comercială și datele companiei nu se schimbă.</p>
      </div>

      <div className="divide-y divide-[rgb(var(--border))] border-y border-[rgb(var(--border))]">
        <div className="grid gap-4 py-4 lg:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] lg:gap-6">
          <div>
            <h3 className="text-sm font-semibold">Culoare accent</h3>
            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Preseturi cu contrast controlat, fără selector de culoare liber.</p>
          </div>
          <div className="min-w-0">
            <fieldset>
              <legend className="sr-only">Alege culoarea accent</legend>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Identitatea recomandată ReveNew</p>
              <label
                data-accent-preview={recommendedAccent.id}
                style={accentThemeStyle(recommendedAccent.id)}
                title={recommendedAccent.description}
                className={`mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-control border px-3 py-2.5 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[rgb(var(--focus-ring))] ${draftAccent === recommendedAccent.id ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary-muted))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:border-[rgb(var(--border-strong))]"}`}
              >
                <span className="flex items-center gap-2"><input className="sr-only" type="radio" name="accent-theme" value={recommendedAccent.id} checked={draftAccent === recommendedAccent.id} onChange={() => setDraftAccent(recommendedAccent.id)} /><span className="h-4 w-4 rounded-full border border-[rgb(var(--rn-accent-border))] bg-[rgb(var(--rn-accent))]" aria-hidden="true" /><span className="text-xs font-semibold">Champagne Gold</span><span className="text-xs text-[rgb(var(--text-muted))]">Recomandat</span></span>
                {draftAccent === recommendedAccent.id ? <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" aria-label="Selectată"><CheckIcon className="h-3 w-3" aria-hidden="true" /></span> : null}
              </label>
              <button type="button" onClick={() => setShowOtherAccents((value) => !value)} aria-expanded={showOtherAccents || draftAccent !== defaultAccentTheme} className="focus-ring mt-3 inline-flex min-h-9 items-center rounded-button px-2 text-xs font-semibold text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-subtle))] hover:text-[rgb(var(--foreground))]">{showOtherAccents || draftAccent !== defaultAccentTheme ? "Ascunde culorile alternative" : "Alte culori"}</button>
              {showOtherAccents || draftAccent !== defaultAccentTheme ? <div className="mt-2 flex flex-wrap gap-2">{secondaryAccents.map((preset) => { const selected = preset.id === draftAccent; return <label key={preset.id} data-accent-preview={preset.id} style={accentThemeStyle(preset.id)} title={preset.description} className={`focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[rgb(var(--focus-ring))] cursor-pointer rounded-button border px-2.5 py-2 transition-colors ${selected ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary-muted))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:border-[rgb(var(--border-strong))]"}`}><input className="sr-only" type="radio" name="accent-theme" value={preset.id} checked={selected} onChange={() => setDraftAccent(preset.id)} /><span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border border-[rgb(var(--rn-accent-border))] bg-[rgb(var(--rn-accent))]" aria-hidden="true" /><span className="text-xs font-semibold">{preset.label}</span>{selected ? <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" aria-label="Selectată"><CheckIcon className="h-3 w-3" aria-hidden="true" /></span> : null}</span></label>; })}</div> : null}
            </fieldset>
            <div className="mt-4 flex flex-wrap gap-2"><Button type="button" size="small" onClick={applyAccent}>Aplică tema</Button><Button type="button" size="small" variant="secondary" onClick={resetAccent}>Revino la implicit</Button></div>
            <p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">Preferința se aplică în acest browser.</p>
            <div data-accent-preview={draftAccent} style={accentThemeStyle(draftAccent)} className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-l-2 border-l-[rgb(var(--primary))] bg-[rgb(var(--surface-subtle))] px-3 py-2.5" aria-label="Previzualizare temă">
              <span className="text-xs font-semibold text-[rgb(var(--primary))]">Accent în interfață</span>
              <span className="text-sm font-medium text-[rgb(var(--foreground))]">Exemplu de prezentare</span>
              <span className="status-pill status-pill-neutral">Previzualizare</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]"><strong className="text-[rgb(var(--foreground))]">Claritate păstrată.</strong> Culorile de status — critic, succes, eroare și avertizare — rămân independente de accent.</p>
          </div>
        </div>

        <div id="identitate" data-guide-anchor="settings-identity" className="scroll-mt-36 grid gap-4 py-4 lg:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] lg:gap-6" aria-labelledby="identity-title">
          <div>
            <h3 id="identity-title" className="text-sm font-semibold">Identitate spațiu de lucru</h3>
            <p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Afișare locală, distinctă de datele legale ale companiei.</p>
          </div>
          <div className="min-w-0">
            <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">Nume afișat al spațiului de lucru<Input value={identity.displayName} maxLength={64} onChange={(event) => updateIdentity("displayName", event.target.value)} /></label>
            <label className="grid gap-2 text-sm font-semibold">Inițiale / marcă scurtă<Input value={identity.initials} maxLength={4} onChange={(event) => updateIdentity("initials", event.target.value.replace(/[^a-zA-Z0-9ĂÂÎȘȚăâîșț]/g, "").toLocaleUpperCase("ro-RO"))} placeholder="AM" /></label>
            <label className="grid gap-2 text-sm font-semibold">Industrie<Select className={fieldClassName} value={identity.industry} onChange={(event) => updateIdentity("industry", event.target.value)}>{workspaceIndustryOptions.map((industry) => <option key={industry}>{industry}</option>)}</Select></label>
            <label className="grid gap-2 text-sm font-semibold">Monedă principală<Select className={fieldClassName} value={identity.currency} onChange={(event) => updateIdentity("currency", event.target.value as WorkspaceIdentityPreview["currency"])}><option>RON</option><option>EUR</option><option>RON + EUR</option></Select></label>
            <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Preferință de limbă<Select className={fieldClassName} value={identity.language} onChange={(event) => updateIdentity("language", event.target.value as WorkspaceIdentityPreview["language"])}><option value="ro">Română</option><option value="en-ready">English · pregătit pentru viitor</option></Select></label>
            <WorkspaceLogoPicker />
            <p className="text-xs leading-5 text-[rgb(var(--text-muted))] sm:col-span-2">Moneda este o preferință de afișare: nu convertește valorile existente, iar moneda originală rămâne identificabilă în rapoarte. Conversia analitică se selectează separat în Control Center și Pipeline. Preferința English este pregătită pentru viitor; interfața curentă rămâne în română.</p>
          </div>
            <div data-accent-preview={draftAccent} style={accentThemeStyle(draftAccent)} className="mt-4 flex flex-col gap-3 border-t border-[rgb(var(--border))] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3"><WorkspaceIdentityMark displayName={identity.displayName || baselineName} initials={identity.initials} /><div className="min-w-0"><p className="truncate text-sm font-semibold" title={identity.displayName || baselineName}>{identity.displayName || baselineName}</p><p className="truncate text-xs text-[rgb(var(--text-muted))]">{identity.industry || "Industrie necompletată"} · {identity.currency}</p></div></div>
              <p className="max-w-sm text-xs leading-5 text-[rgb(var(--text-muted))]">ReveNew rămâne brandul produsului. Logo-ul și numele identifică separat compania activă.</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2"><Button type="button" size="small" onClick={saveIdentity}>Aplică afișarea locală</Button><Button type="button" size="small" variant="secondary" onClick={resetIdentity}>Elimină previzualizarea</Button></div>
          </div>
        </div>
      </div>
      {notice ? <p className="text-sm leading-6 text-[rgb(var(--text-muted))]" role="status">{notice}</p> : null}
    </section>
  );
}
