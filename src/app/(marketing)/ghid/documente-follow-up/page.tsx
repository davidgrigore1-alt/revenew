import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Documente, mesaje și follow-up în ReveNew",
  description: "Cum sunt pregătite emailurile, ofertele, scripturile de apel și follow-up-urile în ReveNew.",
  alternates: { canonical: canonicalUrl("/ghid/documente-follow-up") }
};

export default function GuideDocumentsPage() {
  return (
    <article className="prose prose-invert max-w-none rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 prose-headings:text-[rgb(var(--foreground))] prose-p:text-[rgb(var(--muted-foreground))]">
      <nav aria-label="Breadcrumb" className="text-sm"><Link href="/ghid">Ghid</Link> / Documente și follow-up</nav>
      <h1>Documente și follow-up pregătite pentru revizuire</h1>
      <p>ReveNew poate pregăti emailuri outreach, emailuri follow-up, drafturi de ofertă, scripturi de apel, checklisturi și mesaje scurte. Acestea sunt drafturi, nu trimiteri automate.</p>
      <h2>Ce este disponibil acum</h2>
      <p>Generarea de drafturi și salvarea documentelor în workspace sunt disponibile. Trimiterea directă prin email, WhatsApp sau LinkedIn este marcată ca planificată și nu este prezentată ca funcție activă.</p>
      <h2>De ce contează revizuirea</h2>
      <p>Datele comerciale pot conține erori, instrucțiuni malițioase sau informații incomplete. De aceea, mesajele sunt pregătite pentru control uman înainte de folosire.</p>
    </article>
  );
}
