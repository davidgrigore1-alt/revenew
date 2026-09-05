"use client";

import { useId, useState } from "react";
import styles from "./Documents.module.css";

export function StructuredGrid({rows,headers,label,firstRow=1}:{rows:string[][];headers?:string[];label:string;firstRow?:number}) {
  const [wrap,setWrap]=useState(true);
  const [page,setPage]=useState(0);
  const id=useId();
  const columns=Math.max(headers?.length??0,...rows.map(row=>row.length));
  const pages=Math.ceil(rows.length/50);
  const activePage=Math.min(page,Math.max(0,pages-1));
  return <div className={styles.gridFrame}>
    <div className={styles.gridToolbar}>
      <p id={id} className={styles.meta}>{label} · {rows.length} {rows.length===1?"rând":"rânduri"} · {columns} {columns===1?"coloană":"coloane"} · doar citire</p>
      <label className={styles.check}><input type="checkbox" checked={wrap} onChange={event=>setWrap(event.target.checked)}/>Text pe mai multe rânduri</label>
    </div>
    <div className={`${styles.gridScroll} focus-ring`} role="region" aria-labelledby={id} tabIndex={0}>
      <table className={styles.grid} data-wrap={wrap}>
        <caption className="sr-only">{label}. Celulele goale sunt marcate explicit. Folosește săgețile pentru derulare.</caption>
        <thead><tr><th className={styles.rowNumber} scope="col">Rând</th>{Array.from({length:columns},(_,index)=><th scope="col" key={index}>{headers?.[index]||`Coloana ${index+1}`}</th>)}</tr></thead>
        <tbody>{rows.slice(activePage*50,(activePage+1)*50).map((row,index)=><tr key={activePage*50+index}><th scope="row" className={styles.rowNumber}>{firstRow+activePage*50+index}</th>{Array.from({length:columns},(_,cell)=><td key={cell}>{row[cell]!==undefined&&row[cell]!==""?row[cell]:<span className={styles.emptyCell}>Gol</span>}</td>)}</tr>)}</tbody>
      </table>
    </div>
    {pages>1?<div className={styles.gridToolbar}><button type="button" className="focus-ring" disabled={activePage===0} onClick={()=>setPage(activePage-1)}>← Rândurile anterioare</button><span className={styles.meta}>Pagina {activePage+1} din {pages} · maximum 50 rânduri afișate</span><button type="button" className="focus-ring" disabled={activePage+1>=pages} onClick={()=>setPage(activePage+1)}>Rândurile următoare →</button></div>:null}
  </div>;
}
