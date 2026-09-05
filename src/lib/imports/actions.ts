"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/authz/require-permission";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {createSupabaseAdminClient} from "@/lib/supabase/admin";
import {validateImportSource} from "@/lib/documents/validate-import-source";

export type ImportEntityType = "organizations" | "contacts" | "opportunities";
export type ImportRow = Record<string,string>;
export type ImportResult = {ok:boolean;batchId?:string;created:number;updated?:number;skipped:number;rejected:number;errors:Array<{row:number;message:string}>;duplicate?:boolean;error?:string};
export type ImportProvenance = {versionId:string;sheetIndex?:number;mapping:Record<string,number|null>};

export async function previewCrmImport(target:ImportEntityType,rows:ImportRow[]) {
 await requirePermission("opportunities.update");
 if(!["organizations","contacts","opportunities"].includes(target)||!Array.isArray(rows)||rows.length>1000)throw new Error("Import indisponibil.");
 const current=await getCurrentBusinessForUser({redirectIfMissing:true}),client=await createSupabaseServerClient();
 if(!current||!client)throw new Error("Spațiul nu este disponibil.");
 const table=target==="organizations"?"crm_organizations":target==="contacts"?"crm_contacts":"opportunities";
 const {data,error}=await client.from(table).select("*").eq("business_id",current.business.id).limit(2001);
 if(error||(data?.length??0)>2000)throw new Error("Potrivirile nu pot fi verificate integral în acest import.");
 const norm=(value:string)=>value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
 const seen=new Set<string>();
 return rows.map((row,index)=>{
  const name=row.name||row.full_name||row.title||"",identity=target==="contacts"?norm(row.email||""):norm(name);
  const exact=(data??[]).filter(item=>target==="contacts"?identity&&item.normalized_email===identity:target==="organizations"?item.normalized_name===identity:norm(item.title||"")===identity);
  const possible=(data??[]).some(item=>target==="contacts"?norm(item.full_name||"")===norm(name):target==="organizations"&&row.website?norm(item.website||"").replace(/^https?:\/\/(www\.)?/,"").replace(/\/$/,"")===norm(row.website).replace(/^https?:\/\/(www\.)?/,"").replace(/\/$/,""):false);
  const state=!name?"invalid":exact.length>1?"conflict":exact.length||identity&&seen.has(identity)?"exact":possible?"possible":"new";
  if(identity)seen.add(identity);return {row:index+2,name,state};
 });
}

export async function importCsvBatch(entityType:ImportEntityType,rawRows:ImportRow[],duplicateMode:"skip"|"update"|"create",provenance?:ImportProvenance):Promise<ImportResult> {
  const authorization=await requirePermission(entityType==="opportunities"?"opportunities.create":"opportunities.update");
  const failure=(error:string):ImportResult=>({ok:false,created:0,skipped:0,rejected:0,errors:[],error});
  if (!["organizations","contacts","opportunities"].includes(entityType)||!["skip","update","create"].includes(duplicateMode)||!Array.isArray(rawRows)||rawRows.length<1||rawRows.length>1000) return failure("Importul trebuie să conțină între 1 și 1.000 de rânduri și o destinație validă.");
  if(rawRows.some(row=>!row||typeof row!=="object"||Array.isArray(row)||Object.keys(row).length>30||Object.entries(row).some(([key,value])=>key.length>80||typeof value!=="string"||value.length>1200||/[<>\u0000-\u001f]/.test(value)))) return failure("Unele valori depășesc limitele importului sau conțin caractere neacceptate. Originalul rămâne păstrat.");
  const rows=rawRows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value.normalize("NFKC").trim()])));
  if(provenance){try{await validateImportSource(provenance,rawRows);}catch{return failure("Maparea și valorile nu corespund versiunii salvate. Redeschide documentul.");}}
  const current=await getCurrentBusinessForUser({redirectIfMissing:true}),client=await createSupabaseServerClient();
  if(!current||!client)return failure("Spațiul de lucru nu este disponibil momentan.");
  const admin=createSupabaseAdminClient();if(!admin||!authorization.profileId||current.profileId!==authorization.profileId)return failure("Importul nu este disponibil.");
  const {data,error}=await admin.rpc("import_crm_batch_atomic",{p_actor:authorization.profileId,p_business:current.business.id,p_target:entityType,p_rows:rows,p_mode:duplicateMode,p_version:provenance?.versionId??null,p_sheet:provenance?.sheetIndex??null,p_mapping:provenance?.mapping??null});
  if(error||!data?.ok) return failure("Confirmarea importului nu este disponibilă. Reîncearcă aceeași selecție: un lot deja confirmat va returna rezultatul existent, fără repetarea scrierilor.");
  revalidatePath("/companies");revalidatePath("/contacts");revalidatePath("/opportunities");revalidatePath("/dashboard");revalidatePath("/documents");
  return data as ImportResult;
}
