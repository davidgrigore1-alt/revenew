"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  DocumentArrowUpIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";
import { confirmCommercialSignalImport, previewCommercialSignalImport } from "@/lib/commercial-ingestion-actions";
import {
  COMMERCIAL_IMPORT_LIMITS,
  commercialImportFields,
  suggestedCommercialMapping,
  type CommercialImportFieldKey
} from "@/lib/commercial-ingestion-fields";
import {
  createSingleIntakeRow,
  isAllowedCommercialCsvFile,
  parseBulkCommercialText,
  parseCommercialCsvText,
  type CommercialIntakeSource,
  type SourceIntakeRow
} from "@/lib/commercial-source-intake";
import type { CommercialImportHistoryItem, CommercialImportPreview, CommercialImportPreviewRow, CommercialImportResult } from "@/lib/commercial-ingestion";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusPill } from "@/components/ui/StatusPill";
import { Textarea } from "@/components/ui/Textarea";
import { formatDateTimeWithSeconds } from "@/lib/utils";

type IntakeMode = "single" | "bulk" | "csv";
type CsvRow = string[];

const modeOptions: Array<{ value: IntakeMode; title: string; description: string }> = [
  { value: "single", title: "Semnal unic", description: "Email, mesaj sau notă comercială introdusă controlat." },
  { value: "bulk", title: "Text în bloc", description: "Mai multe note separate prin rând liber sau ---" },
  { value: "csv", title: "CSV", description: "Text CSV sau fișier local, cu mapare verificată." }
];

const sourceOptions: Array<{ value: CommercialIntakeSource; label: string }> = [
  { value: "email", label: "Email copiat" },
  { value: "whatsapp", label: "Text WhatsApp copiat" },
  { value: "phone", label: "Notă după apel" },
  { value: "manual", label: "Notă comercială" },
  { value: "other", label: "Altă sursă documentată" }
];

const emptyMapping = () => Object.fromEntries(commercialImportFields.map((field) => [field.key, null])) as Record<CommercialImportFieldKey, number | null>;
const coreImportFields = commercialImportFields.filter((field) => field.group !== "audit");
const auditImportFields = commercialImportFields.filter((field) => field.group === "audit");

