"use client";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { columnLetter, type WorkbookProjection } from "@/lib/documents/workbook-types";
import styles from "./WorkbookViewer.module.css";

export function WorkbookViewer({workbook,downloadHref}:{workbook:WorkbookProjection;downloadHref?:string}) {
  const id=useId(), tabs=useRef<HTMLDivElement>(null), grid=useRef<HTMLTableElement>(null);
  const [active,setActive]=useState(workbook.sheets.find(s=>s.visibility==="visible")?.index??0);
  const [hidden,setHidden]=useState(false), [page,setPage]=useState(0), [selected,setSelected]=useState<[number,number]>([0,0]), [search,setSearch]=useState("");
  const sheet=workbook.sheets.find(s=>s.index===active)!;
  const shown=workbook.sheets.filter(s=>hidden||s.visibility==="visible"||s.index===active);
  const cells=useMemo(()=>new Map(sheet.cells.map(cell=>[cell.address,cell])),[sheet]);
  const address=`${columnLetter(selected[1])}${selected[0]+1}`, cell=cells.get(address);
  const start=page*50, count=Math.min(50,Math.max(0,sheet.previewRows-start));
  function switchSheet(index:number) {setActive(index);setPage(0);setSelected([0,0]);setSearch("");}
  function tabKey(event:KeyboardEvent<HTMLButtonElement>,index:number) {
    const position=shown.findIndex(s=>s.index===index);
    const next=event.key==="Home"?0:event.key==="End"?shown.length-1:event.key==="ArrowRight"?(position+1)%shown.length:event.key==="ArrowLeft"?(position+shown.length-1)%shown.length:null;
    if(next===null)return;event.preventDefault();switchSheet(shown[next].index);tabs.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  }
  function cellKey(event:KeyboardEvent<HTMLTableCellElement>,row:number,column:number) {
    const next: [number,number]=event.key==="ArrowRight"?[row,column+1]:event.key==="ArrowLeft"?[row,column-1]:event.key==="ArrowDown"?[row+1,column]:event.key==="ArrowUp"?[row-1,column]:event.key==="Home"?[row,0]:event.key==="End"?[row,sheet.previewColumns-1]:[row,column];
    if(next[0]===row&&next[1]===column)return; event.preventDefault();
    if(next[0]<start||next[0]>=start+count||next[1]<0||next[1]>=sheet.previewColumns)return;
    setSelected(next);grid.current?.querySelector<HTMLTableCellElement>(`[data-coordinate="${columnLetter(next[1])}${next[0]+1}"]`)?.focus();
  }
  return <section className={styles.workbook} aria-label="Workbook Excel · doar citire">
    <div className={styles.identity}><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 3h14l5 5v21H7zM21 3v6h5M11 14h11M11 19h11M11 24h11M16 14v10"/></svg><div><strong>Workbook Excel</strong><p>{workbook.sheetCount} foi · Original păstrat · Doar citire</p></div>{downloadHref?<a className="focus-ring ml-auto text-xs underline" href={downloadHref}>Descarcă originalul</a>:null}</div>
    <div className={styles.navigation}><div ref={tabs} role="tablist" aria-label="Foile workbook-ului" className={styles.tabs}>{shown.map(s=><button key={s.index} id={`${id}-tab-${s.index}`} type="button" role="tab" aria-selected={active===s.index} aria-controls={`${id}-sheet`} tabIndex={active===s.index?0:-1} onClick={()=>switchSheet(s.index)} onKeyDown={event=>tabKey(event,s.index)}>{s.name}{s.visibility!=="visible"?<span> · ascunsă</span>:null}</button>)}</div>{workbook.sheets.some(s=>s.visibility!=="visible")?<label className={styles.hidden}><input type="checkbox" checked={hidden} onChange={event=>setHidden(event.target.checked)}/>Foi ascunse în sursă</label>:null}</div>
    <div role="tabpanel" id={`${id}-sheet`} aria-labelledby={`${id}-tab-${active}`}>
      <div className={styles.sheetInfo}><p><strong>{sheet.name}</strong><span>{sheet.inspected?`${sheet.rows} rânduri · ${sheet.columns} coloane`:"În afara previzualizării"}{sheet.visibility!=="visible"?` · ${sheet.visibility==="very_hidden"?"foarte ascunsă":"ascunsă"} în original`:""}</span></p><label>Caută în foaie<input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Evidențiază un text"/></label></div>
      {sheet.partial?<p className={styles.coverage} role="status">Acoperire parțială · {sheet.previewRows} din {sheet.rows || "număr necunoscut de"} rânduri și {sheet.previewColumns} coloane previzualizate. Unele valori pot fi prescurtate. Originalul descărcabil rămâne integral.</p>:null}
      {sheet.previewRows&&sheet.previewColumns?<>
        <div className={styles.scroll} role="region" aria-label={`Date din foaia ${sheet.name}; săgețile deplasează selecția`}><table ref={grid} role="grid" aria-readonly="true" aria-rowcount={sheet.rows+1} aria-colcount={sheet.columns+1} className={styles.grid}>
          <caption className="sr-only">{sheet.name}. Prima linie conține coordonatele, rândul 1 păstrează datele originale.</caption>
          <colgroup><col style={{width:46}}/>{Array.from({length:sheet.previewColumns},(_,column)=><col key={column} style={{width:190}}/>)}</colgroup>
          <thead><tr><th scope="col" className={styles.corner}>#</th>{Array.from({length:sheet.previewColumns},(_,c)=><th scope="col" key={c}>{columnLetter(c)}</th>)}</tr></thead>
          <tbody>{Array.from({length:count},(_,r)=>{const row=start+r;return <tr key={row} aria-rowindex={row+2}><th scope="row">{row+1}</th>{Array.from({length:sheet.previewColumns},(_,column)=>{const coord=`${columnLetter(column)}${row+1}`,value=cells.get(coord), isSelected=selected[0]===row&&selected[1]===column;return <td key={column} role="gridcell" tabIndex={isSelected?0:-1} aria-selected={isSelected} aria-label={`${coord}: ${value?.display || (value?.formula?"Formulă fără rezultat memorat":"Celulă goală")}${value?.formula?"; formulă în sursă":""}`} data-coordinate={coord} data-number={value?.type==="n"||undefined} data-match={Boolean(search&&value?.display.toLocaleLowerCase().includes(search.toLocaleLowerCase()))||undefined} onClick={()=>setSelected([row,column])} onFocus={()=>setSelected([row,column])} onKeyDown={event=>cellKey(event,row,column)}>{value?.formula?<span className={styles.fx}>fx</span>:null}<span>{value?.display || <span className={styles.empty}>{value?.formula?"Fără rezultat":"—"}</span>}</span></td>;})}</tr>;})}</tbody>
        </table></div>
        <div className={styles.inspector} aria-live="polite"><strong>{address}</strong><div><p>{cell?.display || (cell?.formula?"Rezultat memorat indisponibil":"Celulă goală")}</p>{cell?.formula?<><code>={cell.formula}</code><small>{cell.cached?"Valoare memorată în sursă. ReveNew nu recalculează formula.":"Sursa nu conține un rezultat memorat. Formula nu este calculată."}</small></>:null}{cell?.hyperlink?<small>Celula conține o legătură. ReveNew nu deschide automat conținut extern.</small>:null}{cell?.truncated?<small>Valoare prescurtată în previzualizare.</small>:null}</div><span>{sheet.name} · {cell?.type==="n"?"Număr":cell?.type==="b"?"Valoare logică":"Text / sursă"}</span></div>
        {sheet.previewRows>50?<nav className={styles.pagination} aria-label="Rândurile previzualizării"><button disabled={!page} onClick={()=>{setPage(page-1);setSelected([(page-1)*50,0]);}}>← Anterioare</button><span>Rândurile {start+1}–{start+count} din {sheet.previewRows}</span><button disabled={start+50>=sheet.previewRows} onClick={()=>{setPage(page+1);setSelected([(page+1)*50,0]);}}>Următoare →</button></nav>:null}
      </>:<p className={styles.coverage}>{sheet.inspected?"Foaia nu conține celule în zona previzualizată.":"Această foaie nu a fost extrasă. Consultă originalul pentru conținut."}</p>}
    </div>
  </section>;
}
