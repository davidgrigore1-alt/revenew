import { Button } from "@/components/ui/Button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { ProductPreview } from "@/components/marketing/ProductPreview";

const impact = [
  ["Recuperează lead-uri pierdute", "Adună cereri din inbox, formulare, apeluri, WhatsApp și liste vechi într-un Inbox Comercial."],
  ["Prioritizează banii", "Transformă semnalele importante în oportunități cu valoare estimată, urgență și următorul pas."],
  ["Urmărește follow-up-ul", "Pregătește email, ofertă, apel sau follow-up ca echipa să nu piardă oportunități calde."]
];

const steps = [
  ["1", "Configurezi firma", "Adaugi serviciile, clienții ideali, locațiile și valoarea medie a contractelor."],
  ["2", "Introduci sau imporți oportunități", "Poți începe manual cu un lead, o licitație, un client vechi sau o notiță comercială."],
  ["3", "Primești scoruri și acțiuni", "Vezi Fit, Urgență, Bani, Încredere și următorul pas recomandat."],
  ["4", "Urmărești follow-up-ul", "Păstrezi oportunitatea în pipeline până când devine câștigată, pierdută sau ignorată."]
];

const audiences = ["rent-a-car", "service-uri auto", "constructii", "logistica", "curatenie", "paza", "IT services", "agentii B2B"];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <MarketingNav />
      <section className="subtle-grid mx-auto grid min-h-[calc(100vh-92px)] w-full max-w-7xl items-center gap-12 px-5 py-12 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-mint-400/20 bg-mint-400/10 px-4 py-2 text-sm font-medium text-mint-400">
            Revenue Recovery System pentru firme
          </p>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            MoneyHunter AI
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-zinc-300">
            Sistem AI care găsește și recuperează oportunitățile comerciale pierdute din inbox, formulare, apeluri si conversatii.
          </p>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
            Găsim lead-urile pierdute și îți arătăm zilnic pe cine trebuie să contactezi ca să faci bani.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/signup">Creează cont</Button>
            <Button href="/dashboard" variant="secondary">
              Vezi dashboard demo
            </Button>
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-500">
            Creat pentru firme care vand B2B: servicii auto, constructii, curatenie, paza, logistica, IT services si agentii.
          </p>
        </div>
        <ProductPreview />
      </section>

      <section id="platforma" className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {impact.map(([title, description]) => (
            <article key={title} className="rounded-xl border border-white/10 bg-white/[0.045] p-6">
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-10 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mint-400">Ce problema rezolva?</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Nu pierde bani din lead-uri neurmarite</h2>
        </div>
        <p className="text-base leading-8 text-zinc-300">
          Majoritatea firmelor nu pierd bani pentru că nu au cereri. Pierd bani pentru că nu răspund la timp, nu urmăresc lead-urile și nu știu ce oportunități merită prioritate. MoneyHunter AI centralizeaza aceste semnale si le transformă în acțiuni comerciale clare.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mint-400">Inbox comercial</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">De la cereri pierdute la oportunități urmărite</h2>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.045] p-6">
          <p className="text-base leading-8 text-zinc-300">
            Firmele primesc cereri din multe locuri: email, telefon, formulare, recomandări sau liste de prospecți. MoneyHunter AI le centralizează într-un Inbox Comercial, le transformă în oportunități și pregătește următoarea acțiune.
          </p>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            In MVP, introducerea semnalelor comerciale este manuala. Integrarile cu email, telefonie, formulare sau importuri pot fi adaugate progresiv, fara promisiuni despre automatizari care nu sunt active încă.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-mint-400">Cum functioneaza?</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Patru pasi simpli pana la un pipeline comercial.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map(([number, title, description]) => (
            <article key={title} className="rounded-xl border border-white/10 bg-white/[0.045] p-5">
              <span className="inline-flex size-8 items-center justify-center rounded-lg border border-mint-400/20 bg-mint-400/10 text-sm font-semibold text-mint-400">
                {number}
              </span>
              <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <article className="rounded-xl border border-white/10 bg-white/[0.045] p-6">
          <h2 className="text-xl font-semibold text-white">Pentru cine este?</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {audiences.map((item) => (
              <span key={item} className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-zinc-300">
                {item}
              </span>
            ))}
          </div>
        </article>
        <article className="rounded-xl border border-white/10 bg-white/[0.045] p-6">
          <h2 className="text-xl font-semibold text-white">Ce primeste echipa?</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-300">
            Oportunități prioritizate, documente comerciale pregatite pentru revizuire, follow-up-uri urmarite si rapoarte clare pentru decizii saptamanale.
          </p>
        </article>
      </section>
    </main>
  );
}
