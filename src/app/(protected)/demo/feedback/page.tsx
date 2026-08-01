import { ArrowLeftIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { PageShell } from "@/components/dashboard/PageShell";
import { BuyerFeedbackCapture } from "@/components/demo/BuyerFeedbackCapture";
import { Button } from "@/components/ui/Button";
import { requirePermission } from "@/lib/authz/require-permission";

export default async function BuyerFeedbackPage() {
  await requirePermission("platform.internal_tools.access");

  return (
    <PageShell
      eyebrow="Validare cumpărător"
      title="Concluzii după demo"
      description="Transformă observațiile din conversație într-o evaluare explicabilă, un următor pas sigur și o listă scurtă de îmbunătățiri pentru următoarea demonstrație."
      actions={<Button href="/demo" variant="secondary"><ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />Înapoi la traseul demo</Button>}
    >
      <div className="grid gap-5">
        <section className="rounded-panel border border-[rgb(var(--gold-500)/0.3)] bg-[rgb(var(--gold-500)/0.06)] p-4 sm:p-5" aria-label="Limitele capturii de feedback">
          <div className="flex items-start gap-3">
            <LockClosedIcon className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />
            <div><p className="text-sm font-semibold">Notițe locale, pentru decizii mai bune după fiecare conversație.</p><p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">Informațiile rămân în acest browser și nu sunt trimise extern. Primul audit nu necesită acces complet la inbox, iar datele pot fi anonimizate. ReveNew nu promite venit sau randament garantat; valoarea estimată rămâne neconfirmată și acțiunile comerciale rămân sub control uman.</p></div>
          </div>
        </section>
        <BuyerFeedbackCapture />
      </div>
    </PageShell>
  );
}
