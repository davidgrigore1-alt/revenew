import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { ApplicationLogo } from "@/components/apps/ApplicationLogo";
export function documentMimeLabel(mime:string){
 return mime==="application/vnd.google-apps.document"?"Google Docs":mime==="application/vnd.google-apps.spreadsheet"?"Google Sheets":
  mime==="application/pdf"?"PDF":mime==="text/plain"?"Text":mime==="text/csv"?"CSV":mime.includes("spreadsheetml")||mime==="application/vnd.ms-excel"?"Excel":mime.includes("wordprocessingml")||mime==="application/msword"?"Word":mime.includes("presentationml")||mime==="application/vnd.ms-powerpoint"?"PowerPoint":"Document";
}
/** Reuse local capability symbols; never hotlink or imitate missing official artwork. */
export function DocumentTypeIcon({mime}:{mime:string}){
 if(mime==="application/vnd.google-apps.document"||mime==="application/vnd.google-apps.spreadsheet")
  return <ApplicationLogo item={{id:mime.endsWith("spreadsheet")?"google-sheets":"google-docs",name:documentMimeLabel(mime)}} size="compact"/>;
 return <span className="grid h-8 w-8 shrink-0 place-items-center text-[rgb(var(--text-muted))]"><DocumentTextIcon className="h-6 w-6" aria-hidden="true"/></span>;
}
