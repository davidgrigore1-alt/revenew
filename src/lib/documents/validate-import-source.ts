import "server-only";
import {getLocalDocument} from "./local-documents";
import {workbookSheetCsv} from "./workbook-import";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import type {ImportProvenance} from "@/lib/imports/actions";
export async function validateImportSource(provenance:ImportProvenance,rows:Record<string,unknown>[]) {
 const client=await createSupabaseServerClient();
 if(!client||!/^[a-f0-9-]{36}$/i.test(provenance.versionId))throw Error("Sursă indisponibilă.");
 const result=await client.from("local_document_versions").select("source_id").eq("id",provenance.versionId).maybeSingle();
 if(result.error||!result.data)throw Error("Sursă indisponibilă.");
 const doc=await getLocalDocument(result.data.source_id,provenance.versionId);
 if(!doc||doc.source.state!=="active"||doc.version.state!=="ready")throw Error("Sursă indisponibilă.");
 const csv=doc.version.workbook?workbookSheetCsv(doc.version.workbook.sheets.find(s=>s.index===provenance.sheetIndex)!):{headers:doc.version.headers??[],rows:doc.segments.map(s=>s.cells)};
 const entries=Object.entries(provenance.mapping).filter((e):e is [string,number]=>e[1]!==null);
 if(!entries.length||rows.length!==csv.rows.length||new Set(entries.map(e=>e[1])).size!==entries.length||entries.some(([key,index])=>key.length>80||!Number.isInteger(index)||index<0||index>=csv.headers.length))throw Error("Maparea nu mai corespunde versiunii salvate.");
 for(let i=0;i<rows.length;i++)for(const [key,index] of entries)if(String(rows[i][key]??"")!==csv.rows[i][index])throw Error("Valorile nu mai corespund versiunii salvate.");
 const mappedKeys=new Set(entries.map(([key])=>key));
 if(rows.some(row=>Object.entries(row).some(([key,value])=>!mappedKeys.has(key)&&value!==""&&value!==null&&value!==undefined)))throw Error("Valorile nemapate nu pot fi importate din această versiune.");
 return true;
}
