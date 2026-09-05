"use client";
import {useState} from "react";
import {DocumentCsvImport} from "./DocumentCsvImport";
import {CsvImportWizard} from "@/components/imports/CsvImportWizard";
import {workbookSheetCsv} from "@/lib/documents/workbook-import";
import type {WorkbookProjection} from "@/lib/documents/workbook-types";
import type {DocumentCsv} from "@/lib/documents/csv";
import type {ImportEntityType} from "@/lib/imports/actions";
import styles from "./Documents.module.css";
export function SavedDocumentImport({workbook,csv,name,bytes,href,versionId}:{workbook?:WorkbookProjection|null;csv:DocumentCsv;name:string;bytes:number;href:string;versionId:string}) {
 const [sheet,setSheet]=useState(workbook?.sheets.find(s=>s.visibility==="visible")?.index??0),[target,setTarget]=useState<ImportEntityType|"signals"|"">("");
 let parsed=csv,error="";
 try{if(workbook)parsed=workbookSheetCsv(workbook.sheets[sheet]);}catch(e){error=e instanceof Error?e.message:"Foaie indisponibilă.";}
 const provenance={versionId,...(workbook?{sheetIndex:sheet}:{})};
 return <div className={styles.form}>{workbook?<label className={styles.field}>Foaia pentru acest import<select value={sheet} onChange={e=>{setSheet(Number(e.target.value));setTarget("");}}>{workbook.sheets.map(s=><option key={s.index} value={s.index}>{s.name}{s.visibility!=="visible"?" · ascunsă în original":""}</option>)}</select></label>:null}
 {error?<p role="alert" className={styles.notice}>{error}</p>:<><label className={styles.field}>Ce vrei să creezi din aceste date?<select value={target} onChange={e=>setTarget(e.target.value as typeof target)}><option value="">Alege destinația</option><option value="signals">Semnale comerciale · revizuire în Inbox</option><option value="organizations">Companii</option><option value="contacts">Contacte</option><option value="opportunities">Oportunități</option></select></label>
 {target==="signals"?<DocumentCsvImport key={`${sheet}:signals`} initialSource={{csv:parsed,name,bytes,href,provenance}}/>:target?<CsvImportWizard key={`${sheet}:${target}`} initialTarget={target} initialSource={{csv:parsed,name,provenance}}/>:null}</>}
 </div>;
}
