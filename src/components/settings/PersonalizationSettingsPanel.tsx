"use client";

import { useEffect, useState } from "react";
import { CheckIcon, PaintBrushIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useTheme } from "@/components/theme/ThemeProvider";
import {
  accentThemePresets,
  accentThemeStyle,
  defaultAccentTheme,
  workspaceIndustryOptions,
  type AccentThemeId,
  type WorkspaceIdentityPreview
} from "@/lib/theme-presets";

const fieldClassName = "focus-ring min-h-11 w-full rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--foreground))]";

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
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">Personalizare controlată</p>
        <h2 id="appearance-title" className="mt-1 text-xl font-semibold">Aspect</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--text-muted))]">Alege un accent vizual premium. Structura produsului, statusurile critice și logica comercială nu se schimbă.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary-muted))] text-[rgb(var(--primary))]"><PaintBrushIcon className="h-5 w-5" aria-hidden="true" /></span>
            <div><h3 className="font-semibold">Culoare accent</h3><p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">Preseturile păstrează contrastul și caracterul premium. Nu există selector de culoare liber.</p></div>
          </div>

          <fieldset className="mt-5">
            <legend className="sr-only">Alege culoarea accent</legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {accentThemePresets.map((preset) => {
                const selected = preset.id === draftAccent;
                return (
                  <label key={preset.id} data-accent-preview={preset.id} style={accentThemeStyle(preset.id)} className={`focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[rgb(var(--focus-ring))] relative cursor-pointer rounded-card border p-3 transition-colors ${selected ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary-muted))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] hover:border-[rgb(var(--primary)/0.45)]"}`}>
                    <input className="sr-only" type="radio" name="accent-theme" value={preset.id} checked={selected} onChange={() => setDraftAccent(preset.id)} />
                    <span className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2"><span className="h-5 w-5 rounded-full border border-[rgb(var(--rn-accent-border))] bg-[rgb(var(--rn-accent))]" aria-hidden="true" /><span className="text-sm font-semibold">{preset.label}</span></span>
                      {selected ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" aria-label="Selectată"><CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /></span> : null}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-[rgb(var(--text-muted))]">{preset.description}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="mt-5 flex flex-wrap gap-2"><Button type="button" onClick={applyAccent}>Aplică tema</Button><Button type="button" variant="secondary" onClick={resetAccent}>Revino la implicit</Button></div>
          <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]">Preferința se aplică în acest browser.</p>
        </div>

        <div data-accent-preview={draftAccent} style={accentThemeStyle(draftAccent)} className="overflow-hidden rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card" aria-label="Previzualizare temă">
          <div className="flex items-center justify-between border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3"><span className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">Previzualizare</span><span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--primary))]" aria-hidden="true" /></div>
          <div className="grid gap-4 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs text-[rgb(var(--text-muted))]">Control Center</p><p className="font-semibold">Decizie comercială prioritară</p></div><span className="rounded-full border border-[rgb(var(--primary)/0.32)] bg-[rgb(var(--primary-muted))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--primary))]">Selectat</span></div>
            <div className="rounded-card border-l-2 border-l-[rgb(var(--primary))] bg-[rgb(var(--surface-subtle))] p-3"><p className="text-xs font-semibold text-[rgb(var(--primary))]">Recomandare explicată</p><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Dovada și acțiunea sigură rămân vizibile înaintea deciziei.</p></div>
            <button type="button" className="focus-ring min-h-10 rounded-button bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))]">Acțiune principală</button>
            <div className="flex flex-wrap gap-2 text-[0.6875rem] font-semibold"><span className="rounded-full border border-[rgb(var(--success-border))] bg-[rgb(var(--success-background))] px-2 py-1 text-[rgb(var(--success-text))]">Succes</span><span className="rounded-full border border-[rgb(var(--warning-border))] bg-[rgb(var(--warning-background))] px-2 py-1 text-[rgb(var(--warning-text))]">Avertizare</span><span className="rounded-full border border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] px-2 py-1 text-[rgb(var(--danger-text))]">Critic</span></div>
          </div>
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-3 text-xs leading-5 text-[rgb(var(--text-muted))]"><ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" /><span><strong className="text-[rgb(var(--foreground))]">Claritate păstrată.</strong> Culorile de status — critic, succes, eroare și avertizare — rămân independente de accent.</span></p>

      <div id="identitate" data-guide-anchor="settings-identity" className="scroll-mt-36 grid gap-5 rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card sm:p-6" aria-labelledby="identity-title">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">Afișare locală</p><h3 id="identity-title" className="mt-1 text-lg font-semibold">Identitate spațiu de lucru</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[rgb(var(--text-muted))]">Personalizează modul în care recunoști spațiul în acest browser. Numele legal și datele companiei nu sunt suprascrise.</p></div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.7fr)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">Nume afișat al spațiului de lucru<Input value={identity.displayName} maxLength={64} onChange={(event) => updateIdentity("displayName", event.target.value)} /></label>
            <label className="grid gap-2 text-sm font-semibold">Inițiale / marcă scurtă<Input value={identity.initials} maxLength={4} onChange={(event) => updateIdentity("initials", event.target.value.replace(/[^a-zA-Z0-9ĂÂÎȘȚăâîșț]/g, "").toLocaleUpperCase("ro-RO"))} placeholder="AM" /></label>
            <label className="grid gap-2 text-sm font-semibold">Industrie<select className={fieldClassName} value={identity.industry} onChange={(event) => updateIdentity("industry", event.target.value)}>{workspaceIndustryOptions.map((industry) => <option key={industry}>{industry}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-semibold">Monedă principală<select className={fieldClassName} value={identity.currency} onChange={(event) => updateIdentity("currency", event.target.value as WorkspaceIdentityPreview["currency"])}><option>RON</option><option>EUR</option><option>RON + EUR</option></select></label>
            <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Preferință de limbă<select className={fieldClassName} value={identity.language} onChange={(event) => updateIdentity("language", event.target.value as WorkspaceIdentityPreview["language"])}><option value="ro">Română</option><option value="en-ready">English · pregătit pentru viitor</option></select></label>
            <p className="text-xs leading-5 text-[rgb(var(--text-muted))] sm:col-span-2">Moneda este o preferință de afișare: nu convertește valorile existente, iar monedele rămân separate în rapoarte. Preferința English este pregătită pentru viitor; interfața curentă rămâne în română.</p>
          </div>
          <div data-accent-preview={draftAccent} style={accentThemeStyle(draftAccent)} className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-faint))]">Previzualizare spațiu</p>
            <div className="mt-4 flex items-center gap-3"><span className="flex h-11 min-w-11 items-center justify-center rounded-control border border-[rgb(var(--primary)/0.32)] bg-[rgb(var(--primary-muted))] px-2 text-xs font-bold tracking-[0.08em] text-[rgb(var(--primary))]">{identity.initials || "RN"}</span><div className="min-w-0"><p className="truncate font-semibold">{identity.displayName || baselineName}</p><p className="truncate text-xs text-[rgb(var(--text-muted))]">{identity.industry || "Industrie necompletată"}</p></div></div>
            <dl className="mt-5 grid gap-2 border-t border-[rgb(var(--border))] pt-4 text-xs"><div className="flex justify-between gap-3"><dt className="text-[rgb(var(--text-muted))]">Monedă principală</dt><dd className="font-semibold">{identity.currency}</dd></div><div className="flex justify-between gap-3"><dt className="text-[rgb(var(--text-muted))]">Interfață</dt><dd className="font-semibold">Română</dd></div></dl>
          </div>
        </div>
        <div className="flex flex-wrap gap-2"><Button type="button" onClick={saveIdentity}>Aplică afișarea locală</Button><Button type="button" variant="secondary" onClick={resetIdentity}>Elimină previzualizarea</Button></div>
      </div>
      {notice ? <p className="text-sm leading-6 text-[rgb(var(--text-muted))]" role="status">{notice}</p> : null}
    </section>
  );
}
