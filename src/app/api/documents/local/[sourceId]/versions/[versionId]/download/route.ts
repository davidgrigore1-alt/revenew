import { downloadLocalDocument } from "@/lib/documents/local-documents";
export const dynamic="force-dynamic";
export async function GET(_request:Request,props:{params:Promise<{sourceId:string;versionId:string}>}) {
  try {
    const {sourceId,versionId}=await props.params;const result=await downloadLocalDocument(sourceId,versionId);
    return new Response(result.blob,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="document.csv"; filename*=UTF-8''${encodeURIComponent(result.filename).replace(/'/g,"%27")}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox"}});
  }catch{return Response.json({error:"Originalul nu este disponibil pentru acest cont. Verifică accesul sau reîncearcă."},{status:403,headers:{"Cache-Control":"private, no-store"}});}
}
