"use client";

import Papa from "papaparse";
import { useMemo, useState, useTransition } from "react";
import { ArrowDownTrayIcon, DocumentArrowUpIcon } from "@heroicons/react/24/outline";
import { importCsvBatch, type ImportEntityType, type ImportResult } from "@/lib/imports/actions";

type CsvRow = string[];
type FieldDefinition = { key: string; label: string; required?: boolean; aliases: string[] };

const fields: Record<ImportEntityType, FieldDefinition[]> = {
  organizations: [
    { key: "name", label: "Nume companie", required: true, aliases: ["name", "company", "companie", "organization", "organizatie"] },
    { key: "website", label: "Website / domeniu", aliases: ["website", "domain", "domeniu"] },
    { key: "industry", label: "Industrie", aliases: ["industry", "industrie"] },
    { key: "phone", label: "Telefon", aliases: ["phone", "telefon"] },
    { key: "city", label: "Oraș", aliases: ["city", "oras"] },
    { key: "county", label: "Județ", aliases: ["county", "judet"] },
    { key: "country", label: "Țară", aliases: ["country", "tara"] }
  ],
  contacts: [
    { key: "full_name", label: "Nume complet", required: true, aliases: ["full_name", "name", "nume", "contact"] },
    { key: "email", label: "Email", aliases: ["email", "e_mail"] },
    { key: "phone", label: "Telefon E.164", aliases: ["phone", "telefon"] },
    { key: "organization", label: "Companie existentă", aliases: ["organization", "company", "companie", "organizatie"] },
    { key: "job_title", label: "Funcție", aliases: ["job_title", "role", "functie"] },
    { key: "decision_role", label: "Rol de decizie", aliases: ["decision_role", "rol_decizie"] }
  ],
  opportunities: [
    { key: "title", label: "Titlu oportunitate", required: true, aliases: ["title", "opportunity", "oportunitate", "name"] },
    { key: "estimated_value", label: "Valoare estimată", aliases: ["estimated_value", "value", "valoare"] },
    { key: "currency", label: "Monedă", aliases: ["currency", "moneda"] },
    { key: "summary", label: "Context comercial", aliases: ["summary", "context", "descriere"] },
    { key: "next_action", label: "Următoarea acțiune", aliases: ["next_action", "actiune", "follow_up"] },
    { key: "owner_profile_id", label: "ID responsabil", aliases: ["owner_profile_id", "responsabil_id"] }
  ]
};

