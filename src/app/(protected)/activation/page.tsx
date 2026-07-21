import { ArrowRightIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { FirstTimeGuide } from "@/components/dashboard/FirstTimeGuide";
import { PageShell } from "@/components/dashboard/PageShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { getCommercialSignalsForCurrentBusiness } from "@/lib/commercial-inbox";
import { deriveFirstValueJourney } from "@/lib/first-value-journey";

export const dynamic = "force-dynamic";

export default async function ActivationPage({ searchParams }: { searchParams: { mode?: string } }) {
  const [current, inbox] = await Promise.all([
    getCurrentBusinessForUser({ redirectIfMissing: true }),
    getCommercialSignalsForCurrentBusiness()
  ]);
  const journey = deriveFirstValueJourney(inbox.signals);

  return (
    <PageShell
      eyebrow="Activare"
      title={journey.complete ? "Primul flux comercial este pregătit" : `Transformă primul semnal într-o decizie pentru ${current?.business.name ?? "workspace"}`}
      description="Începe cu o cerere, un follow-up ratat sau un lead rămas fără răspuns. ReveNew explică riscul și pregătește următorul pas, iar echipa păstrează controlul."
      actions={<Button href="/dashboard" variant="secondary">Deschide Control Center</Button>}
    >
      <div className="grid gap-6">
        <FirstTimeGuide journey={journey} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.55fr)]">
          <Card as="section" padding="default" aria-labelledby="activation-input-title">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]">Date de pornire</p>
            <h2 id="activation-input-title" className="mt-2 text-section-title font-semibold">Alege sursa reală pe care o ai acum</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--text-muted))]">
              Poți introduce un singur semnal manual sau importa mai multe înregistrări. Ambele variante ajung în același Inbox Comercial și necesită revizuire.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button href="/inbox?create=1">Adaugă primul semnal <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
              <Button href="/inbox/import" variant="secondary">Importă semnale comerciale</Button>
            </div>
            {searchParams.mode === "import" ? <p className="mt-4 text-xs leading-5 text-[rgb(var(--text-muted))]">Ai ales importul la configurare. Vei verifica maparea și previzualizarea înainte ca datele să fie scrise.</p> : null}
          </Card>

          <Card as="aside" variant="subtle" padding="default" aria-labelledby="activation-control-title">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-[rgb(var(--gold-700))] dark:text-[rgb(var(--gold-300))]" aria-hidden="true" />
              <h2 id="activation-control-title" className="font-semibold">Control uman, de la început</h2>
            </div>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">
              <li>• Faptele și recomandările sunt prezentate separat.</li>
              <li>• Valorile rămân estimări până la confirmarea unui rezultat.</li>
              <li>• Nicio comunicare externă nu este trimisă automat.</li>
            </ul>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
