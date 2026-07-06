import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  EyeIcon,
  PhoneArrowUpRightIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";
import { FaqAccordion, type FaqCategory } from "@/components/marketing/FaqAccordion";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { ProductPreview } from "@/components/marketing/ProductPreview";
import { Button } from "@/components/ui/Button";
import { authPath } from "@/lib/auth/redirects";
import { getReveNewAccessMode } from "@/lib/billing/paid-access";
import { commercialPricingPlans } from "@/lib/billing/plans";
import { marketingSections } from "@/lib/marketing/navigation";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "ReveNew | Identifică oportunitățile comerciale rămase în urmă",
  description: "ReveNew identifică cererile fără răspuns, ofertele neurmărite și lead-urile care merită reluate. Începe cu un audit comercial de 7 zile.",
  alternates: { canonical: canonicalUrl("/") },
  openGraph: {
    title: "ReveNew | Identifică oportunitățile comerciale rămase în urmă",
    description: "Revenue Recovery pentru firme B2B: audit comercial, prioritizare și acțiuni pregătite pentru revizuirea echipei.",
    url: canonicalUrl("/"),
    type: "website",
    locale: "ro_RO"
  },
  twitter: {
    card: "summary",
    title: "ReveNew | Identifică oportunitățile comerciale rămase în urmă",
    description: "Identifică cereri fără răspuns, oferte neurmărite și lead-uri care merită reluate."
  }
};

const fitPoints = [
  "cereri din email, formulare, telefon sau alte surse",
  "valoare relevantă per client sau contract",
  "proces comercial în care viteza și follow-up-ul contează"
];

const industries = ["Auto și mobilitate", "Construcții", "Logistică", "Servicii B2B", "Agenții"];

const steps = [
  ["01", "Colectăm semnalele comerciale", "Pornim de la sursele disponibile: emailuri relevante, formulare, lead-uri vechi, oferte, note comerciale sau importuri controlate."],
  ["02", "Identificăm ce merită reluat", "Separăm semnalele relevante de zgomot și evidențiem motivul, urgența, valoarea estimată și informațiile care lipsesc."],
  ["03", "Pregătim următoarea acțiune", "ReveNew propune follow-up-ul, mesajul, apelul sau clarificarea necesară înainte ca echipa să continue."],
  ["04", "Urmărim rezultatul", "Echipa marchează ce a fost contactat, ofertat, câștigat sau pierdut, iar istoricul rămâne disponibil pentru raportare."]
];

const audiences = [
  ["Auto și mobilitate", "Rent-a-car, administrare flote, vehicule de înlocuire, dealeri și service-uri auto.", "Cereri pentru mai multe vehicule, servicii recurente, flote temporare și clienți care trebuie contactați rapid."],
  ["Construcții și servicii tehnice", "Echipe care primesc solicitări de ofertă și lucrează cu mai mulți decidenți.", "Solicitări de ofertă, proiecte cu mai mulți decidenți și negocieri care necesită reveniri periodice."],
  ["Logistică și servicii operaționale", "Companii cu cereri din canale multiple și contracte recurente.", "Oportunități care pot rămâne blocate între echipe, inboxuri sau surse comerciale."],
  ["Servicii profesionale și agenții", "Firme care primesc brief-uri, cereri recurente și propuneri comerciale.", "Lead-uri care necesită calificare, context și revenire înainte de ofertare."]
];

const deliverables = [
  ["Valoare comercială estimată", "O estimare separată de venitul confirmat, bazată pe contextul cererii, serviciile firmei și informațiile disponibile."],
  ["Mesaje de follow-up pregătite", "Texte adaptate contextului comercial, care pot fi revizuite și modificate de echipă înainte de utilizare."],
  ["Scripturi de apel", "Structuri scurte pentru reluarea conversației și clarificarea informațiilor care lipsesc."],
  ["Acțiuni prioritare", "O listă cu ce trebuie făcut, de ce contează și ce termen este relevant."],
  ["Raport executiv", "Rezumatul oportunităților identificate, acțiunilor realizate, rezultatelor și pașilor recomandați."],
  ["Recomandări de proces", "Observații despre timpul de răspuns, follow-up, sursele comerciale și punctele în care cererile se pierd."]
];