export function CommercialSignalImportWizard({ history }: { history: CommercialImportHistoryItem[] }) {
  const [mode, setMode] = useState<IntakeMode>("single");
  const [sourceType, setSourceType] = useState<CommercialIntakeSource>("email");
  const [single, setSingle] = useState({ title: "", rawText: "", company: "", contact: "", estimatedValue: "", currency: "RON", dueDate: "", sourceReference: "" });
  const [bulkText, setBulkText] = useState("");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Record<CommercialImportFieldKey, number | null>>(emptyMapping);
  const [mappingConfirmed, setMappingConfirmed] = useState(false);
  const [inputError, setInputError] = useState("");
  const [preparedRows, setPreparedRows] = useState<SourceIntakeRow[]>([]);
  const [preview, setPreview] = useState<CommercialImportPreview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<CommercialImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  const mappedRows = useMemo(() => rows.map((row) => Object.fromEntries(commercialImportFields.map((field) => [field.key, mapping[field.key] == null ? "" : row[mapping[field.key] as number] ?? ""]))), [mapping, rows]);
  const missingRequired = commercialImportFields.filter((field) => field.required && mapping[field.key] == null);
  const mappedAuditFields = auditImportFields.filter((field) => mapping[field.key] != null).length;
  const selectedCount = selected.size;

  function clearOutcome() {
    setPreview(null);
    setPreparedRows([]);
    setSelected(new Set());
    setResult(null);
    setInputError("");
  }

  function changeMode(next: IntakeMode) {
    setMode(next);
    clearOutcome();
  }

  function requestPreview(label: string, candidates: SourceIntakeRow[]) {
    if (pending) return;
    setInputError("");
    setResult(null);
    setPreparedRows(candidates);
    startTransition(async () => {
      const next = await previewCommercialSignalImport(label, candidates);
      setPreview(next);
      setSelected(new Set(next.ok
        ? next.accepted.filter((row) => !row.exact_duplicate && !row.probable_signal_match).map((row) => row.row_fingerprint)
        : []));
    });
  }

  function previewSingle() {
    if (!single.rawText.trim()) { setInputError("Adaugă textul sursă înainte de previzualizare."); return; }
    requestPreview(`intake-single-${Date.now()}.csv`, [createSingleIntakeRow({ ...single, sourceType })]);
  }

  function previewBulk() {
    const parsed = parseBulkCommercialText(bulkText, sourceType);
    if (!parsed.ok) { setInputError(parsed.error); return; }
    requestPreview(`intake-bulk-${Date.now()}.csv`, parsed.rows);
  }

  function loadCsv(source: string, name: string, maxLength?: number) {
    clearOutcome();
    const parsed = parseCommercialCsvText(source, maxLength);
    if (!parsed.ok) { setInputError(parsed.error ?? "CSV-ul nu poate fi citit."); return; }
    setFileName(name);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(suggestedCommercialMapping(parsed.headers));
    setMappingConfirmed(false);
  }

  async function loadFile(file?: File) {
    if (!file) return;
    if (!isAllowedCommercialCsvFile(file.name, file.type)) { setInputError("Selectează un fișier cu extensia .csv și un tip de conținut CSV acceptat."); return; }
    if (file.size > COMMERCIAL_IMPORT_LIMITS.maxFileBytes) { setInputError("Fișierul depășește limita de 2 MB."); return; }
    loadCsv(await file.text(), file.name, COMMERCIAL_IMPORT_LIMITS.maxFileBytes);
  }

  function previewCsv() {
    if (!mappingConfirmed || missingRequired.length) return;
    requestPreview(fileName || `intake-csv-${Date.now()}.csv`, mappedRows);
  }

  function confirmImport() {
    if (!preview?.ok || !selectedCount || pending) return;
    startTransition(async () => setResult(await confirmCommercialSignalImport(preview.fileName, preparedRows, Array.from(selected))));
  }

  function toggleFingerprint(fingerprint: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(fingerprint)) next.delete(fingerprint); else next.add(fingerprint);
      return next;
    });
  }

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button href="/inbox" variant="ghost" size="small"><ArrowLeftIcon className="h-4 w-4" />Înapoi la Inbox</Button>
      <p className="text-xs font-medium text-[rgb(var(--text-muted))]">Cel mult 1.000 semnale · 6.000 caractere per semnal · procesare locală a fișierului</p>
    </div>

    <AlertBanner tone="info" title="Control înainte de orice acțiune">
      Semnalele importate ajung în Inbox pentru revizuire. Nimic nu este convertit automat, pregătirea AI nu pornește automat și nu se trimite niciun mesaj extern.
    </AlertBanner>

    <div className="grid gap-3 sm:grid-cols-3" role="tablist" aria-label="Mod import">
      {modeOptions.map((option) => <button key={option.value} type="button" role="tab" aria-selected={mode === option.value} onClick={() => changeMode(option.value)} className={`focus-ring rounded-card border p-4 text-left transition-colors ${mode === option.value ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary-muted))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface))] hover:border-[rgb(var(--border-strong))]"}`}>
        <span className="block text-sm font-semibold text-[rgb(var(--foreground))]">{option.title}</span>
        <span className="mt-1 block text-xs leading-5 text-[rgb(var(--text-muted))]">{option.description}</span>
      </button>)}
    </div>

    <Card as="section" padding="spacious">
      <CardHeader>
        <CardTitle>{mode === "single" ? "Capturează un semnal" : mode === "bulk" ? "Separă informația în semnale candidate" : "Pregătește datele CSV"}</CardTitle>
        <CardDescription>Previzualizarea verifică datele spațiului de lucru și duplicatele înainte de orice scriere.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {mode !== "csv" ? <Field label="Sursă documentată"><Select value={sourceType} onChange={(event) => { setSourceType(event.target.value as CommercialIntakeSource); clearOutcome(); }}>{sourceOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field> : null}

        {mode === "single" ? <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Titlu semnal" required><Input value={single.title} maxLength={240} onChange={(event) => { setSingle({ ...single, title: event.target.value }); clearOutcome(); }} placeholder="Ex. Ofertă fără răspuns · Companie" /></Field>
            <Field label="Companie"><Input value={single.company} maxLength={240} onChange={(event) => { setSingle({ ...single, company: event.target.value }); clearOutcome(); }} /></Field>
            <Field label="Contact"><Input value={single.contact} maxLength={240} onChange={(event) => { setSingle({ ...single, contact: event.target.value }); clearOutcome(); }} /></Field>
            <Field label="Referință sursă"><Input value={single.sourceReference} maxLength={500} onChange={(event) => { setSingle({ ...single, sourceReference: event.target.value }); clearOutcome(); }} placeholder="ID intern, subiect sau referință verificabilă" /></Field>
            <Field label="Valoare estimată"><Input inputMode="decimal" value={single.estimatedValue} onChange={(event) => { setSingle({ ...single, estimatedValue: event.target.value }); clearOutcome(); }} /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Monedă"><Select value={single.currency} onChange={(event) => { setSingle({ ...single, currency: event.target.value }); clearOutcome(); }}>{["RON", "EUR", "USD", "GBP", "CHF"].map((value) => <option key={value}>{value}</option>)}</Select></Field><Field label="Termen comercial"><Input type="date" value={single.dueDate} onChange={(event) => { setSingle({ ...single, dueDate: event.target.value }); clearOutcome(); }} /></Field></div>
          </div>
          <Field label="Text sursă" required hint={`${single.rawText.length}/6.000`}><Textarea rows={8} maxLength={6000} value={single.rawText} onChange={(event) => { setSingle({ ...single, rawText: event.target.value }); clearOutcome(); }} placeholder="Lipește emailul, mesajul sau nota după apel. Conținutul este tratat ca text simplu." /></Field>
          <Button onClick={previewSingle} loading={pending} disabled={!single.title.trim() || !single.rawText.trim()} className="w-fit">Previzualizează semnalul</Button>
        </> : null}

        {mode === "bulk" ? <>
          <Field label="Text în bloc" required hint={`${bulkText.length}/60.000`}><Textarea rows={14} maxLength={60000} value={bulkText} onChange={(event) => { setBulkText(event.target.value); clearOutcome(); }} placeholder={"Titlu: Follow-up ofertă\nCompanie: Exemplu SRL\nContact: Ana Pop\nValoare: 12500\nMonedă: RON\nTermen: 31.07.2026\nContext: Oferta a rămas fără răspuns.\n\n---\n\nTitlul următorului semnal\nNota comercială aferentă."} /></Field>
          <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">Separă semnalele printr-un rând liber sau <strong>---</strong>. Etichetele Titlu, Companie, Contact, Valoare, Monedă, Termen, Sursă și Referință sunt recunoscute fără interpretare AI.</p>
          <Button onClick={previewBulk} loading={pending} disabled={!bulkText.trim()} className="w-fit">Construiește previzualizarea</Button>
        </> : null}

        {mode === "csv" ? <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-4 py-3">
            <p className="text-xs leading-5 text-[rgb(var(--text-muted))]">Pentru un audit de 20–50 de oportunități, pornește de la structura recomandată și elimină rândurile fictive.</p>
            <Button href="/samples/revenew-client-audit-template.csv" variant="ghost" size="small" download>Descarcă șablonul de audit</Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
            <div className="grid content-start gap-2"><label htmlFor="source-intake-csv" className="text-sm font-semibold">Lipește CSV</label><Textarea id="source-intake-csv" rows={8} value={csvText} maxLength={60000} onChange={(event) => { setCsvText(event.target.value); clearOutcome(); }} placeholder="titlu,sursă,context,companie,contact,valoare,monedă,termen" /><Button variant="secondary" size="small" onClick={() => loadCsv(csvText, `intake-csv-${Date.now()}.csv`)} disabled={!csvText.trim()} className="mt-1 w-fit">Citește textul CSV</Button></div>
            <div className="hidden items-center text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-faint))] lg:flex">sau</div>
            <label className="focus-within:focus-ring grid min-h-44 cursor-pointer place-items-center rounded-card border border-dashed border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-subtle))] p-6 text-center">
              <span><DocumentArrowUpIcon className="mx-auto h-8 w-8 text-[rgb(var(--primary))]" /><span className="mt-2 block text-sm font-semibold">Alege un fișier CSV</span><span className="mt-1 block text-xs text-[rgb(var(--text-muted))]">Cel mult 2 MB · fără încărcare în stocare publică</span></span>
              <input type="file" accept=".csv,text/csv,application/vnd.ms-excel,text/plain" className="sr-only" onChange={(event) => void loadFile(event.target.files?.[0])} />
            </label>
          </div>
          {rows.length ? <div className="grid gap-5 border-t border-[rgb(var(--border))] pt-5">
            <div><p className="text-sm font-semibold">Mapare coloane · {fileName}</p><p className="mt-1 text-xs text-[rgb(var(--text-muted))]">{rows.length} rânduri detectate. Verifică maparea; câmpurile operaționale sunt păstrate ca dovadă de verificat, nu ca rezultat confirmat.</p></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{coreImportFields.map((field) => <MappingField key={field.key} field={field} mapping={mapping} headers={headers} onChange={(value) => { setMapping((current) => ({ ...current, [field.key]: value })); setMappingConfirmed(false); clearOutcome(); }} />)}</div>
            <details className="group rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
              <summary className="focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-control px-4 py-3 marker:hidden"><span><span className="block text-sm font-semibold">Context operațional pentru audit</span><span className="mt-0.5 block text-xs font-normal text-[rgb(var(--text-muted))]">{mappedAuditFields} din {auditImportFields.length} câmpuri recunoscute · responsabil, acțiuni, aprobare, propunere și rezultat declarat</span></span><span aria-hidden="true" className="text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span></summary>
              <div className="grid gap-4 border-t border-[rgb(var(--border))] p-4 md:grid-cols-2 xl:grid-cols-3">{auditImportFields.map((field) => <MappingField key={field.key} field={field} mapping={mapping} headers={headers} onChange={(value) => { setMapping((current) => ({ ...current, [field.key]: value })); setMappingConfirmed(false); clearOutcome(); }} />)}</div>
            </details>
            {missingRequired.length ? <AlertBanner tone="warning">Mapează câmpul obligatoriu: {missingRequired.map((field) => field.label).join(", ")}.</AlertBanner> : null}
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={mappingConfirmed} onChange={(event) => { setMappingConfirmed(event.target.checked); clearOutcome(); }} className="mt-1 h-4 w-4 accent-[rgb(var(--primary))]" /><span><span className="font-semibold">Am verificat maparea</span><span className="block text-xs leading-5 text-[rgb(var(--text-muted))]">Semnalele sunt doar previzualizate până la confirmarea finală.</span></span></label>
            <Button onClick={previewCsv} loading={pending} disabled={!mappingConfirmed || Boolean(missingRequired.length)} className="w-fit">Validează previzualizarea</Button>
          </div> : null}
        </> : null}
        {inputError ? <AlertBanner tone="danger">{inputError}</AlertBanner> : null}
      </CardContent>
    </Card>

    {preview ? <PreviewSection preview={preview} selected={selected} onToggle={toggleFingerprint} onSelectSafe={() => setSelected(new Set(preview.accepted.filter((row) => !row.exact_duplicate && !row.probable_signal_match).map((row) => row.row_fingerprint)))} onConfirm={confirmImport} pending={pending} /> : null}
    {result ? <ResultSection result={result} /> : null}
    <HistorySection history={history} />
  </div>;
}

