"use client";

import Papa from "papaparse";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeftIcon, CheckCircleIcon, DocumentArrowUpIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { confirmCommercialSignalImport, previewCommercialSignalImport } from "@/lib/commercial-ingestion-actions";
import {
  COMMERCIAL_IMPORT_LIMITS,
  commercialImportFields,
  safeSpreadsheetText,
  suggestedCommercialMapping,
  type CommercialImportFieldKey
} from "@/lib/commercial-ingestion-fields";
import type { CommercialImportPreview, CommercialImportResult, CommercialImportHistoryItem } from "@/lib/commercial-ingestion";
import { formatDateTimeWithSeconds } from "@/lib/utils";

type CsvRow = string[];

export function CommercialSignalImportWizard({ history }: { history: CommercialImportHistoryItem[] }) {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Record<CommercialImportFieldKey, number | null>>(() => Object.fromEntries(commercialImportFields.map((field) => [field.key, null])) as Record<CommercialImportFieldKey, number | null>);
  const [mappingConfirmed, setMappingConfirmed] = useState(false);
  const [fileError, setFileError] = useState("");
  const [preview, setPreview] = useState<CommercialImportPreview | null>(null);
  const [result, setResult] = useState<CommercialImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const mappedRows = useMemo(() => rows.map((row) => Object.fromEntries(commercialImportFields.map((field) => [field.key, mapping[field.key] == null ? "" : row[mapping[field.key] as number] ?? ""]))), [mapping, rows]);
  const missingRequired = commercialImportFields.filter((field) => field.required && mapping[field.key] == null);

  function reset() {
    setFileName(""); setHeaders([]); setRows([]); setPreview(null); setResult(null); setMappingConfirmed(false); setFileError("");
  }

  function loadFile(file?: File) {
    reset();
    if (!file) return;
    if (!file.name.toLocaleLowerCase("ro-RO").endsWith(".csv") && file.type !== "text/csv") {
      setFileError("Selectează un fișier CSV."); return;
    }
    if (file.size > COMMERCIAL_IMPORT_LIMITS.maxFileBytes) {
      setFileError("Fișierul depășește limita de 2 MB."); return;
    }
    setFileName(file.name);
    Papa.parse<CsvRow>(file, {
      skipEmptyLines: "greedy", encoding: "UTF-8",
      complete: (parsed) => {
        if (parsed.errors.length) { setFileError("CSV-ul nu poate fi citit. Verifică delimitatorul și codarea UTF-8."); return; }
        const [headerRow = [], ...dataRows] = parsed.data;
        if (!headerRow.length || !dataRows.length) { setFileError("CSV-ul trebuie să conțină antet și cel puțin un rând."); return; }
        if (headerRow.length > COMMERCIAL_IMPORT_LIMITS.maxColumns) { setFileError("CSV-ul poate avea cel mult 30 de coloane."); return; }
        if (dataRows.length > COMMERCIAL_IMPORT_LIMITS.maxRows) { setFileError("Importul este limitat la 1.000 de rânduri."); return; }
        const cleanHeaders = headerRow.map((value) => safeSpreadsheetText(String(value)).slice(0, 80));
        setHeaders(cleanHeaders);
        setRows(dataRows.map((row) => row.slice(0, COMMERCIAL_IMPORT_LIMITS.maxColumns).map((value) => String(value).slice(0, 6000))));
        setMapping(suggestedCommercialMapping(cleanHeaders));
      }
    });
  }

  function validatePreview() {
    if (!mappingConfirmed || missingRequired.length || pending) return;
    startTransition(async () => { setResult(null); setPreview(await previewCommercialSignalImport(fileName, mappedRows)); });
  }

  function confirmImport() {
    if (!preview?.ok || pending) return;
    startTransition(async () => setResult(await confirmCommercialSignalImport(fileName, mappedRows)));
  }

  return <div className="grid gap-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <a href="/inbox" className="focus-ring inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--primary))]"><ArrowLeftIcon className="h-4 w-4" />Înapoi la Inbox Comercial</a>
      <p className="text-sm text-[rgb(var(--muted-foreground))]">2 MB · 1.000 rânduri · 30 coloane · 20 erori afișate</p>
    </div>

    <ol className="grid gap-2 text-sm sm:grid-cols-4" aria-label="Progres import">
      {["1. Fișier", "2. Mapare", "3. Previzualizare", "4. Rezultat"].map((label, index) => {
        const active = result ? 3 : preview ? 2 : rows.length ? 1 : 0;
        return <li key={label} className={`border-b-2 px-2 py-3 font-semibold ${index === active ? "border-[rgb(var(--primary))] text-[rgb(var(--primary))]" : "border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))]"}`}>{label}</li>;
      })}
    </ol>

    <section className="grid gap-4 border-b border-[rgb(var(--border))] pb-8">
      <div><h2 className="text-lg font-semibold">Selectează datele comerciale</h2><p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Fișierul este procesat în memorie și nu este încărcat în stocare publică.</p></div>
      <label className="focus-within:focus-ring grid min-h-36 cursor-pointer place-items-center border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 text-center">
        <span><DocumentArrowUpIcon className="mx-auto h-8 w-8 text-[rgb(var(--primary))]" /><span className="mt-2 block font-semibold">Alege un fișier CSV</span><span className="mt-1 block text-sm text-[rgb(var(--muted-foreground))]">Delimiterul este detectat automat unde este posibil.</span></span>
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => loadFile(event.target.files?.[0])} />
      </label>
      {fileName ? <p className="text-sm"><span className="font-semibold">Fișier:</span> {fileName} · {rows.length} rânduri</p> : null}
      {fileError ? <p role="alert" className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-700 dark:text-red-200">{fileError}</p> : null}
    </section>

    {rows.length ? <section className="grid gap-5 border-b border-[rgb(var(--border))] pb-8">
      <div><h2 className="text-lg font-semibold">Confirmă maparea coloanelor</h2><p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Sugestiile sunt orientative. Câmpurile ambigue rămân nemapate.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{commercialImportFields.map((field) => <label key={field.key} className="text-sm font-semibold">{field.label}{field.required ? " *" : ""}<select value={mapping[field.key] ?? ""} onChange={(event) => { setMapping((current) => ({ ...current, [field.key]: event.target.value === "" ? null : Number(event.target.value) })); setMappingConfirmed(false); setPreview(null); setResult(null); }} className="mt-2 h-11 w-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 font-normal"><option value="">Nu importa</option>{headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header || `Coloana ${index + 1}`}</option>)}</select></label>)}</div>
      {missingRequired.length ? <p role="alert" className="text-sm text-red-700 dark:text-red-200">Mapează câmpul obligatoriu: {missingRequired.map((field) => field.label).join(", ")}.</p> : null}
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={mappingConfirmed} onChange={(event) => setMappingConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-[rgb(var(--primary))]" /><span><span className="font-semibold">Am verificat maparea</span><span className="block text-[rgb(var(--muted-foreground))]">Semnalele vor fi create doar după previzualizare și confirmarea finală.</span></span></label>
      <button type="button" onClick={validatePreview} disabled={!mappingConfirmed || Boolean(missingRequired.length) || pending} className="focus-ring h-11 w-fit bg-[rgb(var(--primary))] px-5 text-sm font-semibold text-[rgb(var(--primary-foreground))] disabled:opacity-50">{pending ? "Se verifică…" : "Validează previzualizarea"}</button>
    </section> : null}

    {preview ? <PreviewSection preview={preview} onConfirm={confirmImport} pending={pending} /> : null}
    {result ? <ResultSection result={result} /> : null}
    <HistorySection history={history} />
  </div>;
}