const faqCategories: FaqCategory[] = [
  {
    title: "Produs și control",
    items: [
      {
        question: "Ce este ReveNew și ce nu este?",
        answer: "ReveNew este un sistem de recuperare comercială construit peste semnalele pe care firma le are deja: cereri, formulare, oferte, lead-uri și conversații care necesită follow-up. Sistemul ajută echipa să identifice ce merită reluat, ce acțiune este recomandată și ce rezultat a urmat. Nu înlocuiește obligatoriu CRM-ul și nu este un instrument de trimitere în masă."
      },
      {
        question: "Trimite ReveNew mesaje automat?",
        answer: "ReveNew poate pregăti un follow-up, un email, o structură de ofertă sau un script de apel, însă echipa clientului păstrează controlul asupra revizuirii, modificării și utilizării. Orice automatizare viitoare trebuie activată doar pe baza unei integrări reale și a unor permisiuni clare."
      },
      {
        question: "Cum este calculată valoarea estimată?",
        answer: "Valoarea estimată folosește informațiile disponibile despre cerere, serviciul solicitat, valoarea medie a contractelor și contextul comercial al firmei. Estimarea are rol de prioritizare, nu de promisiune comercială."
      },
      {
        question: "Valoarea estimată este venit garantat?",
        answer: "Nu. O oportunitate identificată poate fi relevantă comercial fără să se transforme automat într-un contract. ReveNew separă valoarea estimată de venitul confirmat."
      }
    ]
  },
  {
    title: "Audit și implementare",
    items: [
      {
        question: "Ce date sunt necesare pentru audit?",
        answer: "Auditul poate începe cu informațiile comerciale deja disponibile: emailuri relevante, formulare, lead-uri vechi, oferte neurmărite, note comerciale sau exporturi din sistemele existente. Înainte de analiză sunt stabilite sursele, perioada, persoanele autorizate și regulile de confidențialitate."
      },
      {
        question: "Trebuie conectate toate sistemele firmei?",
        answer: "Nu. Auditul inițial poate începe cu un set limitat de date sau cu un import controlat. Integrările complete sunt justificate numai după clarificarea valorii, accesului, securității, costului și responsabilităților."
      },
      {
        question: "Ce se întâmplă în cele 7 zile de audit?",
        answer: "Sunt definite sursele și contextul comercial, sunt analizate cererile disponibile, sunt identificate oportunitățile care necesită atenție, este estimată valoarea și sunt pregătite acțiunile."
      },
      {
        question: "Ce se întâmplă după audit?",
        answer: "Auditul oferă firmei informațiile necesare pentru a decide dacă merită continuarea. Clientul poate implementa intern recomandările, poate solicita o etapă suplimentară sau poate continua cu ReveNew Managed."
      }
    ]
  },
  {
    title: "Acces și prețuri",
    items: [
      {
        question: "Cine poate folosi ReveNew în perioada de testare?",
        answer: "În perioada de testare, accesul poate fi acordat firmelor și utilizatorilor acceptați în programul pilot. Funcțiile disponibile pot fi limitate sau ajustate pe măsură ce fluxurile sunt validate."
      },
      {
        question: "Auditul comercial este gratuit?",
        answer: "Nu în oferta comercială planificată. Auditul Revenue Recovery include analiză, livrabile și timp operațional și este afișat la prețul de 490 EUR. În perioada pilot pot exista condiții speciale pentru firme selectate."
      },
      {
        question: "Este necesară plata în versiunea comercială?",
        answer: "Da. Accesul comercial și serviciile recurente vor utiliza planurile și condițiile contractuale afișate sau stabilite prin ofertă."
      }
    ]
  }
];

function SectionHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-[760px]">
      {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">{eyebrow}</p> : null}
      <h2 className="mt-3 text-[clamp(2rem,4vw,2.875rem)] font-semibold leading-tight tracking-normal text-[rgb(var(--foreground))]">{title}</h2>
      {children ? <p className="mt-4 text-base leading-7 text-[rgb(var(--muted-foreground))]">{children}</p> : null}
    </div>
  );
}

