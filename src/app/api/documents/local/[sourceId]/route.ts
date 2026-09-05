import { NextResponse } from "next/server";
import { associateLocalDocument, deleteLocalDocument, finalizeLocalDocument } from "@/lib/documents/local-documents";
import { LocalDocumentError } from "@/lib/documents/local-document-core";
import { assertJsonRequest } from "@/lib/api/request-validation";

export async function POST(request:Request,props:{params:Promise<{sourceId:string}>}) {
  if(request.headers.get("origin")&&request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({error:"Cerere nepermisă."},{status:403});
  const check=assertJsonRequest(request);if(!check.ok)return NextResponse.json({error:check.error},{status:check.status});
  try {
    const {sourceId}=await props.params;const body=await request.json();
    if(body.action==="delete")return NextResponse.json(await deleteLocalDocument(sourceId));
    if(body.action==="retry"&&typeof body.versionId==="string"){await finalizeLocalDocument(sourceId,body.versionId);return NextResponse.json({ok:true});}
    if(body.action==="associate"&&(typeof body.opportunityId==="string"||body.opportunityId===null)){await associateLocalDocument(sourceId,body.opportunityId);return NextResponse.json({ok:true});}
    return NextResponse.json({error:"Operațiune nepermisă."},{status:400});
  }catch(error){return NextResponse.json({error:error instanceof LocalDocumentError?error.message:"Operațiunea nu a fost confirmată. Reîncearcă din document."},{status:400});}
}