function PreviewSection({ preview, onConfirm, pending }: { preview: CommercialImportPreview; onConfirm: () => void; pending: boolean }) {
  if (!preview.ok) return <p role="alert" className="border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-700 dark:text-red-200">{preview.error}</p>;
  const duplicates = preview.accepted.filter((row) => row.exact_duplicate).length + preview.rejected.filter((row) => row.status === "duplicate_file").length;
  return <section className="grid gap-5 border-b border-[rgb(var(--border))] pb-8">
    <div><h2 className="text-lg font-semibold">Previzualizare validată</h2><p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Rândurile valide devin semnale noi, nu oportunități. Potrivirile probabile nu sunt comasate automat.</p></div>
    <dl className="grid gap-3 sm:grid-cols-3"><Count label="Valide" value={preview.accepted.length - preview.accepted.filter((row) => row.exact_duplicate).length} /><Count label="Respinse" value={preview.rejected.filter((row) => row.status === "rejected").length} /><Count label="Duplicate" value={duplicates} /></dl>
    <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><caption className="mb-2 text-left font-semibold">Primele {Math.min(COMMERCIAL_IMPORT_LIMITS.previewRows, preview.accepted.length)} rânduri valide</caption><thead><tr>{["Rând", "Titlu", "Companie", "Contact", "Valoare", "Observații"].map((label) => <th key={label} className="border-b border-[rgb(var(--border))] px-3 py-2">{label}</th>)}</tr></thead><tbody>{preview.accepted.slice(0, COMMERCIAL_IMPORT_LIMITS.previewRows).map((row) => <tr key={row.row_number}><td className="border-b border-[rgb(var(--border))] px-3 py-2">{row.row_number}</td><td className="max-w-56 truncate border-b border-[rgb(var(--border))] px-3 py-2">{row.title}</td><td className="max-w-48 truncate border-b border-[rgb(var(--border))] px-3 py-2">{row.company || "—"}</td><td className="max-w-48 truncate border-b border-[rgb(var(--border))] px-3 py-2">{row.contact || row.email || "—"}</td><td className="border-b border-[rgb(var(--border))] px-3 py-2">{row.estimated_value ? `${row.estimated_value} ${row.currency}` : "—"}</td><td className="border-b border-[rgb(var(--border))] px-3 py-2 text-xs">{row.exact_duplicate ? "Duplicat exact" : [row.probable_company_match && "Companie CRM", row.probable_contact_match && "Contact CRM", row.probable_opportunity_match && "Oportunitate posibilă", row.probable_signal_match && "Semnal posibil"].filter(Boolean).join(" · ") || "Fără potriviri"}</td></tr>)}</tbody></table></div>
    {preview.rejected.length ? <div><h3 className="font-semibold">Rânduri neacceptate</h3><ul className="mt-2 grid gap-2 text-sm">{preview.rejected.slice(0, COMMERCIAL_IMPORT_LIMITS.displayedErrors).map((issue) => <li key={`${issue.row_number}-${issue.error_code}`} className="flex gap-2 border border-red-400/30 bg-red-400/10 p-3"><ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Rândul {issue.row_number}:</strong> {issue.error_message}</span></li>)}</ul></div> : null}
    <button type="button" onClick={onConfirm} disabled={pending} className="focus-ring h-11 w-fit bg-[rgb(var(--primary))] px-5 text-sm font-semibold text-[rgb(var(--primary-foreground))] disabled:opacity-50">{pending ? "Se importă…" : "Confirmă importul"}</button>
  </section>;
}