export default function LandingPage() {
  const accessMode = getReveNewAccessMode();

  return (
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <a href="#continut" className="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[rgb(var(--surface))] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold">
        Sari la conținut
      </a>
      <MarketingNav />

      <section id="continut" className="mx-auto grid w-full max-w-[1220px] gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-12 lg:px-8">
        <div className="self-center lg:col-span-6">
          <p className="inline-flex rounded-full border border-[rgb(var(--primary)_/_0.25)] bg-[rgb(var(--primary)_/_0.1)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
            Recuperare comercială B2B
          </p>
          <h1 className="mt-6 max-w-3xl text-[clamp(2.625rem,6vw,4.5rem)] font-semibold leading-[1.06] tracking-normal">
            Înainte să cauți lead-uri noi, vezi ce oportunități ai lăsat în urmă.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[rgb(var(--muted-foreground))]">
            ReveNew identifică cererile fără răspuns, ofertele neurmărite și lead-urile care merită reluate. Echipa primește priorități clare, mesaje pregătite și următorii pași comerciali.
          </p>
          <p className="mt-4 max-w-2xl text-sm font-semibold text-[rgb(var(--foreground))]">
            Recomandările și mesajele sunt revizuite de echipa ta înainte de utilizare.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="#preturi">Solicită auditul</Button>
            <Button href="#cum-functioneaza" variant="secondary">Vezi cum funcționează</Button>
          </div>
        </div>
        <div className="lg:col-span-6">
          <ProductPreview />
        </div>
      </section>

      <section className="border-y border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div className="mx-auto grid max-w-[1220px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <h2 className="max-w-3xl text-2xl font-semibold leading-tight">Construit pentru firme în care o cerere pierdută are valoare reală.</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[rgb(var(--muted-foreground))]">
              ReveNew este util atunci când firma primește cereri din mai multe surse, pregătește oferte și are nevoie de follow-up constant pentru a transforma interesul într-un rezultat comercial.
            </p>
          </div>
          <div className="grid gap-3">
            {fitPoints.map((point) => (
              <p key={point} className="flex gap-3 text-sm font-semibold text-[rgb(var(--foreground))]">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />
                {point}
              </p>
            ))}
            <div className="mt-2 flex flex-wrap gap-2">
              {industries.map((item) => <span key={item} className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-xs font-semibold text-[rgb(var(--muted-foreground))]">{item}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section id="cum-functioneaza" className="scroll-mt-28 bg-[rgb(var(--surface-subtle))]">
        <div className="mx-auto max-w-[1220px] px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <SectionHeading eyebrow="Fluxul ReveNew" title="De la cerere uitată la acțiune comercială clară." />
          <div className="mt-12 grid gap-4 lg:grid-cols-4">
            {steps.map(([number, title, description]) => (
              <article key={title} className="relative rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[rgb(var(--primary)_/_0.12)] text-sm font-semibold text-[rgb(var(--primary))]">{number}</span>
                <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pentru-cine" className="scroll-mt-28 mx-auto max-w-[1220px] px-4 py-20 sm:px-6 md:py-28 lg:px-8">
        <SectionHeading title="Pentru firme care primesc cereri, trimit oferte și trebuie să revină la timp.">
          ReveNew este relevant în procese comerciale cu valoare semnificativă per client, mai multe surse de lead-uri și follow-up care nu poate fi lăsat la întâmplare.
        </SectionHeading>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {audiences.map(([title, relevant, description]) => (
            <article key={title} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6">
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm font-semibold text-[rgb(var(--foreground))]">{relevant}</p>
              <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{description}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 grid gap-6 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-6 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <h3 className="text-xl font-semibold">ReveNew este potrivit dacă:</h3>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-[rgb(var(--muted-foreground))] sm:grid-cols-2">
              {["primești constant cereri comerciale", "valoarea unui client justifică un proces de follow-up", "echipa nu are vizibilitate completă asupra conversațiilor", "vrei acțiuni și rezultate urmărite, nu doar încă un dashboard"].map((item) => (
                <li key={item} className="flex gap-2"><CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />{item}</li>
              ))}
            </ul>
          </div>
          <p className="self-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 text-sm leading-6 text-[rgb(var(--muted-foreground))]">
            Nu este destinat campaniilor de email în masă sau vânzărilor complet automate.
          </p>
        </div>
      </section>

      <section id="ce-primesti" className="scroll-mt-28 bg-[rgb(var(--surface))]">
        <div className="mx-auto max-w-[1220px] px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <SectionHeading eyebrow="Ce primești" title="Nu primești doar un dashboard. Primești un proces de recuperare.">
            Auditul transformă informațiile comerciale existente într-o listă ordonată de oportunități, acțiuni și rezultate care pot fi urmărite.
          </SectionHeading>
          <div className="mt-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="rounded-2xl border border-[rgb(var(--primary)_/_0.24)] bg-[rgb(var(--primary)_/_0.07)] p-6">
              <DocumentTextIcon className="h-10 w-10 text-[rgb(var(--primary))]" aria-hidden="true" />
              <h3 className="mt-5 text-2xl font-semibold">O listă prioritizată cu oportunitățile care merită reluate</h3>
              <p className="mt-4 text-sm leading-7 text-[rgb(var(--muted-foreground))]">
                Vezi ce cereri au rămas fără răspuns, ce oferte nu au primit follow-up, de când sunt inactive și de ce merită analizate din nou.
              </p>
              <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                {["companie sau contact", "sursă", "vechime", "motivul detectării", "valoare estimată", "nivel de încredere", "acțiunea recomandată", "statusul echipei"].map((item) => (
                  <div key={item} className="rounded-lg bg-[rgb(var(--surface))] px-3 py-2">
                    <dt className="font-semibold text-[rgb(var(--foreground))]">{item}</dt>
                    <dd className="text-xs text-[rgb(var(--muted-foreground))]">Exemplu schematic</dd>
                  </div>
                ))}
              </dl>
            </article>
            <div className="grid gap-4 sm:grid-cols-2">
              {deliverables.map(([title, description]) => (
                <article key={title} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-5">
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[rgb(var(--surface-subtle))]">
        <div className="mx-auto grid max-w-[1220px] gap-10 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <SectionHeading title="ReveNew pregătește următorul pas. Echipa ta păstrează controlul.">
            Sursa, data, contextul și istoricul fiecărei recomandări rămân vizibile. Echipa verifică, modifică și aprobă acțiunea înainte de utilizare.
          </SectionHeading>
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6 shadow-[var(--shadow-card)]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">Exemplu de flux</p>
            <div className="mt-5 grid gap-3 text-sm font-semibold md:grid-cols-5">
              {["Semnal comercial", "Oportunitate evaluată", "Acțiune pregătită", "Aprobare umană", "Rezultat urmărit"].map((item) => (
                <div key={item} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-3 text-center">{item}</div>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--background))] p-5">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ["Sursă", "Formular website"],
                  ["Motiv", "Cerere fără răspuns"],
                  ["Acțiune", "Pregătește follow-up"],
                  ["Status", "Așteaptă revizuirea echipei"]
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted-foreground))]">{label}</dt>
                    <dd className="mt-1 font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[rgb(var(--muted-foreground))]" aria-label="Controale ilustrative, neinteractive">
                {["Revizuiește", "Aprobă", "Marchează contactat"].map((item) => <span key={item} className="rounded-lg border border-[rgb(var(--border))] px-3 py-2">{item}</span>)}
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Sursa rămâne vizibilă", "Poți verifica mesajul sau cererea care a generat recomandarea."],
                ["Estimarea este marcată corect", "Valoarea estimată este separată de venitul confirmat."],
                ["Echipa controlează utilizarea", "Mesajele sunt pregătite pentru revizuire și utilizare de către echipă."]
              ].map(([title, text]) => (
                <div key={title} className="rounded-xl bg-[rgb(var(--surface-elevated))] p-4">
                  <p className="font-semibold">{title}</p>
                  <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted-foreground))]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="preturi" className="scroll-mt-28 mx-auto max-w-[1220px] px-4 py-20 sm:px-6 md:py-28 lg:px-8">
        <SectionHeading title="Începe cu un audit. Continuă doar dacă există valoare.">
          Prețurile reflectă analiza, prioritizarea, documentele pregătite și volumul operațional, nu un număr artificial de funcții.
        </SectionHeading>
        {accessMode === "preview" ? (
          <p className="mt-6 max-w-3xl rounded-xl border border-[rgb(var(--primary)_/_0.25)] bg-[rgb(var(--primary)_/_0.08)] p-4 text-sm leading-6 text-[rgb(var(--foreground))]">
            Platforma este disponibilă gratuit în perioada de testare. Valorile de mai jos reprezintă oferta comercială planificată.
          </p>
        ) : null}
        <div className="mt-8 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {commercialPricingPlans.map((plan) => (
            <article key={plan.title} className="flex h-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-6">
              <div className="flex w-full flex-col">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--primary))]">{plan.label}</p>
                <h3 className="mt-3 min-h-14 text-2xl font-semibold">{plan.title}</h3>
                <div className="mt-4 min-h-20">
                  <p className="text-4xl font-semibold">{plan.price}</p>
                  <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">{plan.billing}</p>
                </div>
                <p className="mt-4 min-h-20 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{plan.description}</p>
                <ul className="mt-5 grid gap-2 text-sm text-[rgb(var(--muted-foreground))]">
                  {plan.items.map((item) => <li key={item} className="flex gap-2"><CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />{item}</li>)}
                </ul>
                <div className="mt-auto pt-6">
                  <Button href={authPath("/signup", plan.title === "Audit Revenue Recovery" ? "audit" : "select_plan")} className="w-full">{plan.cta}</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="intrebari" className="scroll-mt-28 bg-[rgb(var(--surface))]">
        <div className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <SectionHeading eyebrow="Întrebări" title="Întrebări importante înainte să începi.">
            Răspunsuri clare despre proces, acces, date, rezultate și costuri.
          </SectionHeading>
          <div className="mt-12">
            <FaqAccordion categories={faqCategories} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[980px] px-4 py-20 text-center sm:px-6 md:py-24 lg:px-8">
        <EyeIcon className="mx-auto h-10 w-10 text-[rgb(var(--primary))]" aria-hidden="true" />
        <h2 className="mt-5 text-[clamp(2rem,4vw,2.875rem)] font-semibold leading-tight tracking-normal">Află ce oportunități merită reluate înainte să investești într-un proces mai mare.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[rgb(var(--muted-foreground))]">
          Începem cu datele disponibile, livrăm o listă clară de oportunități și stabilim împreună dacă există suficientă valoare pentru a continua.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button href="#preturi">Solicită auditul</Button>
          <Button href={authPath("/login", "login")} variant="secondary">Intră în cont</Button>
        </div>
      </section>

      <footer className="border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
        <div className="mx-auto grid max-w-[1220px] gap-8 px-4 py-10 text-sm text-[rgb(var(--muted-foreground))] sm:px-6 md:grid-cols-[1fr_auto_auto] lg:px-8">
          <div>
            <p className="text-lg font-semibold text-[rgb(var(--foreground))]">ReveNew</p>
            <p className="mt-2 max-w-sm">Sistem pentru identificarea și urmărirea oportunităților comerciale rămase în urmă.</p>
            <p className="mt-4">© {new Date().getFullYear()} ReveNew.</p>
          </div>
          <nav className="grid gap-2" aria-label="Navigare footer">
            {marketingSections.map((item) => <a key={item.id} href={item.href} className="hover:text-[rgb(var(--foreground))]">{item.label}</a>)}
          </nav>
          <nav className="grid gap-2" aria-label="Linkuri utile">
            <Link href={authPath("/login", "login")} className="hover:text-[rgb(var(--foreground))]">Login</Link>
            <Link href="/ghid" className="hover:text-[rgb(var(--foreground))]">Ghid</Link>
            <Link href="/privacy" className="hover:text-[rgb(var(--foreground))]">Privacy</Link>
            <Link href="/terms" className="hover:text-[rgb(var(--foreground))]">Terms</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
