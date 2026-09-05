"use client";
import { Button } from "@/components/ui/Button";
export default function SourceError({reset}:{reset:()=>void}) {
  return <section className="mx-auto max-w-3xl p-6" role="alert"><h1 className="text-xl font-semibold">Sursa nu poate fi încărcată momentan</h1><p className="my-4 text-sm text-[rgb(var(--text-muted))]">Verificarea nu a fost finalizată. Această eroare nu confirmă pierderea accesului sau ștergerea fișierului.</p><Button variant="secondary" onClick={reset}>Reîncearcă încărcarea</Button></section>;
}