function ResultSection({ result }: { result: CommercialImportResult }) {
  return <section className="grid gap-4 border-b border-[rgb(var(--border))] pb-8" aria-live="polite"><div className="flex items-center gap-2"><CheckCircleIcon className="h-5 w-5 text-emerald-500" /><h2 className="text-lg font-semibold">Rezultatul importului</h2></div>{result.error ? <p className="text-sm text-red-700 dark:text-red-200">{result.error}</p> : null}{result.duplicateBatch ? <p className="text-sm text-[rgb(var(--muted-foreground))]">Același fișier a fost procesat anterior. Nu au fost create duplicate.</p> : null}<dl className="grid gap-3 sm:grid-cols-4"><Count label="Semnale create" value={result.created} /><Count label="Duplicate" value={result.duplicates} /><Count label="Respinse" value={result.rejected} /><Count label="Eșuate" value={result.failed} /></dl>{result.batchId ? <a href={`/inbox?source=csv_import&batch=${encodeURIComponent(result.batchId)}`} className="focus-ring w-fit text-sm font-semibold text-[rgb(var(--primary))]">Deschide semnalele create în Inbox Comercial</a> : null}</section>;
}

function HistorySection({ history }: { history: CommercialImportHistoryItem[] }) {
  return <section className="grid gap-4"><div><h2 className="text-lg font-semibold">Istoric importuri și detectări</h2><p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Sunt păstrate doar metadatele și rezultatele sigure, nu conținutul original al fișierului.</p></div>{history.length ? <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr>{["Sursă", "Dată", "Total", "Create", "Respinse", "Duplicate", "Status"].map((label) => <th key={label} className="border-b border-[rgb(var(--border))] px-3 py-2">{label}</th>)}</tr></thead><tbody>{history.map((item) => <tr key={item.id}><td className="border-b border-[rgb(var(--border))] px-3 py-3">{item.sourceType === "csv" ? item.fileName || "Import CSV" : "Detectare oportunități"}</td><td className="border-b border-[rgb(var(--border))] px-3 py-3">{formatDateTimeWithSeconds(item.createdAt)}</td><td className="border-b border-[rgb(var(--border))] px-3 py-3">{item.totalRows}</td><td className="border-b border-[rgb(var(--border))] px-3 py-3">{item.createdRows}</td><td className="border-b border-[rgb(var(--border))] px-3 py-3">{item.rejectedRows}</td><td className="border-b border-[rgb(var(--border))] px-3 py-3">{item.duplicateRows}</td><td className="border-b border-[rgb(var(--border))] px-3 py-3">{item.status}</td></tr>)}</tbody></table></div> : <p className="text-sm text-[rgb(var(--muted-foreground))]">Nu există importuri sau detectări înregistrate.</p>}</section>;
}

function Count({ label, value }: { label: string; value: number }) { return <div className="bg-[rgb(var(--surface))] p-4"><dt className="text-sm text-[rgb(var(--muted-foreground))]">{label}</dt><dd className="mt-1 text-2xl font-semibold">{value}</dd></div>; }
