"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { StructuredGrid } from "./StructuredGrid";
import { parseDocumentCsv, mapDocumentCsv, DOCUMENT_CSV_LIMITS, type DocumentCsv } from "@/lib/documents/csv";
import { commercialImportFields, type CommercialImportFieldKey } from "@/lib/commercial-ingestion-fields";
import { previewCommercialSignalImport, confirmCommercialSignalImport } from "@/lib/commercial-ingestion-actions";
import type { CommercialImportPreview, CommercialImportResult } from "@/lib/commercial-ingestion";
import type { CommercialMappedRow } from "@/lib/commercial-ingestion-core";
import { SourceMappingReview } from "./SourceMappingReview";
import { describeDataset, proposeSourceMapping, sourceReviewGroups } from "@/lib/documents/source-review";
import styles from "./Documents.module.css";

const normalizedKeys:Record<string,string>={source:"source_label",status:"status_label",owner:"owner_label",last_interaction:"last_interaction_at",due_date:"requested_date",request_date:"request_date_at",next_action:"next_action_label",approval_required:"approval_required_label",approval_status:"approval_status_label",proposal_prepared:"proposal_prepared_label",proposal_sent:"proposal_sent_label",outcome_confirmed:"outcome_confirmed_label"};
export function DocumentCsvImport({ canImport = true, sourceChoices, initialSource }: { canImport?: boolean; sourceChoices?: ReactNode; initialSource?:{csv:DocumentCsv;name:string;bytes:number;href:string} }) {
  const [csv,setCsv]=useState<DocumentCsv|null>(initialSource?.csv??null),[fileName,setFileName]=useState(initialSource?.name??"date-comerciale.csv"),[text,setText]=useState("");
  const [mapping,setMapping]=useState<Partial<Record<CommercialImportFieldKey,number|null>>>({});
  const [preview,setPreview]=useState<CommercialImportPreview|null>(null),[mapped,setMapped]=useState<CommercialMappedRow[]>([]);
  const [selected,setSelected]=useState<string[]>([]),[result,setResult]=useState<CommercialImportResult|null>(null);
  const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [step,setStep]=useState(initialSource?5:0),[reviewPage,setReviewPage]=useState(0);
  const [ignored,setIgnored]=useState<number[]>([]),[byteSize,setByteSize]=useState(initialSource?.bytes??0);
  const lock=useRef(false),heading=useRef<HTMLHeadingElement>(null);
  const reset=()=>{setCsv(null);setPreview(null);setMapped([]);setSelected([]);setResult(null);setConfirmed(false);setError("");setStep(0);setReviewPage(0);setIgnored([]);setMapping({});setByteSize(0);};
  const focusStep=()=>requestAnimationFrame(()=>heading.current?.focus());
  function load(raw:string,name:string) {
    reset();
    try { const parsed=parseDocumentCsv(raw);setCsv(parsed);setFileName(name);setByteSize(new TextEncoder().encode(raw).length);setStep(4);focusStep(); }
    catch(cause){setError(cause instanceof Error?cause.message:"Fișierul nu poate fi citit.");}
  }
  async function readFile(file?:File) {
    if(!file||lock.current)return;
    reset();lock.current=true;setBusy(true);
    try {
      if(!/\.csv$/i.test(file.name))throw new Error("Acest flux acceptă CSV. Excel, Word, PowerPoint și PDF nu au un parser de import disponibil.");
      if(!["","text/csv","text/plain","application/vnd.ms-excel"].includes(file.type))throw new Error("Tipul declarat nu corespunde unui fișier CSV text.");
      if(file.size>DOCUMENT_CSV_LIMITS.bytes)throw new Error("Fișierul depășește limita de 2 MB.");
      let raw:string;
      let bytes:ArrayBuffer;
      try{bytes=await file.arrayBuffer();}catch{throw new Error("Fișierul nu a putut fi deschis. Alege-l din nou din computer.");}
      try{raw=new TextDecoder("utf-8",{fatal:true}).decode(bytes);}catch{throw new Error("Salvează CSV-ul cu codificare UTF-8. Octeții invalizi nu sunt înlocuiți automat.");}
      load(raw,file.name);
      setByteSize(file.size);
    }catch(cause){setError(cause instanceof Error?cause.message:"Fișierul nu poate fi citit.");}
    finally{lock.current=false;setBusy(false);}
  }
  async function review() {
    if(!csv||!canImport||sourceReviewGroups(csv.headers,mapping,ignored).review.length||lock.current)return;
    lock.current=true;setBusy(true);setError("");setPreview(null);setSelected([]);setConfirmed(false);
    let rows:CommercialMappedRow[];
    try {rows=mapDocumentCsv(csv,mapping);}catch(cause){setError(cause instanceof Error?cause.message:"Maparea nu este validă.");lock.current=false;setBusy(false);return;}
    try {
      const response=await previewCommercialSignalImport(fileName,rows);
      if(!response.ok){setError(response.error||"Validarea nu este disponibilă.");return;}
      setMapped(rows);setPreview(response);setReviewPage(0);setStep(2);focusStep();
    }catch{setError("Validarea nu a putut fi finalizată. Verifică sesiunea și reîncearcă.");}
    finally{lock.current=false;setBusy(false);}
  }
  async function commit() {
    if(!canImport||!preview||!confirmed||!selected.length||lock.current)return;
    lock.current=true;setBusy(true);setError("");
    try {
      const response=await confirmCommercialSignalImport(preview.fileName,mapped,selected);
      setResult(response);setStep(3);focusStep();
    }catch{
      setError("Rezultatul confirmării nu a putut fi verificat. Verifică istoricul importurilor înainte de a reîncerca; nu presupune că au fost create zero înregistrări.");
    }finally{lock.current=false;setBusy(false);}
  }
  const mappedFields=commercialImportFields.filter(field=>mapping[field.key]!==null&&mapping[field.key]!==undefined);
  return <div className={styles.workspace}>
    {step===0?sourceChoices:null}
    {[1,2,3,5].includes(step)?<ol className={styles.steps} aria-label="Etapele importului">{["Destinație","Câmpuri de revizuit","Confirmare","Rezultat"].map((label,index)=><li key={label} aria-current={(step===5?0:step)===index?"step":undefined}>{index+1}. {label}</li>)}</ol>:null}
    <div><p className={styles.eyebrow}>{[1,2,3,5].includes(step)?"Import opțional":"Din computer · previzualizare locală"}</p><h2 ref={heading} tabIndex={-1} className="focus-ring">{["Deschide un fișier pentru inspecție","Revizuiește câmpurile","Decide ce intră în Inbox","Rezultatul importului","Inspectează documentul","Ce vrei să creezi din aceste date?"][step]}</h2>{[1,2,3,5].includes(step)?<p className={styles.meta}>Importul creează semnale pentru revizuire în Inbox. Nu creează companii, contacte sau oportunități și nu confirmă venituri.</p>:null}</div>
    {error?<p className={styles.error} role="alert">{error} {step===2||step===3?<Link className="underline" href="/inbox/import">Vezi istoricul</Link>:null}</p>:null}
    {busy?<p role="status" className={styles.meta}>Se verifică datele…</p>:null}
    {step===0?<fieldset disabled={busy} className={styles.form}>
      <label className={styles.upload} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();void readFile(event.dataTransfer.files?.[0]);}}><span className={styles.uploadButton}>Alege un fișier</span><span className={styles.meta}>sau adu aici o foaie exportată în CSV</span><input aria-label="Fișier CSV" type="file" accept=".csv,text/csv" onChange={event=>{void readFile(event.target.files?.[0]);event.target.value="";}} aria-describedby="csv-limits"/></label>
      <details><summary className="focus-ring">Formate și limite</summary><p id="csv-limits" className={styles.meta}>UTF-8 · maximum 2 MB, 1.000 de rânduri, 30 de coloane și 6.000 de caractere pe celulă. Validarea acceptă maximum 512 KB de date mapate.</p></details>
      <details><summary className="focus-ring cursor-pointer text-sm">Sau lipește conținut CSV</summary><div className={styles.form+" mt-4"}><label className={styles.field}>Conținut CSV<textarea value={text} maxLength={DOCUMENT_CSV_LIMITS.bytes} spellCheck={false} onChange={event=>setText(event.target.value)} placeholder={'Titlu,Companie,Email,Valoare,Monedă\n'}/></label><div><Button variant="secondary" disabled={!text.trim()} onClick={()=>load(text,"date-comerciale.csv")}>Previzualizează CSV</Button></div></div></details>
      <p className={styles.notice}>Acest import rapid nu arhivează originalul. Pentru a păstra și analiza documentul ulterior, folosește <Link className="focus-ring underline" href="/documents/add">Adaugă document</Link>. Importul datelor rămâne o alegere separată.</p>
      <details><summary className="focus-ring cursor-pointer text-sm">Excel și alte formate</summary><p className={styles.meta+" mt-2"}>Importul XLSX/XLS necesită un parser aprobat. Exportă explicit foaia dorită ca CSV UTF-8 și verifică formatarea identificatorilor, valorilor și datelor. Formulele, macrocomenzile și legăturile din fișier nu sunt executate.</p></details>
    </fieldset>:null}
    {step===4&&csv?<>
      <div className={styles.toolbar}><div><h2>{fileName}</h2><p className={styles.meta}>CSV · {byteSize.toLocaleString("ro-RO")} octeți · {csv.rows.length} rânduri · {csv.headers.length} coloane</p></div>{initialSource?<Link className="focus-ring underline" href={initialSource.href}>Deschide documentul păstrat</Link>:<Button variant="ghost" onClick={reset}>Alege alt fișier</Button>}</div>
      <p className={styles.notice}>{initialSource?"Original păstrat în Documente. Importul poate fi închis fără să pierzi documentul.":"Previzualizare temporară · originalul nu este salvat. Folosește Adaugă document pentru a-l păstra."}</p>
      <StructuredGrid rows={csv.rows} headers={csv.headers} label="Conținut original CSV" firstRow={2}/>
      <div className={styles.toolbar}><div><h3>Documentul poate fi inspectat fără import</h3><p className={styles.meta}>Nicio înregistrare nu a fost creată. Tabelul păstrează valorile originale; rândul 1 conține antetele.</p></div>{canImport?<Button variant="secondary" onClick={()=>{setStep(5);focusStep();}}>Importă date în ReveNew</Button>:null}</div>
      <details><summary className="focus-ring">Proveniență și disponibilitate</summary><dl className={styles.facts}><div><dt>Original</dt><dd>{fileName} · {initialSource?"versiune păstrată în Documente":"conținut local introdus în această sesiune"}</dd></div><div><dt>Conținut</dt><dd>CSV citit integral în limitele afișate. Valorile sunt date, nu instrucțiuni.</dd></div><div><dt>Salvare și acces ulterior</dt><dd>{initialSource?<Link href={initialSource.href}>Deschide versiunea și proveniența</Link>:"Acest import rapid nu a creat o versiune salvată."}</dd></div></dl></details>
    </>:null}
    {step===5&&csv?<section className={styles.proposal}>
      <div><p className={styles.eyebrow}>Din antetele fișierului</p><h2>{describeDataset(csv.headers).label}</h2><p className={styles.meta}>{describeDataset(csv.headers).detail}</p></div>
      <div><h2>Semnale comerciale</h2><p>Fiecare rând devine o situație de revizuit în Inbox Comercial. Compania și persoana sunt context, fără creare sau actualizare în CRM.</p><div className="mt-4"><Button onClick={()=>{setMapping(proposeSourceMapping(csv.headers));setIgnored([]);setStep(1);focusStep();}}>Aleg să creez semnale pentru revizuire</Button></div></div>
      <p className={styles.notice}>Importul direct în registrele Companii, Contacte și Oportunități nu este disponibil în acest flux. Dacă acesta este scopul fișierului, păstrează previzualizarea și nu continua ca semnale.</p>
      <div><Button variant="ghost" onClick={()=>{setStep(4);focusStep();}}>Înapoi la document</Button></div>
    </section>:null}
    {step===1&&csv?<>
      <div className={styles.toolbar}><p>{fileName} · {csv.rows.length} rânduri</p><Button variant="ghost" disabled={busy} onClick={()=>{setStep(4);focusStep();}}>Înapoi la document</Button></div>
      <SourceMappingReview csv={csv} mapping={mapping} ignored={ignored} busy={busy} onChange={(next,omitted)=>{setMapping(next);setIgnored(omitted);setError("");}}/>
      <details><summary className="focus-ring">Inspectează tabelul original</summary><StructuredGrid rows={csv.rows} headers={csv.headers} label="Conținut original CSV" firstRow={2}/></details>
      <p className={styles.notice}>Validarea normalizează spațiile, datele, emailurile și valorile. Moneda lipsă devine RON în contractul existent; vei vedea rezultatul înainte să confirmi. Stările de aprobare și rezultat din CSV sunt declarații de sursă.</p>
      <div><Button disabled={busy||mapping.title==null||sourceReviewGroups(csv.headers,mapping,ignored).review.length>0} loading={busy} onClick={()=>void review()}>Verifică rândurile și duplicatele</Button></div>
    </>:null}
    {step===2&&preview?<>
      <div className={styles.toolbar}><p>{preview.accepted.length} {preview.accepted.length===1?"rând validat":"rânduri validate"} · {preview.rejected.length} respinse sau repetate · {selected.length} selectate</p><Button variant="ghost" disabled={busy} onClick={()=>{setStep(1);setPreview(null);setSelected([]);setConfirmed(false);focusStep();}}>Revizuiește câmpurile</Button></div>
      <p className={styles.notice}>Niciun rând nu este selectat automat. Potrivirile probabile cer verificare; ele nu leagă automat înregistrări. Căutarea verifică până la 2.000 de înregistrări din fiecare registru; absența unei potriviri nu dovedește unicitatea.</p>
      <div>{preview.accepted.slice(reviewPage*25,(reviewPage+1)*25).map(row=>{
        const probable=row.probable_signal_match||row.probable_company_match||row.probable_contact_match||row.probable_opportunity_match;
        const raw=mapped[row.row_number-2];
        return <div key={row.row_fingerprint} className={styles.reviewRow}>
          <input type="checkbox" aria-label={`Selectează rândul ${row.row_number}: ${row.title}`} disabled={busy||row.exact_duplicate} checked={selected.includes(row.row_fingerprint)} onChange={event=>{setSelected(current=>event.target.checked?[...current,row.row_fingerprint]:current.filter(id=>id!==row.row_fingerprint));setConfirmed(false);}}/>
          <div><h3>Rând {row.row_number} · {row.title}</h3><p className={styles.meta}>{row.company||"Companie neprecizată"} · {row.estimated_value||"Valoare neprecizată"} {row.currency} · {row.exact_duplicate?"Duplicat exact · exclus":probable?"Potrivire probabilă · verifică înainte de selecție":"Fără potrivire în verificarea limitată"}</p>
            <details><summary className="focus-ring">Compară sursa și valorile normalizate</summary><dl>{mappedFields.map(field=>{const value=(row as unknown as Record<string,unknown>)[normalizedKeys[field.key]??field.key];return <div key={field.key}><dt>{field.label}</dt><dd>Sursă: {raw?.[field.key]||"Gol"}</dd><dd>Normalizat: {value===null||value===undefined||value===""?"Gol":String(value)}</dd></div>;})}<div><dt>Monedă rezultată</dt><dd>{row.currency}</dd></div><div><dt>Tip sursă rezultat</dt><dd>{row.source_type}</dd></div></dl></details>
          </div>
        </div>;
      })}</div>
      {preview.accepted.length>25?<div className={styles.footer}><Button variant="ghost" disabled={busy||reviewPage===0} onClick={()=>setReviewPage(reviewPage-1)}>Anterior</Button><span className={styles.meta}>Pagina {reviewPage+1} din {Math.ceil(preview.accepted.length/25)}</span><Button variant="ghost" disabled={busy||(reviewPage+1)*25>=preview.accepted.length} onClick={()=>setReviewPage(reviewPage+1)}>Următor</Button></div>:null}
      {preview.rejected.length?<details><summary className="focus-ring cursor-pointer">Rânduri respinse sau repetate ({preview.rejected.length})</summary><ul>{preview.rejected.map((row,index)=><li className={styles.meta+" py-2"} key={index}>Rând {row.row_number} · {row.error_message}</li>)}</ul></details>:null}
      <section className={styles.section}><h2>Confirmă selecția</h2><p className={styles.meta}>{selected.length} semnale selectate din {fileName}. Confirmarea revalidează datele pe server și persistă rezultatul importului.</p><label className={styles.check+" my-4"}><input type="checkbox" disabled={busy||!selected.length} checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>Am verificat valorile normalizate și potrivirile pentru toate rândurile selectate. Confirm crearea semnalelor pentru revizuire, fără execuție externă.</label><Button disabled={busy||!confirmed||!selected.length} loading={busy} onClick={()=>void commit()}>Confirmă importul a {selected.length} semnale</Button></section>
    </>:null}
    {step===3&&result?<section className={styles.form} aria-live="polite"><h2>{result.ok?result.duplicateBatch?"Import deja înregistrat":"Import înregistrat":"Import nefinalizat"}</h2><p>{result.error}</p><dl className={styles.facts}><div><dt>Sursă</dt><dd>{preview?.fileName}</dd></div><div><dt>Identitate lot</dt><dd>{result.batchId||"Nicio confirmare de lot disponibilă"}</dd></div><div><dt>Rezultat raportat de server</dt><dd>{result.created} create · {result.rejected} respinse · {result.duplicates} duplicate · {result.failed} eșuate · {result.notSelected} neselectate</dd></div></dl>{csv?<details><summary className="focus-ring cursor-pointer">Maparea folosită în această sesiune</summary><dl className={styles.facts}>{mappedFields.map(field=><div key={field.key}><dt>{csv.headers[mapping[field.key]!]}</dt><dd>{field.label}</dd></div>)}</dl></details>:null}<p className={styles.meta}>Istoricul păstrează lotul, rândurile și numărul înregistrărilor. Maparea este disponibilă în această sesiune; fișierul original nu este arhivat. Venitul și rezultatele declarate în sursă nu sunt confirmate prin import.</p><div className={styles.toolbar}><Link className="focus-ring underline" href="/inbox/import">Vezi istoricul importurilor</Link><Link className="focus-ring underline" href="/inbox">Revizuiește semnalele</Link><Button variant="secondary" onClick={reset}>Începe alt import</Button></div></section>:null}
  </div>;
}