function PreviewSection({ preview, selected, onToggle, onSelectSafe, onConfirm, pending }: { preview: CommercialImportPreview; selected: Set<string>; onToggle: (fingerprint: string) => void; onSelectSafe: () => void; onConfirm: () => void; pending: boolean }) {
  if (!preview.ok) return <AlertBanner tone="danger">{preview.error}</AlertBanner>;
  const exactDuplicates = preview.accepted.filter((row) => row.exact_duplicate).length;
  const probableDuplicates = preview.accepted.filter((row) => !row.exact_duplicate && row.probable_signal_match).length;
  const invalid = preview.rejected.filter((row) => row.status === "rejected").length;
  return <Card as="section" padding="none" className="overflow-hidden">
    <div className="border-b border-[rgb(var(--border))] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">Previzualizare import</p><h2 className="mt-1 text-section-title font-semibold">Alege semnalele care intră în Inbox</h2><p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">Potrivirile probabile rămân necomasate și sunt deselectate implicit. Verificarea finală se repetă pe server.</p></div><Button variant="secondary" size="small" onClick={onSelectSafe}>Resetează selecția sigură</Button></div>
      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><Count label="Candidate valide" value={preview.accepted.length - exactDuplicates} /><Count label="Posibile duplicate" value={probableDuplicates + exactDuplicates} /><Count label="Rânduri invalide" value={invalid} /><Count label="Selectate" value={selected.size} emphasize /></dl>
    </div>
    <div className="hidden overflow-x-auto md:block"><table className="min-w-[980px] w-full text-left text-sm"><thead className="bg-[rgb(var(--surface-subtle))] text-xs uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]"><tr>{["Selectat", "Semnal", "Sursă", "Companie / contact", "Valoare", "Termen", "Stare"].map((label) => <th key={label} className="border-b border-[rgb(var(--border))] px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{preview.accepted.map((row) => <PreviewRow key={row.row_fingerprint} row={row} selected={selected.has(row.row_fingerprint)} onToggle={onToggle} />)}</tbody></table></div>
    <div className="grid gap-3 p-4 md:hidden">{preview.accepted.map((row) => <PreviewCard key={row.row_fingerprint} row={row} selected={selected.has(row.row_fingerprint)} onToggle={onToggle} />)}</div>
    {preview.rejected.length ? <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--danger-background))] p-5"><h3 className="text-sm font-semibold text-[rgb(var(--danger-text))]">Rânduri neacceptate</h3><ul className="mt-3 grid gap-2">{preview.rejected.slice(0, COMMERCIAL_IMPORT_LIMITS.displayedErrors).map((issue) => <li key={`${issue.row_number}-${issue.error_code}`} className="flex gap-2 text-sm text-[rgb(var(--danger-text))]"><ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Rândul {issue.row_number}:</strong> {issue.error_message}</span></li>)}</ul></div> : null}
    <div className="flex flex-col gap-4 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2 text-sm"><ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--primary))]" /><p><strong>{selected.size} semnale selectate.</strong><span className="block text-xs leading-5 text-[rgb(var(--text-muted))]">Importul creează doar semnale în starea de revizuire; nu pornește analiza asistată, nu creează oportunități și nu trimite mesaje automat.</span></p></div><Button onClick={onConfirm} loading={pending} disabled={!selected.size} className="shrink-0"><ClipboardDocumentListIcon className="h-4 w-4" />Importă selectate</Button></div>
  </Card>;
}

