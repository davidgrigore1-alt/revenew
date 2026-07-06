import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Cum funcționează ReveNew",
  description: "Fluxul ReveNew: semnal comercial, analiză, oportunitate, acțiune recomandată, document, rezultat și raport.",
  alternates: { canonical: canonicalUrl("/ghid/cum-functioneaza") }
};

export default function GuideHowItWorksPage() {
  return (
    <article className="prose prose-invert max-w-none rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 prose-headings:text-[rgb(var(--foreground))] prose-p:text-[rgb(var(--muted-foreground))]">
      <nav aria-label="Breadcrumb" className="text-sm"><Link href="/ghid">Ghid</Link> / Cum funcționează</nav>
      <h1>Cum funcționează ReveNew</h1>
      <p>Fluxul produsului pornește de la un semnal comercial și ajunge la o acțiune urmărită. Scopul este să facă vizibilă valoarea recuperabilă, nu să înlocuiască echipa comercială.</p>
      <h2>Fluxul central</h2>
      <ol>
        <li>Semnal comercial: email, formular, apel, lead vechi sau cerere introdusă manual.</li>
        <li>Revizuire: echipa validează dacă semnalul merită urmărit.</li>
        <li>Oportunitate: ReveNew structurează valoarea estimată, riscurile și scorurile.</li>
        <li>Acțiune recomandată: apel, ofertă, follow-up sau cerere de informații.</li>
        <li>Document: email, script de apel, draft de ofertă sau checklist.</li>
        <li>Rezultat: contactat, câștigat, pierdut, ignorat sau follow-up necesar.</li>
        <li>Raport: estimările sunt separate de venitul confirmat.</li>
      </ol>
      <p>Continuă cu <Link href="/ghid/oportunitati">oportunitățile comerciale</Link>.</p>
    </article>
  );
}
