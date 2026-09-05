"use client";
import { Button } from "@/components/ui/Button";
export default function DocumentsError({reset}:{reset:()=>void}) {
  return <section className="mx-auto max-w-3xl p-6" role="alert"><h1 className="text-xl font-semibold">Documentele nu sunt disponibile momentan</h1><p className="my-4 text-sm text-[rgb(var(--text-muted))]">Datele nu au putut fi încărcate. Reîncearcă; absența rezultatului nu înseamnă că documentele au fost eliminate.</p><Button variant="secondary" onClick={reset}>Reîncearcă încărcarea</Button></section>;
}
