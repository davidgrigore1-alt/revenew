import Link from "next/link";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { PageShell } from "@/components/dashboard/PageShell";
import { DriveWorkspace } from "@/components/apps/DriveWorkspace";
import { DriveSourceActions } from "@/components/documents/DriveSourceActions";
import { DocumentTypeIcon,documentMimeLabel } from "@/components/documents/DocumentTypeIcon";
import { getCommercialDocuments } from "@/lib/commercial-documents";
import { formatProductDateTime } from "@/lib/ui/presentation";
export const dynamic="force-dynamic";
export default async function DocumentsPage({searchParams}:{searchParams:{q?:string;provider?:string;page?:string}}){
 const model=await getCommercialDocuments({query:searchParams.q,provider:searchParams.provider,page:searchParams.page});
 const href=(provider=model.provider,page=1)=>"/documents?"+new URLSearchParams({q:model.query,provider,page:String(page)});
 return <PageShell eyebrow="Documente" title="Documente comerciale" description="Surse autorizate, documente interne și context verificabil.">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <form action="/documents" className="flex h-8 min-w-0 max-w-xl flex-1 items-center rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
    <input type="hidden" name="provider" value={model.provider}/>
    <input name="q" defaultValue={model.query} maxLength={100} aria-label="Caută documente și context comercial" placeholder="Caută documente sau oportunități…" className="focus-ring h-8 min-w-0 flex-1 rounded-button bg-transparent px-3 text-xs"/>
    <button className="focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-button" type="submit" aria-label="Caută documente"><MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true"/></button>
   </form>
   {model.canSelect?<DriveWorkspace selectorOnly/>:null}
  </div>
  <nav aria-label="Sursa documentelor" className="flex gap-4 border-b border-[rgb(var(--border))] py-3 text-xs">
   {[["all","Toate"],["google_drive","Google Drive"],["revenew","ReveNew"]].map(([value,label])=><Link key={value} href={href(value)} aria-current={model.provider===value?"page":undefined} className={"focus-ring rounded px-1 py-1 "+(model.provider===value?"font-semibold text-[rgb(var(--foreground))]":"text-[rgb(var(--text-muted))]")}>{label}</Link>)}
  </nav>
  {model.items.length?<div role="table" aria-label="Documente comerciale">
   <div role="row" className="hidden gap-4 border-b border-[rgb(var(--border))] py-2 text-[11px] text-[rgb(var(--text-muted))] lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_7rem_10rem_8rem_2.5rem]">
    {["Document","Context","Sursă","Actualizat / verificat","Stare",""].map((label,index)=><span role="columnheader" key={index}>{label}</span>)}
   </div>
   {model.items.map(item=><div key={item.kind+":"+item.id} role="row" className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-[rgb(var(--border))] py-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_7rem_10rem_8rem_2.5rem]">
    <div role="cell" className="flex min-w-0 items-center gap-3"><DocumentTypeIcon mime={item.mime}/><div className="min-w-0">
     <Link href={item.detailHref} className="focus-ring block truncate text-sm font-medium hover:underline">{item.title}</Link>
     <p className="mt-0.5 text-xs text-[rgb(var(--text-muted))]">{item.commercialType} · {documentMimeLabel(item.mime)}</p>
    </div></div>
    <Link role="cell" href={item.linkedContext.href} className="focus-ring col-start-1 truncate text-xs text-[rgb(var(--text-secondary))] hover:underline lg:col-auto">{item.linkedContext.title}</Link>
    <span role="cell" className="text-xs text-[rgb(var(--text-muted))]">{item.provider==="google_drive"?"Google Drive":"ReveNew"}</span>
    <div role="cell" className="text-xs text-[rgb(var(--text-muted))]">
     {item.sourceModifiedAt?<p>Modificat {formatProductDateTime(item.sourceModifiedAt)}</p>:null}
     {item.lastSyncedAt?<p>Verificat {formatProductDateTime(item.lastSyncedAt)}</p>:null}
    </div>
    <span role="cell" className="text-xs text-[rgb(var(--text-secondary))]">{item.status}</span>
    <div role="cell" className="col-start-2 row-start-1 lg:col-auto lg:row-auto">{item.provider==="google_drive"?<DriveSourceActions id={item.id} title={item.title} canSync={item.availableActions.sync} canRemove={item.availableActions.remove} detailHref={item.detailHref} sourceHref={item.sourceHref}/>:null}</div>
   </div>)}
  </div>:<p className="py-8 text-sm text-[rgb(var(--text-muted))]">{model.query?"Niciun document pentru această căutare.":"Documentele comerciale apar aici când sunt create în ReveNew sau selectate din sursele conectate."}</p>}
  {model.page>1||model.hasMore?<nav aria-label="Paginarea documentelor" className="flex items-center justify-end gap-4 py-3 text-xs">
   {model.page>1?<Link className="focus-ring rounded p-1" href={href(model.provider,model.page-1)}>Înapoi</Link>:null}
   <span>Pagina {model.page}</span>{model.hasMore?<Link className="focus-ring rounded p-1" href={href(model.provider,model.page+1)}>Următoarea</Link>:null}
  </nav>:null}
 </PageShell>;
}
