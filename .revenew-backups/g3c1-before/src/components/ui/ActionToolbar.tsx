import type { ReactNode } from "react";
export const toolbarActionClass="focus-ring inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-xs font-medium text-[rgb(var(--foreground))] transition-colors hover:bg-[rgb(var(--surface-subtle))] disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4";
export const toolbarOverflowClass="focus-ring inline-flex h-8 w-8 shrink-0 cursor-pointer list-none items-center justify-center rounded-button border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-base marker:hidden hover:bg-[rgb(var(--surface-subtle))]";
export function ActionToolbar({children,label="Acțiuni"}:{children:ReactNode;label?:string}){
 return <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">{children}</div>;
}
