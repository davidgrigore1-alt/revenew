import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { ApplicationLogo } from "@/components/apps/ApplicationLogo";
export function documentMimeLabel(mime:string){
 return mime==="application/vnd.google-apps.document"?"Google Docs":mime==="application/vnd.google-apps.spreadsheet"?"Google Sheets":
  mime==="application/pdf"?"PDF":mime==="text/plain"?"Text":"Document";
}
/** Reuse local capability symbols; never hotlink or imitate missing official artwork. */
export function DocumentTypeIcon({mime}:{mime:string}){
 if(mime==="application/vnd.google-apps.document"||mime==="application/vnd.google-apps.spreadsheet")
  return <ApplicationLogo item={{id:mime.endsWith("spreadsheet")?"google-sheets":"google-docs",name:documentMimeLabel(mime)}} size="compact"/>;
 return <span className="relative grid h-8 w-8 shrink-0 place-items-center text-[rgb(var(--text-muted))]"><DocumentTextIcon className="h-6 w-6" aria-hidden="true"/>{mime==="application/pdf"?<span className="absolute bottom-0 text-[8px] font-bold">PDF</span>:null}</span>;
}
