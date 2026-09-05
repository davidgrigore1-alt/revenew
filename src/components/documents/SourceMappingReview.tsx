"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { commercialImportFields, type CommercialImportFieldKey } from "@/lib/commercial-ingestion-fields";
import { sourceReviewGroups, type SourceMapping } from "@/lib/documents/source-review";
import type { DocumentCsv } from "@/lib/documents/csv";
import styles from "./Documents.module.css";

export function SourceMappingReview({ csv, mapping, ignored, onChange, busy }: {
  csv: DocumentCsv; mapping: SourceMapping; ignored: number[]; busy: boolean;
  onChange: (mapping: SourceMapping, ignored: number[]) => void;
}) {
  const groups = sourceReviewGroups(csv.headers, mapping, ignored);
  const [editing, setEditing] = useState<number | null>(null);
  const active = editing ?? groups.review[0];
  function choose(index: number, value: string) {
    const next = { ...mapping };
    for (const field of commercialImportFields) if (next[field.key] === index) next[field.key] = null;
    if (value && value !== "ignore") next[value as CommercialImportFieldKey] = index;
    onChange(next, value === "ignore" ? [...ignored.filter(item => item !== index), index] : ignored.filter(item => item !== index));
    setEditing(null);
  }
  const row = (index: number) => {
    const assigned = commercialImportFields.find(field => mapping[field.key] === index);
    const samples = Array.from(new Set(csv.rows.map(values => values[index]).filter(Boolean))).slice(0, 3);
    return <div className={styles.proposalRow} key={index}>
      <div><h3>{csv.headers[index]}</h3><p className={styles.sample}>{samples.map(value => value.length > 90 ? value.slice(0, 90) + "…" : value).join(" · ") || "Fără valori completate"}</p></div>
      {active === index ? <label className={styles.field}><span className={styles.meta}>Folosește pentru</span><select autoFocus={editing === index} aria-label={`Destinație pentru ${csv.headers[index]}`} value={assigned?.key ?? (ignored.includes(index) ? "ignore" : "")} onChange={event => choose(index, event.target.value)}>
        <option value="" disabled>Alege destinația</option><option value="ignore">Omite din import</option>
        <optgroup label="Contextul semnalului">{commercialImportFields.filter(field => field.group !== "audit").map(field => <option key={field.key} value={field.key} disabled={mapping[field.key] != null && mapping[field.key] !== index}>{field.label}{field.required ? " · obligatoriu" : ""}</option>)}</optgroup>
        <optgroup label="Declarații din sursă · nu confirmă acțiuni">{commercialImportFields.filter(field => field.group === "audit").map(field => <option key={field.key} value={field.key} disabled={mapping[field.key] != null && mapping[field.key] !== index}>{field.label}</option>)}</optgroup>
      </select></label> : <Button variant="ghost" onClick={() => setEditing(index)}>{assigned ? `${assigned.label} · modifică` : ignored.includes(index) ? "Revizuiește" : "Alege destinația"}</Button>}
    </div>;
  };
  return <fieldset disabled={busy} className={styles.proposal}>
    <div><p className={styles.eyebrow}>Destinație · Inbox Comercial</p><h2>Revizuiește propunerea ReveNew</h2><p className={styles.meta}>Potrivirile folosesc denumiri cunoscute ale coloanelor. Valorile rămân declarații de sursă până la verificare.</p></div>
    <section aria-label="Câmpuri care necesită revizuire"><div className={styles.toolbar}><h2>{groups.review.length ? `${groups.review.length} ${groups.review.length === 1 ? "câmp de clarificat" : "câmpuri de clarificat"}` : "Toate coloanele au o decizie"}</h2><span className={styles.meta}>{groups.understood.length} asociate · {groups.ignored.length} omise</span></div>{mapping.title == null ? <p className={styles.error}>Alege coloana care descrie titlul fiecărui semnal.</p> : null}{groups.review.map(row)}</section>
    <details><summary className="focus-ring">Câmpuri înțelese / asociate ({groups.understood.length})</summary>{groups.understood.map(row)}</details>
    {groups.ignored.length ? <details><summary className="focus-ring">Omise din import ({groups.ignored.length})</summary><p className={styles.meta}>Rămân vizibile în tabelul original.</p>{groups.ignored.map(row)}</details> : null}
  </fieldset>;
}
