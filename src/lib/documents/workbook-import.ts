import type {WorkbookSheet} from "./workbook-types";
import type {DocumentCsv} from "./csv";
export function workbookSheetCsv(sheet:WorkbookSheet):DocumentCsv {
 if(!sheet.inspected||sheet.partial)throw Error("Această foaie are acoperire parțială. Pentru import, adaugă o copie cu foaia încadrată integral în limite; originalul rămâne păstrat.");
 if(sheet.previewRows<2||sheet.previewColumns>30)throw Error("Importul necesită un antet, cel puțin un rând de date și cel mult 30 de coloane.");
 const rows=Array.from({length:sheet.previewRows},()=>Array<string>(sheet.previewColumns).fill(""));
 for(const cell of sheet.cells){if(cell.formula&&!cell.cached)throw Error(`Celula ${cell.address} nu are rezultat memorat. Revizuiește originalul înainte de import.`);rows[cell.row][cell.column]=cell.type==="n"&&typeof cell.raw==="number"&&!/^\d{4}-\d{2}-\d{2}$/.test(cell.display)?String(cell.raw):cell.display;}
 const headers=rows.shift()!;
 if(headers.some(h=>!h.trim()||h.length>80)||new Set(headers.map(h=>h.trim().toLowerCase())).size!==headers.length)throw Error("Antetul foii trebuie să conțină denumiri distincte, completate, de cel mult 80 de caractere.");
 return {headers,rows,delimiter:","};
}
