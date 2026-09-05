"use client";
import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpTrayIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { parseDocumentCsv, DOCUMENT_CSV_LIMITS } from "@/lib/documents/csv";
import styles from "./Documents.module.css";

type Selection = { file: File; bytes: ArrayBuffer | null; state: "checking" | "ready" | "invalid" };
export function LocalDocumentUpload({ sourceId }: { sourceId?: string }) {
  const router = useRouter(), id = useId();
  const input = useRef<HTMLInputElement>(null), lock = useRef(false), revision = useRef(0);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  async function choose(files: File[]) {
    if (lock.current || !files.length) return;
    const current = ++revision.current, file = files[0];
    setError(""); setSelection({ file, bytes: null, state: "checking" });
    try {
      if (files.length !== 1) throw new Error("Selectează un singur document pentru fiecare încărcare.");
      const xlsx = /\.xlsx$/i.test(file.name);
      if (xlsx && !["", "application/octet-stream", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(file.type)) throw new Error("Tipul fișierului nu corespunde unui workbook XLSX.");
      if (!xlsx && (!/\.csv$/i.test(file.name) || !["", "text/csv", "application/csv", "application/vnd.ms-excel"].includes(file.type))) throw new Error("Acest format nu este disponibil. Selectează un document CSV UTF-8 sau XLSX.");
      if (!file.size || file.size > DOCUMENT_CSV_LIMITS.bytes) throw new Error("Selectează un document cu conținut, de cel mult 2 MB.");
      let bytes: ArrayBuffer;
      try { bytes = await file.arrayBuffer(); }
      catch { throw new Error("Fișierul nu a putut fi citit de pe dispozitiv. Selectează-l din nou."); }
      if (xlsx) {
        const signature = new Uint8Array(bytes,0,Math.min(4,bytes.byteLength));
        if (signature.length !== 4 || signature[0]!==80 || signature[1]!==75 || signature[2]!==3 || signature[3]!==4) throw new Error("Fișierul nu are structura unui workbook XLSX.");
        const response = await fetch("/api/documents/local?validate=xlsx",{method:"POST",headers:{"Content-Type":file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","X-Document-Filename":encodeURIComponent(file.name)},body:bytes});
        const result = await response.json();
        if (!response.ok || !result.valid) throw new Error(result.error || "Workbook-ul nu poate fi verificat momentan.");
      } else {
      let text: string;
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
      catch { throw new Error("Codificarea nu este UTF-8. Salvează o copie CSV UTF-8 și selecteaz-o din nou."); }
      parseDocumentCsv(text);
      }
      if (current === revision.current) setSelection({ file, bytes, state: "ready" });
    } catch (cause) {
      if (current !== revision.current) return;
      setSelection({ file, bytes: null, state: "invalid" });
      setError(cause instanceof Error ? cause.message : "Documentul nu poate fi citit. Selectează-l din nou.");
    }
  }
  async function save() {
    if (selection?.state !== "ready" || !selection.bytes || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/documents/local", {
        method: "POST", headers: { "Content-Type": selection.file.type || (/\.xlsx$/i.test(selection.file.name)?"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"text/csv"), "X-Document-Filename": encodeURIComponent(selection.file.name), ...(sourceId ? { "X-Document-Source": sourceId } : {}) }, body: selection.bytes
      });
      const result = await response.json();
      if (!response.ok || !result.sourceId || !result.versionId) throw new Error(result.error || "Salvarea nu a fost confirmată. Verifică Documente înainte de a reîncerca.");
      router.push(`/documents/local/${result.sourceId}/versions/${result.versionId}`); router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvarea nu a fost confirmată. Verifică Documente.");
    } finally { lock.current = false; setBusy(false); }
  }
  return <section className={styles.localUpload} aria-labelledby={`${id}-heading`} data-dragging={dragging || undefined}
    onDragOver={event => { event.preventDefault(); if (!busy) { event.dataTransfer.dropEffect = "copy"; setDragging(true); } }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
    onDrop={event => { event.preventDefault(); setDragging(false); void choose(Array.from(event.dataTransfer.files)); }}>
    <header className={styles.sourceIntro}>
      <p className={styles.eyebrow}>Din computer</p>
      <h2 id={`${id}-heading`}>{sourceId ? "Adaugă o versiune nouă" : "Încarcă un document"}</h2>
      <p className={styles.meta}>Fișierul este păstrat în spațiul companiei și poate fi analizat ulterior de ReveNew.</p>
    </header>
    <input ref={input} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden disabled={busy} aria-label="Selectează un fișier"
      onChange={event => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ""; void choose(files); }}/>
    <div className={styles.uploadSelection}>
      {selection ? <div className={styles.selectedDocument} key={selection.file.name}>
        <DocumentTextIcon className={styles.selectedIcon} aria-hidden="true"/>
        <div className={styles.selectedIdentity}>
          <p className={styles.selectedFilename}>{selection.file.name}</p>
          <p className={styles.meta}>{selection.file.name.split(".").at(-1)?.toUpperCase()} · {selection.file.size < 1024 ? `${selection.file.size} B` : `${Math.ceil(selection.file.size / 1024)} KB`}</p>
          <p id={`${id}-status`} role="status" className={styles.selectionStatus}>{busy ? "Salvare și verificare în curs…" : selection.state === "checking" ? "Verificăm fișierul…" : selection.state === "ready" ? "Pregătit pentru salvare" : "Fișierul necesită atenție"}</p>
        </div>
      </div> : <p className={styles.uploadHint}>{dragging ? "Eliberează fișierul pentru verificare." : "Selectează de pe dispozitiv sau glisează fișierul în această zonă."}</p>}
      <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}>{!selection ? <ArrowUpTrayIcon className="h-4 w-4" aria-hidden="true"/> : null}{selection ? "Schimbă fișierul" : "Selectează fișier"}</Button>
    </div>
    {error ? <p id={`${id}-error`} role="alert" className={styles.error}>{error}</p> : null}
    {selection ? <div className={styles.uploadSave}>
      <Button disabled={selection.state !== "ready" || busy} loading={busy} onClick={() => void save()}>Salvează documentul</Button>
      <p className={styles.meta}>{busy ? "Confirmarea apare după verificarea originalului." : "Originalul nu este încă salvat. Importul datelor rămâne opțional."}</p>
    </div> : null}
    <details className={styles.uploadLimits}><summary className="focus-ring">Formate și limite</summary><p className={styles.meta}>CSV UTF-8 și XLSX · maximum 2 MB. CSV: 1.000 de rânduri și 30 de coloane. XLSX: previzualizare limitată la 8 foi, 500 de rânduri și 40 de coloane pe foaie, în limita totală disponibilă. Originalul rămâne integral. Formulele nu sunt calculate; fișierele cu macrocomenzi nu sunt acceptate.</p></details>
  </section>;
}