function PreviewRow({ row, selected, onToggle }: { row: CommercialImportPreviewRow; selected: boolean; onToggle: (fingerprint: string) => void }) {
  const disabled = row.exact_duplicate;
  return <tr className="transition-colors hover:bg-[rgb(var(--surface-subtle))]"><td className="border-b border-[rgb(var(--border))] px-4 py-3"><input type="checkbox" checked={selected} disabled={disabled} onChange={() => onToggle(row.row_fingerprint)} aria-label={`Selectează ${row.title}`} className="h-4 w-4 accent-[rgb(var(--primary))]" /></td><td className="max-w-64 border-b border-[rgb(var(--border))] px-4 py-3"><p className="truncate font-semibold">{row.title}</p><p className="mt-1 truncate text-xs text-[rgb(var(--text-muted))]">{row.context || "Fără context suplimentar"}</p></td><td className="border-b border-[rgb(var(--border))] px-4 py-3">{sourceLabel(row.source_type)}</td><td className="max-w-52 border-b border-[rgb(var(--border))] px-4 py-3"><p className="truncate">{row.company || "—"}</p><p className="truncate text-xs text-[rgb(var(--text-muted))]">{row.contact || row.email || "Contact neprecizat"}</p></td><td className="border-b border-[rgb(var(--border))] px-4 py-3 tabular-nums">{row.estimated_value ? `${row.estimated_value} ${row.currency}` : "—"}</td><td className="border-b border-[rgb(var(--border))] px-4 py-3 tabular-nums">{row.requested_date ? row.requested_date.slice(0, 10) : "—"}</td><td className="border-b border-[rgb(var(--border))] px-4 py-3"><RowStatuses row={row} />{row.missing_operational_fields.length ? <p className="mt-2 max-w-56 text-xs leading-5 text-[rgb(var(--text-muted))]">Lipsesc: {row.missing_operational_fields.join(", ")}.</p> : <p className="mt-2 text-xs text-[rgb(var(--text-muted))]">Câmpurile operaționale principale sunt disponibile.</p>}</td></tr>;
}

