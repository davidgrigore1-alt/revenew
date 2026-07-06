import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Oportunități comerciale în ReveNew",
  description: "Cum sunt analizate cererile comerciale, lead-urile și ofertele neurmărite în ReveNew.",
  alternates: { canonical: canonicalUrl("/ghid/oportunitati") }
};

export default function GuideOpportunitiesPage() {
  return (
    <article className="prose prose-invert max-w-none rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 prose-headings:text-[rgb(var(--foreground))] prose-p:text-[rgb(var(--muted-foreground))]">
      <nav aria-label="Breadcrumb" className="text-sm"><Link href="/ghid">Ghid</Link> / Oportunități</nav>
      <h1>Oportunități comerciale și valoare recuperabilă</h1>
      <p>O oportunitate ReveNew conține sursa, valoarea estimată, scoruri, riscuri, recomandarea următoare și statusul rezultatului. Valorile estimate sunt ipoteze comerciale, nu venit garantat.</p>
      <h2>Scoruri și interpretare</h2>
      <p>Scorurile de potrivire, urgență, bani și încredere ajută echipa să prioritizeze. Ele trebuie citite împreună cu textul sursă și contextul firmei.</p>
      <h2>Control uman</h2>
      <p>ReveNew poate pregăti o analiză avansată, dar utilizatorul decide dacă salvează oportunitatea și ce acțiune urmează.</p>
    </article>
  );
}
