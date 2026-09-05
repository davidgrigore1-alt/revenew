import { NextResponse } from "next/server";
import { saveLocalDocument } from "@/lib/documents/local-documents";
import { LocalDocumentError } from "@/lib/documents/local-document-core";

export async function POST(request: Request) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({error:"Cerere nepermisă."},{status:403});
  try {
    const filename = decodeURIComponent(request.headers.get("x-document-filename") ?? "");
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > 2097152) throw new LocalDocumentError("size","Fișierul depășește 2 MB. Originalul nu a fost salvat.");
    const reader = request.body?.getReader();
    if (!reader) throw new LocalDocumentError("empty","Alege un fișier CSV. Originalul nu a fost salvat.");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const {done,value}=await reader.read(); if(done)break; size+=value.byteLength; if(size>2097152){await reader.cancel();throw new LocalDocumentError("size","Fișierul depășește 2 MB. Originalul nu a fost salvat.");} chunks.push(value); }
    const bytes = new Uint8Array(size); let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    const result = await saveLocalDocument(bytes,filename,request.headers.get("content-type")?.split(";")[0]??"",request.headers.get("x-document-source")??undefined);
    return NextResponse.json(result,{headers:{"Cache-Control":"private, no-store"}});
  } catch(error) {
    return NextResponse.json({error:error instanceof LocalDocumentError?error.message:"Încărcarea nu a fost confirmată. Verifică Documente înainte de a reîncerca.",retained:error instanceof LocalDocumentError?error.retained:false},{status:error instanceof LocalDocumentError&&error.code==="forbidden"?403:400});
  }
}