function PreviewCard({ row, selected, onToggle }: { row: CommercialImportPreviewRow; selected: boolean; onToggle: (fingerprint: string) => void }) {
  return <label className={`rounded-card border p-4 ${selected ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary-muted))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface))]"}`}><span className="flex items-start gap-3"><input type="checkbox" checked={selected} disabled={row.exact_duplicate} onChange={() => onToggle(row.row_fingerprint)} className="mt-1 h-4 w-4 accent-[rgb(var(--primary))]" /><span className="min-w-0 flex-1"><span className="block font-semibold">{row.title}</span><span className="mt-1 block text-xs text-[rgb(var(--text-muted))]">{sourceLabel(row.source_type)} · {row.company || "Companie neprecizată"}</span></span></span><span className="mt-3 flex flex-wrap gap-2"><RowStatuses row={row} /></span><span className="mt-3 grid grid-cols-2 gap-3 text-xs"><span><span className="block text-[rgb(var(--text-muted))]">Valoare</span>{row.estimated_value ? `${row.estimated_value} ${row.currency}` : "—"}</span><span><span className="block text-[rgb(var(--text-muted))]">Termen</span>{row.requested_date ? row.requested_date.slice(0, 10) : "—"}</span></span>{row.missing_operational_fields.length ? <span className="mt-3 block text-xs leading-5 text-[rgb(var(--text-muted))]">De completat: {row.missing_operational_fields.join(", ")}.</span> : null}</label>;
}

