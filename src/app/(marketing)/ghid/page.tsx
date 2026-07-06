import type { Metadata } from "next";
import Link from "next/link";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Ghid ReveNew",
  description: "Ghid public despre recuperarea oportunităților comerciale, utilizarea ReveNew, limitele planurilor și controlul uman.",
  alternates: { canonical: canonicalUrl("/ghid") }
};

export default function GuideIndexPage() {
  return (
    <article className="prose prose-invert max-w-none rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 prose-headings:text-[rgb(var(--foreground))] prose-p:text-[rgb(var(--muted-foreground))]">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Ghid ReveNew</p>
      <h1>Recuperare venituri B2B, explicată înainte de login</h1>
      <p>
        ReveNew ajută firmele B2B să identifice cereri comerciale fără răspuns, lead-uri uitate, oferte neurmărite și oportunități cu risc. Platforma nu garantează venituri și nu trimite mesaje automat; echipa clientului păstrează controlul deciziilor.
      </p>
      <h2>Ce poți înțelege din acest ghid</h2>
      <ul>
        <li>cum trece un semnal comercial de la analiză la acțiune;</li>
        <li>cum sunt separate valorile estimate de venitul confirmat;</li>
        <li>cum funcționează documentele, scripturile și follow-up-urile;</li>
        <li>ce este disponibil acum și ce rămâne planificat;</li>
        <li>cum sunt tratate limitele de utilizare în perioada de testare.</li>
      </ul>
      <p>
        Începe cu <Link href="/ghid/cum-functioneaza">fluxul complet ReveNew</Link> sau mergi direct la <Link href="/ghid/planuri-utilizare">planuri și utilizare</Link>.
      </p>
    </article>
  );
}
