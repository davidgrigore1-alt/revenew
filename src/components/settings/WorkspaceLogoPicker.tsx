"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { PhotoIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/components/theme/ThemeProvider";
import { validateWorkspaceLogoFile, type WorkspaceLogo } from "@/lib/workspace-logo";

export function WorkspaceLogoPicker() {
  const { workspaceLogo, setWorkspaceLogo, removeWorkspaceLogo } = useTheme();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function chooseLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError("");
    setMessage("");
    if (!file) return;
    const validation = validateWorkspaceLogoFile(file);
    if (!validation.valid) {
      setError(validation.error);
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setError("Fișierul nu a putut fi citit. Încearcă un alt logo.");
    reader.onload = () => {
      const logo: WorkspaceLogo = { dataUrl: String(reader.result ?? ""), fileName: file.name, mimeType: file.type as WorkspaceLogo["mimeType"], size: file.size };
      if (!setWorkspaceLogo(logo)) {
        setError("Browserul nu a putut salva logo-ul local. Alege un fișier mai mic sau continuă cu inițialele.");
        return;
      }
      setMessage("Logo-ul a fost aplicat și salvat doar în acest browser.");
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    removeWorkspaceLogo();
    if (inputRef.current) inputRef.current.value = "";
    setError("");
    setMessage("Logo-ul a fost eliminat. ReveNew folosește din nou inițialele spațiului de lucru.");
  }

  return (
    <div className="rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-4 sm:col-span-2">
      <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-[rgb(var(--primary)/0.28)] bg-[rgb(var(--primary-muted))] text-[rgb(var(--primary))]"><PhotoIcon className="h-4.5 w-4.5" aria-hidden="true" /></span><div><h4 className="text-sm font-semibold">Logo opțional</h4><p className="mt-1 text-xs leading-5 text-[rgb(var(--text-muted))]">Acceptăm PNG, JPG sau WEBP, maximum 800 KB. SVG nu este acceptat în v1. Recomandat: pătrat, cu fundal transparent sau simplu.</p></div></div>
      <p className="mt-4 text-xs font-semibold text-[rgb(var(--foreground))]">Alege logo-ul companiei</p>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-3">
        <label htmlFor="workspace-logo-file" className="focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[rgb(var(--focus-ring))] inline-flex min-h-10 cursor-pointer items-center justify-center rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-xs font-semibold text-[rgb(var(--foreground))] hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-muted))]">
          Alege fișier
          <input ref={inputRef} id="workspace-logo-file" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={chooseLogo} className="sr-only" />
        </label>
        <span className="min-w-0 max-w-full truncate text-xs text-[rgb(var(--text-muted))]" title={workspaceLogo?.fileName ?? "Niciun logo selectat"}>{workspaceLogo?.fileName ?? "Niciun logo selectat"}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3"><p className="text-xs leading-5 text-[rgb(var(--text-muted))]">Pentru v1, logo-ul este salvat doar în acest browser. Dacă nu adaugi logo, ReveNew folosește inițialele spațiului de lucru.</p>{workspaceLogo ? <Button type="button" variant="ghost" size="small" onClick={removeLogo}><TrashIcon className="h-4 w-4" aria-hidden="true" />Elimină logo</Button> : null}</div>
      {error ? <p className="mt-3 text-xs leading-5 text-[rgb(var(--danger-text))]" role="alert">{error}</p> : null}
      {message ? <p className="mt-3 text-xs leading-5 text-[rgb(var(--text-muted))]" role="status">{message}</p> : null}
    </div>
  );
}
