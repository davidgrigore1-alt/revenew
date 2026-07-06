import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Integrări și date în ReveNew",
  description: "Stadiul real al integrărilor ReveNew: Supabase, OpenAI, email, WhatsApp, Gmail, OCR și CRM.",
  alternates: { canonical: canonicalUrl("/ghid/integrari-date") }
};

export default function GuideIntegrationsPage() {
  return (
    <article className="prose prose-invert max-w-none rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 prose-headings:text-[rgb(var(--foreground))] prose-p:text-[rgb(var(--muted-foreground))]">
      <nav aria-label="Breadcrumb" className="text-sm"><Link href="/ghid">Ghid</Link> / Integrări și date</nav>
      <h1>Integrări, date și stadiul produsului</h1>
      <p>ReveNew folosește Supabase pentru autentificare și date de workspace. OpenAI poate fi folosit server-side pentru analiză și generare de drafturi atunci când cheia este configurată.</p>
      <h2>Ce nu este activ încă</h2>
      <p>Nu există flux confirmat de trimitere Resend, Gmail OAuth, WhatsApp delivery, voice AI, OCR sau sincronizare CRM. Aceste direcții pot fi planificate, dar nu sunt prezentate ca funcții active.</p>
      <h2>Securitate și confidențialitate</h2>
      <p>Cheile de provider trebuie să rămână server-only. Ghidul public nu încarcă date private, oportunități sau identificatori de workspace.</p>
    </article>
  );
}