function RowStatuses({ row }: { row: CommercialImportPreviewRow }) {
  const duplicate = row.exact_duplicate || row.probable_signal_match;
  const completeness = row.audit_completeness;
  return <>{duplicate ? <StatusPill tone="warning">Posibil duplicat</StatusPill> : <StatusPill tone="success">Nou</StatusPill>}{completeness === "strong" ? <StatusPill tone="brand">Context operațional solid</StatusPill> : completeness === "partial" ? <StatusPill tone="warning">Necesită completare</StatusPill> : <StatusPill tone="neutral">Context minim</StatusPill>}</>;
}

function ResultSection({ result }: { result: CommercialImportResult }) {
  return <AlertBanner tone={result.ok ? "success" : "danger"} title={result.ok ? "Import confirmat" : "Import nefinalizat"} action={result.batchId ? <Button href={`/inbox?batch=${encodeURIComponent(result.batchId)}`} variant="secondary" size="small">Deschide lotul în Inbox</Button> : undefined}>
    {result.error ? result.error : <><p>Au fost create {result.created} semnale în așteptarea revizuirii umane.</p><p className="mt-1 text-xs">{result.duplicates} duplicate omise · {result.rejected} rânduri invalide · {result.notSelected} candidate neselectate. Pregătirea AI și conversia rămân acțiuni manuale.</p></>}
  </AlertBanner>;
}