export function CsvImportWizard() {
  const [entityType, setEntityType] = useState<ImportEntityType>("organizations");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "update" | "create">("skip");
  const [fileError, setFileError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const mappedRows = useMemo(() => rows.map((row) => Object.fromEntries(fields[entityType].map((field) => [field.key, mapping[field.key] == null ? "" : row[mapping[field.key] as number] ?? ""]))), [entityType, mapping, rows]);
  const missingRequired = fields[entityType].filter((field) => field.required && mapping[field.key] == null);

  function resetForType(nextType: ImportEntityType) { setEntityType(nextType); setHeaders([]); setRows([]); setMapping({}); setResult(null); setFileError(""); }

  function loadFile(file?: File) {
    setResult(null); setFileError("");
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setFileError("Fișierul depășește limita de 2 MB."); return; }
    if (!file.name.toLowerCase().endsWith(".csv")) { setFileError("Selectează un fișier CSV."); return; }
    Papa.parse<CsvRow>(file, { skipEmptyLines: "greedy", encoding: "UTF-8", complete: (parsed) => {
      if (parsed.errors.length) { setFileError(`CSV-ul nu poate fi citit: ${parsed.errors[0].message}`); return; }
      const [headerRow = [], ...dataRows] = parsed.data;
      if (!headerRow.length || dataRows.length < 1) { setFileError("CSV-ul trebuie să conțină antet și cel puțin un rând."); return; }
      if (dataRows.length > 1000) { setFileError("Importul este limitat la 1.000 de rânduri per fișier."); return; }
      const cleanedHeaders = headerRow.map((header) => String(header).trim().slice(0, 80));
      const suggestions = Object.fromEntries(fields[entityType].map((field) => { const index = cleanedHeaders.findIndex((header) => field.aliases.includes(normalizeHeader(header))); return [field.key, index >= 0 ? index : null]; }));
      setHeaders(cleanedHeaders); setRows(dataRows.map((row) => row.slice(0, 30).map((cell) => String(cell).slice(0, 1200)))); setMapping(suggestions);
    }});
  }

  function confirmImport() { if (!missingRequired.length && mappedRows.length && !pending) startTransition(async () => setResult(await importCsvBatch(entityType, mappedRows, duplicateMode))); }

  function downloadErrors() {
    if (!result?.errors.length) return;
    const sanitize = (value: string) => { const safe = /^[=+\-@]/.test(value) ? `'${value}` : value; return `"${safe.replace(/"/g, '""')}"`; };
    const csv = ["rand,eroare", ...result.errors.map((error) => `${error.row},${sanitize(error.message)}`)].join("\r\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); link.download = "revenew-import-erori.csv"; link.click(); URL.revokeObjectURL(link.href);
  }

  return <div className="grid gap-6">
    <ol className="grid gap-2 text-sm sm:grid-cols-4" aria-label="Progres import">{["1. Tip și fișier", "2. Mapare", "3. Verificare", "4. Rezultat"].map((step, index) => <li key={step} className={`rounded-lg border px-3 py-2 font-semibold ${index === (result ? 3 : rows.length ? 1 : 0) ? "border-[rgb(var(--primary))] text-[rgb(var(--primary))]" : "border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))]"}`}>{step}</li>)}</ol>
    <section className="grid gap-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
      <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Tip înregistrări">{(["organizations", "contacts", "opportunities"] as const).map((type) => <button key={type} type="button" onClick={() => resetForType(type)} className={`focus-ring h-11 rounded-lg border px-3 text-sm font-semibold ${entityType === type ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)_/_0.12)]" : "border-[rgb(var(--border))]"}`}>{type === "organizations" ? "Companii" : type === "contacts" ? "Contacte" : "Oportunități"}</button>)}</div>
      <label className="focus-within:focus-ring grid min-h-32 cursor-pointer place-items-center rounded-lg border border-dashed border-[rgb(var(--border))] p-5 text-center"><span><DocumentArrowUpIcon className="mx-auto h-8 w-8 text-[rgb(var(--primary))]" aria-hidden="true" /><span className="mt-2 block font-semibold">Selectează CSV-ul</span><span className="mt-1 block text-sm text-[rgb(var(--muted-foreground))]">Maximum 2 MB și 1.000 de rânduri. Fișierul nu este încărcat în stocare externă.</span></span><input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => loadFile(event.target.files?.[0])} /></label>
      {fileError ? <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200" role="alert">{fileError}</p> : null}
    </section>
    {rows.length ? <section className="grid gap-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
      <div><h2 className="text-lg font-semibold">Mapează coloanele</h2><p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">ReveNew sugerează maparea. Confirmă fiecare câmp obligatoriu înainte de import.</p></div>
      <div className="grid gap-3 md:grid-cols-2">{fields[entityType].map((field) => <label key={field.key} className="text-sm font-semibold">{field.label}{field.required ? " *" : ""}<select value={mapping[field.key] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [field.key]: event.target.value === "" ? null : Number(event.target.value) }))} className="mt-2 h-11 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 font-normal"><option value="">Nu importa</option>{headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header || `Coloana ${index + 1}`}</option>)}</select></label>)}</div>
      {missingRequired.length ? <p className="text-sm text-red-300" role="alert">Mapează: {missingRequired.map((field) => field.label).join(", ")}.</p> : null}
      <label className="text-sm font-semibold">Cum tratăm duplicatele exacte?<select value={duplicateMode} onChange={(event) => setDuplicateMode(event.target.value as typeof duplicateMode)} className="mt-2 h-11 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 font-normal md:max-w-sm"><option value="skip">Omite duplicatele</option><option value="update">Actualizează doar potrivirile exacte</option>{entityType === "opportunities" ? <option value="create">Creează separat după confirmare</option> : null}</select></label>
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><caption className="mb-2 text-left font-semibold">Previzualizare: primele 5 din {rows.length} rânduri</caption><thead><tr>{fields[entityType].filter((field) => mapping[field.key] != null).map((field) => <th key={field.key} className="border-b border-[rgb(var(--border))] px-3 py-2">{field.label}</th>)}</tr></thead><tbody>{mappedRows.slice(0, 5).map((row, index) => <tr key={index}>{fields[entityType].filter((field) => mapping[field.key] != null).map((field) => <td key={field.key} className="max-w-56 truncate border-b border-[rgb(var(--border))] px-3 py-2">{row[field.key] || "—"}</td>)}</tr>)}</tbody></table></div>
      <button type="button" onClick={confirmImport} disabled={pending || Boolean(missingRequired.length)} className="focus-ring h-11 w-fit rounded-lg bg-[rgb(var(--primary))] px-5 text-sm font-semibold text-[rgb(var(--primary-foreground))] disabled:opacity-50">{pending ? "Se importă…" : `Confirmă importul (${rows.length} rânduri)`}</button>
    </section> : null}
    {result ? <section className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5" aria-live="polite"><h2 className="text-lg font-semibold">Rezultatul importului</h2>{result.duplicate ? <p className="mt-2 text-sm text-[rgb(var(--muted-foreground))]">Acest fișier a fost deja procesat. Rezultatul existent a fost returnat fără duplicate.</p> : null}<dl className="mt-4 grid gap-3 sm:grid-cols-3"><ResultCount label="Procesate" value={result.created} /><ResultCount label="Omise" value={result.skipped} /><ResultCount label="Respinse" value={result.rejected} /></dl>{result.error ? <p className="mt-4 text-sm text-red-300">{result.error}</p> : null}{result.errors.length ? <div className="mt-4"><h3 className="text-sm font-semibold">Rânduri care necesită corectare</h3><ul className="mt-2 grid gap-2 text-sm" aria-label="Erori de import">{result.errors.slice(0, 5).map((error) => <li key={`${error.row}-${error.message}`} className="rounded-lg border border-red-400/30 bg-red-400/10 p-3"><span className="font-semibold">Rândul {error.row}:</span> {error.message}</li>)}</ul>{result.errors.length > 5 ? <p className="mt-2 text-sm text-[rgb(var(--muted-foreground))]">Descarcă sumarul pentru toate cele {result.errors.length} erori.</p> : null}<button type="button" onClick={downloadErrors} className="focus-ring mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-[rgb(var(--border))] px-3 text-sm font-semibold"><ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />Descarcă sumarul erorilor</button></div> : null}</section> : null}
  </div>;
}

function normalizeHeader(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }
function ResultCount({ label, value }: { label: string; value: number }) { return <div className="rounded-lg bg-[rgb(var(--surface-elevated))] p-4"><dt className="text-sm text-[rgb(var(--muted-foreground))]">{label}</dt><dd className="mt-1 text-2xl font-semibold">{value}</dd></div>; }
