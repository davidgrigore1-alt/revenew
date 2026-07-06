import { MarketingNav } from "@/components/marketing/MarketingNav";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <MarketingNav />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">ReveNew</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Termeni și condiții</h1>
        <p className="mt-5 text-base leading-7 text-[rgb(var(--muted-foreground))]">
          Această pagină este un placeholder public pentru termenii ReveNew. Textul contractual final trebuie validat înainte de folosire comercială completă.
        </p>
      </section>
    </main>
  );
}
