import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Planuri și utilizare ReveNew",
  description: "Explicație publică pentru planurile ReveNew, modul Preview și limitele de utilizare în unități comerciale.",
  alternates: { canonical: canonicalUrl("/ghid/planuri-utilizare") }
};

export default function GuideUsagePage() {
  return (
    <article className="prose prose-invert max-w-none rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 prose-headings:text-[rgb(var(--foreground))] prose-p:text-[rgb(var(--muted-foreground))]">
      <nav aria-label="Breadcrumb" className="text-sm"><Link href="/ghid">Ghid</Link> / Planuri și utilizare</nav>
      <h1>Planuri, limite și utilizare</h1>
      <p>În modul Preview, utilizatorii autentificați pot selecta gratuit un plan de test. Această selecție nu este plată și nu creează abonament.</p>
      <h2>Unități de utilizare</h2>
      <p>Limitele sunt exprimate în limbaj comercial: analize avansate, documente pregătite, emailuri follow-up, scripturi de apel sau checklisturi. Costurile interne de provider nu sunt afișate clienților.</p>
      <h2>Modul Paid</h2>
      <p>În modul Paid, accesul va depinde de o verificare server-side a dreptului plătit. Cookie-ul de preview nu este dovadă de plată.</p>
    </article>
  );
}