function HistorySection({ history }: { history: CommercialImportHistoryItem[] }) {
  return <details className="group overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))]"><summary className="focus-ring flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold marker:hidden sm:px-6"><span>Istoric importuri și detectări <span className="font-normal text-[rgb(var(--text-muted))]">({history.length})</span></span><span aria-hidden="true" className="text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span></summary><div className="border-t border-[rgb(var(--border))]"><p className="px-5 py-4 text-sm text-[rgb(var(--text-muted))] sm:px-6">Sunt păstrate metadatele și rezultatele sigure, nu fișierul original.</p>{history.length ? <div className="overflow-x-auto"><table className="min-w-[720px] w-full text-left text-sm"><thead className="bg-[rgb(var(--surface-subtle))]"><tr>{["Sursă", "Dată", "Total", "Create", "Respinse", "Duplicate", "Stare"].map((label) => <th key={label} className="border-y border-[rgb(var(--border))] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">{label}</th>)}</tr></thead><tbody>{history.map((item) => <tr key={item.id}><td className="border-b border-[rgb(var(--border))] px-4 py-3 font-medium">{historyLabel(item)}</td><td className="border-b border-[rgb(var(--border))] px-4 py-3">{formatDateTimeWithSeconds(item.createdAt)}</td><td className="border-b border-[rgb(var(--border))] px-4 py-3">{item.totalRows}</td><td className="border-b border-[rgb(var(--border))] px-4 py-3">{item.createdRows}</td><td className="border-b border-[rgb(var(--border))] px-4 py-3">{item.rejectedRows}</td><td className="border-b border-[rgb(var(--border))] px-4 py-3">{item.duplicateRows}</td><td className="border-b border-[rgb(var(--border))] px-4 py-3"><StatusPill tone={item.status === "completed" ? "success" : "warning"}>{item.status === "completed" ? "Finalizat" : "În curs"}</StatusPill></td></tr>)}</tbody></table></div> : <p className="px-6 pb-6 text-sm text-[rgb(var(--text-muted))]">Nu există încă importuri sau detectări înregistrate.</p>}</div></details>;
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold"><span className="flex flex-wrap items-center justify-between gap-2"><span>{label}</span><span className="text-[0.6875rem] uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">{required ? "Obligatoriu" : "Opțional"}</span></span>{hint ? <span className="text-xs font-normal text-[rgb(var(--text-muted))]">{hint}</span> : null}{children}</label>;
}

function MappingField({ field, mapping, headers, onChange }: { field: (typeof commercialImportFields)[number]; mapping: Record<CommercialImportFieldKey, number | null>; headers: string[]; onChange: (value: number | null) => void }) {
  return <Field label={field.label} required={field.required}><Select value={mapping[field.key] ?? ""} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}><option value="">Nu importa</option>{headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header || `Coloana ${index + 1}`}</option>)}</Select></Field>;
}

function Count({ label, value, emphasize = false }: { label: string; value: number; emphasize?: boolean }) {
  return <div className={`rounded-control border p-3 ${emphasize ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary-muted))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface))]"}`}><dt className="text-xs text-[rgb(var(--text-muted))]">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd></div>;
}

function sourceLabel(source: CommercialImportPreviewRow["source_type"]) {
  return ({ manual: "Notă comercială", email: "Email copiat", phone: "Notă după apel", whatsapp: "WhatsApp copiat", csv_import: "Import CSV", other: "Altă sursă" })[source];
}

function historyLabel(item: CommercialImportHistoryItem) {
  if (item.sourceType === "stale_detection") return "Detectare oportunități";
  if (item.fileName?.startsWith("intake-single-")) return "Semnal unic";
  if (item.fileName?.startsWith("intake-bulk-")) return "Text în bloc";
  if (item.fileName?.startsWith("intake-csv-")) return "Text CSV";
  return item.fileName || "Import CSV";
}
