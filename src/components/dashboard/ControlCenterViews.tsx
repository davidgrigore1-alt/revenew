import Link from "next/link";
export function ControlCenterViews({active}:{active:"now"|"executive"|"review"}){
 return <nav aria-label="Vederi Control Center" className="flex flex-wrap gap-1 border-b border-[rgb(var(--border))] pt-4">
  {[["now","Acum","/dashboard"],["executive","Brief executiv","/dashboard?view=executive"],["review","Revizuire comercială","/dashboard?view=review"]].map(([id,label,href])=><Link key={id} href={href} aria-current={active===id?"page":undefined} className="focus-ring inline-flex h-8 items-center rounded-t-button border-b-2 border-transparent px-3 text-sm text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))] aria-[current=page]:border-[rgb(var(--primary))] aria-[current=page]:text-[rgb(var(--foreground))]">{label}</Link>)}
 </nav>;
}
