import { NextResponse } from "next/server";
import { requireActivePaidAccess } from "@/lib/billing/paid-access";
import { requirePermission } from "@/lib/authz/require-permission";
import { requireGoogleConnectorActor } from "@/lib/google-workspace/repository";
import { isTrustedMutationRequest } from "@/lib/google-workspace/security";
import { DRIVE_LIMITS } from "@/lib/google-workspace/drive-core";
import { boundedResponseText } from "@/lib/google-workspace/drive-provider";
import { getDriveWorkspace, getPickerConfiguration, reviewDriveSelection, ingestDriveSelection, syncDriveSource, removeDriveSource } from "@/lib/google-workspace/drive";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private","Pragma":"no-cache"};
const safeError=(status=400)=>NextResponse.json({error:"Operațiunea Drive nu a putut fi finalizată. Verifică autorizarea, conexiunea și contextul selectat."},{status,headers});
export async function GET(request:Request){
 try{
  await requireActivePaidAccess();await requirePermission("documents.read");
  return NextResponse.json(await getDriveWorkspace(new URL(request.url).searchParams.get("opportunity")??undefined),{headers});
 }catch{return safeError(403);}
}
export async function POST(request:Request){
 if(!isTrustedMutationRequest(request))return safeError(403);
 try{
  await requireActivePaidAccess();await requirePermission("workspace.read");
  const actor=await requireGoogleConnectorActor();
  const input=JSON.parse(await boundedResponseText(new Response(request.body),DRIVE_LIMITS.requestBytes));
  if(!input||typeof input!=="object"||(input.connectionId!==undefined&&typeof input.connectionId!=="string"))return safeError();
  if(input.action==="picker_config")return NextResponse.json(await getPickerConfiguration(actor,input.connectionId),{headers});
  if(input.action==="review"){
   await requirePermission("documents.read");
   return NextResponse.json({files:await reviewDriveSelection(actor,input.files,input.connectionId)},{headers});
  }
  await requirePermission(input.action==="remove"?"documents.update":"documents.generate");
  if(input.action==="ingest"&&input.confirmed===true)return NextResponse.json({results:await ingestDriveSelection(actor,input.files,input.connectionId)},{headers});
  if(typeof input.sourceId!=="string")return safeError();
  if(input.action==="sync")return NextResponse.json(await syncDriveSource(actor,input.sourceId),{headers});
  if(input.action==="remove"&&input.confirmed===true)return NextResponse.json(await removeDriveSource(actor,input.sourceId),{headers});
  return safeError();
 }catch{return safeError();}
}
