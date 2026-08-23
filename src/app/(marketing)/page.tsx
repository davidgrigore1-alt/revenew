import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  ClockIcon,
  DocumentCheckIcon,
  EyeIcon,
  FlagIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";
import { FaqAccordion, type FaqCategory } from "@/components/marketing/FaqAccordion";
import { ControlledWorkflowSection, LandingStorySections } from "@/components/marketing/LandingStorySections";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingPricingGrid } from "@/components/marketing/MarketingPricingGrid";
import { ProductPreview } from "@/components/marketing/ProductPreview";
import { OpportunityExecutionPreview, PortfolioSummaryPreview } from "@/components/marketing/ProductShowcases";
import { RevenueLeakMap } from "@/components/marketing/RevenueLeakMap";
import { Reveal } from "@/components/marketing/Reveal";
import { WhyReveNewComparison } from "@/components/marketing/WhyReveNewComparison";
import { Button } from "@/components/ui/Button";
import { authPath } from "@/lib/auth/redirects";
import { getReveNewAccessMode } from "@/lib/billing/paid-access";
import { marketingSections } from "@/lib/marketing/navigation";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "ReveNew | Control pentru oportunitățile comerciale rămase în urmă",
  description: "ReveNew aduce responsabilitate, următoarea acțiune și vizibilitate executivă în procesele comerciale unde valoarea rămâne blocată.",
  alternates: { canonical: canonicalUrl("/") },
  openGraph: {
    title: "ReveNew | Revenue recovery sub control uman",
    description: "Identifică oportunitățile neglijate, prioritizează intervențiile și urmărește execuția până la un rezultat comercial clar.",
    url: canonicalUrl("/"),
    type: "website",
    locale: "ro_RO"
  },
  twitter: {
    card: "summary",
    title: "ReveNew | Revenue recovery sub control uman",
    description: "Un sistem operațional pentru responsabilitate, follow-up și oportunități comerciale recuperabile."
  }
};

const painPoints = [
  ["Follow-up întârziat", "O conversație relevantă rămâne fără revenire și fără un termen clar.", ClockIcon],
  ["Responsabil neclar", "Echipa vede oportunitatea, dar nimeni nu răspunde explicit de următorul pas.", UserGroupIcon],
  ["Ofertă fără decizie", "Documentul este pregătit, dar verificarea sau aprobarea rămâne deschisă.", FlagIcon],
  ["Cerere pierdută în zgomot", "Managementul află târziu unde s-a rupt continuitatea comercială.", EyeIcon]
] as const;



const audiences = [
  ["Companii B2B", "Cicluri comerciale cu valoare relevantă per client și follow-up repetat.", BuildingOffice2Icon],
  ["Echipe comerciale", "Mai multe surse, contacte și propuneri care trebuie ordonate operațional.", UserGroupIcon],
  ["Responsabili și management", "Vizibilitate asupra valorii în risc, responsabililor și blocajelor curente.", EyeIcon],
  ["Consultanță și servicii", "Brief-uri, oferte și relații recurente care nu pot fi lăsate fără urmărire.", DocumentCheckIcon]
] as const;

const faqCategories: FaqCategory[] = [
  {
    title: "Produs și control",
    items: [
      { question: "Este ReveNew un CRM?", answer: "ReveNew include oportunități, companii și contacte pentru a opera revenue recovery. Poate funcționa alături de CRM-ul existent și nu încearcă să înlocuiască fiecare funcție a unui CRM generalist." },
      { question: "Trimite ReveNew mesaje automat?", answer: "Nu fără aprobarea explicită permisă de fluxul existent. Drafturile și recomandările sunt revizuite de utilizatori autorizați, iar decizia comercială rămâne umană." }
    ]
  },
  {
    title: "Audit și implementare",
    items: [
      { question: "Ce date sunt necesare pentru audit?", answer: "Putem începe cu un set controlat de cereri, oferte, lead-uri sau exporturi existente. Sursele, perioada, accesul și regulile de confidențialitate sunt clarificate înainte de analiză." },
      { question: "Este necesară o integrare complexă?", answer: "Nu. Auditul poate începe cu importuri controlate. Integrările sunt evaluate separat numai când aduc valoare și pot fi implementate în siguranță." }
    ]
  },
  {
    title: "Acces și prețuri",
    items: [
      { question: "Ce se întâmplă după confirmarea planului?", answer: "Accesul este verificat, spațiul de lucru este configurat, iar sursele și responsabilitățile sunt stabilite înainte de operare." },
      { question: "Pot solicita o implementare personalizată?", answer: "Da. Fluxurile speciale, migrarea datelor, instruirea și integrările aprobate sunt evaluate și ofertate separat." }
    ]
  }
];

function SectionHeading({ eyebrow, title, children, centered = false }: { eyebrow?: string; title: string; children?: React.ReactNode; centered?: boolean }) {
  return (
    <div className={centered ? "mx-auto max-w-[760px] text-center" : "max-w-[760px]"}>
      {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgb(var(--primary))]">{eyebrow}</p> : null}
      <h2 className="mt-4 text-[clamp(2rem,4.7vw,3.5rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[rgb(var(--foreground))]">{title}</h2>
      {children ? <p className="mt-5 text-base leading-7 text-[rgb(var(--muted-foreground))] sm:text-lg sm:leading-8">{children}</p> : null}
    </div>
  );
}

export default function LandingPage() {
  const accessMode = getReveNewAccessMode();

  return (
    <main className="marketing-canvas min-h-screen overflow-x-clip bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <a href="#continut" className="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-button focus:bg-[rgb(var(--surface))] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold">Sari la conținut</a>
      <MarketingNav />

      <section id="continut" className="border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]">
        <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8">
          <div className="border-x border-[rgb(var(--border))] px-5 pb-10 pt-14 text-center sm:px-10 sm:pb-12 sm:pt-16 lg:px-14 lg:pb-14 lg:pt-20">
            <p className="mx-auto inline-flex w-fit items-center gap-2 rounded-pill border border-[rgb(var(--primary)/0.24)] bg-[rgb(var(--surface))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--text-secondary))]"><span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--primary))]" aria-hidden="true" />Sistem operațional pentru revenue recovery</p>
            <h1 className="mx-auto mt-6 max-w-[1050px] text-[clamp(3rem,6.2vw,5.8rem)] font-semibold leading-[0.91] tracking-[-0.066em]">
              Claritate pentru venitul rămas între pași.
            </h1>
            <p className="mx-auto mt-7 max-w-[760px] text-base leading-7 text-[rgb(var(--text-secondary))] sm:text-xl sm:leading-8">ReveNew aduce în același loc dovada, responsabilul și următoarea acțiune, înainte ca o oportunitate comercială să iasă din atenție.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button href="#preturi" size="large">Solicită un audit controlat <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button><Button href="#produs-in-actiune" variant="secondary" size="large">Explorează produsul</Button></div>
          </div>
          <div className="border-x border-b border-[rgb(var(--border))] px-2 pb-10 sm:px-5 sm:pb-14 lg:px-8 lg:pb-16"><ProductPreview /></div>
          <aside className="grid border-x border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-left md:grid-cols-3" aria-label="Principii ReveNew">
            {[
              ["Dovezi verificabile", "Nu este recuperare de creanțe: ReveNew urmărește oportunități comerciale, nu datorii."],
              ["Control uman", "ReveNew recomandă, iar echipa ta decide. O persoană verifică și aprobă."],
              ["Valori prudente", "Estimarea comercială rămâne distinctă de venitul confirmat."]
            ].map(([title, description], index) => <div key={title} className="border-b border-[rgb(var(--border))] p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"><p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">0{index + 1}</p><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-2 text-xs leading-5 text-[rgb(var(--text-muted))]">{description}</p></div>)}
          </aside>
        </div>
      </section>

      <section className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-9 gap-y-4 px-4 py-5 text-xs font-bold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))] sm:px-6 lg:px-8">
          {["Pentru echipe B2B", "Responsabilitate clară", "Follow-up disciplinat", "Auditabilitate", "Vizibilitate executivă"].map((item) => <span key={item} className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--brand-500))]" />{item}</span>)}
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="grid items-end gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <Reveal><SectionHeading eyebrow="Problema comercială" title="Oportunitățile se sting între două acțiuni.">Cererile, ofertele și reînnoirile rămân fără responsabil, termen sau pas următor.</SectionHeading></Reveal>
          <Reveal delay={60}><RevenueLeakMap /></Reveal>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {painPoints.map(([title, description, Icon], index) => (
            <Reveal key={title} delay={index * 70}>
              <article className="flex h-full items-start gap-4 border-t border-[rgb(var(--border))] py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-[rgb(var(--brand-50))] text-[rgb(var(--brand-800))]"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                <div><h3 className="font-semibold tracking-[-0.01em]">{title}</h3><p className="mt-1.5 text-xs leading-5 text-[rgb(var(--muted-foreground))]">{description}</p></div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <ControlledWorkflowSection id="cum-functioneaza" />

      <section id="produs-in-actiune" className="scroll-mt-24 border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]">
        <div className="mx-auto grid max-w-[1280px] items-center gap-9 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[0.68fr_1.32fr] lg:px-8">
          <Reveal>
            <SectionHeading eyebrow="Execuție în context" title="O oportunitate clară la fiecare decizie.">Valoarea, responsabilul, termenul și documentele rămân în același fir de lucru.</SectionHeading>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-[rgb(var(--text-muted))]">
              {[
                "Responsabil vizibil",
                "Acțiune următoare explicită",
                "Draft sub aprobare"
              ].map((item) => <span key={item} className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-1.5">{item}</span>)}
            </div>
          </Reveal>
          <Reveal delay={80}><OpportunityExecutionPreview /></Reveal>
        </div>
      </section>

      <section id="ce-urmareste" className="scroll-mt-24 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
        <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <Reveal><SectionHeading eyebrow="Ce urmărește ReveNew" title="Valoare, responsabilitate și disciplină de execuție.">Nu afișăm rezultate inventate. Produsul păstrează separat ceea ce este estimat, ceea ce cere decizie și ceea ce a fost confirmat.</SectionHeading></Reveal>
          <Reveal delay={90} className="mt-9">
            <div className="grid overflow-hidden rounded-panel border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] md:grid-cols-3">
              {[
                [EyeIcon, "Expunere estimată", "Ajută la prioritizare și rămâne distinctă de venitul confirmat."],
                [UserGroupIcon, "Responsabilitate", "Fiecare oportunitate importantă are un proprietar și un termen verificabil."],
                [DocumentCheckIcon, "Decizie auditată", "Recomandarea, aprobarea și rezultatul păstrează un traseu explicit."]
              ].map(([Icon, title, description], index) => {
                const LensIcon = Icon as typeof EyeIcon;
                return <article key={String(title)} className={`p-6 ${index < 2 ? "border-b border-[rgb(var(--border))] md:border-b-0 md:border-r" : ""}`}><LensIcon className="h-5 w-5 text-[rgb(var(--primary))]" aria-hidden="true" /><h3 className="mt-8 text-lg font-semibold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">{String(description)}</p></article>;
              })}
            </div>
          </Reveal>
        </div>
      </section>

      <LandingStorySections />

      <section id="de-ce-revenew" className="scroll-mt-24 border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]">
        <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <Reveal className="grid items-end gap-6 lg:grid-cols-[0.82fr_1.18fr]">
            <SectionHeading eyebrow="De ce ReveNew?" title="Nu doar înregistrezi pipeline-ul. Îl execuți." />
            <p className="max-w-2xl text-base leading-7 text-[rgb(var(--muted-foreground))] lg:justify-self-end">Un CRM păstrează contextul. ReveNew face vizibile ruptura, responsabilul și acțiunea care trebuie dusă mai departe.</p>
          </Reveal>
          <Reveal delay={80} className="mt-9"><WhyReveNewComparison /></Reveal>
        </div>
      </section>

      <section id="pentru-cine" className="scroll-mt-28 mx-auto grid max-w-[1280px] items-start gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[0.7fr_1.3fr] lg:px-8">
        <Reveal><SectionHeading eyebrow="Pentru cine" title="Pentru oportunități care merită urmărite, nu doar înregistrate.">Procese B2B unde valoarea per relație cere responsabilitate și follow-up consecvent.</SectionHeading></Reveal>
        <div className="grid gap-3 sm:grid-cols-2">
          {audiences.map(([title, description, Icon], index) => (
            <Reveal key={title} delay={index * 60}>
              <article className={`flex h-full gap-4 border-t py-5 ${index === 0 ? "border-[rgb(var(--brand-500)/0.42)] bg-[rgb(var(--surface))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface))]"}`}>
                <Icon className="h-6 w-6 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />
                <div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1.5 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{description}</p></div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="ce-primesti" className="scroll-mt-28 border-y border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
          <Reveal>
            <SectionHeading eyebrow="Inteligență operațională" title="O recomandare bună îți arată și de ce.">ReveNew ordonează riscurile din datele disponibile și păstrează traseul de la dovadă la acțiunea sigură.</SectionHeading>
            <div className="mt-6 rounded-panel border border-[rgb(var(--brand-500)/0.4)] bg-[rgb(var(--brand-50))] p-4">
              <p className="text-sm font-semibold text-[rgb(var(--foreground))]">Limita este vizibilă</p>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">Inteligența asistă decizia. Nu trimite mesaje, nu execută acțiuni externe și nu transformă estimările în venit confirmat.</p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <article className="ai-command-grid overflow-hidden rounded-[1.25rem] border border-[rgb(var(--brand-500)/0.34)] bg-[rgb(var(--surface-elevated))] p-5 shadow-elevated sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-4">
                <div><p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">Recomandare explicabilă</p><h3 className="mt-2 text-xl font-semibold">Follow-up întârziat</h3></div>
                <span className="rounded-pill border border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] px-3 py-1 text-xs font-semibold text-[rgb(var(--danger-text))]">Intervenție necesară</span>
              </div>
              <div className="ai-evidence-rail mt-5 grid gap-5 pl-5 sm:grid-cols-3">
                {[
                  ["Dovadă", "Termen depășit și ultima acțiune înregistrată."],
                  ["De ce contează", "Continuitatea comercială poate fi pierdută."],
                  ["Acțiune sigură", "Revizuiește oportunitatea înainte de orice trimitere."]
                ].map(([title, description]) => <div key={title}><p className="text-xs font-bold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">{title}</p><p className="mt-2 text-sm leading-6 text-[rgb(var(--text-secondary))]">{description}</p></div>)}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[rgb(var(--border))] pt-4">
                <p className="text-xs text-[rgb(var(--text-muted))]">Decizia finală și aprobarea rămân la echipă.</p>
                <Button href={authPath("/login", "login")} variant="secondary" size="small">Vezi produsul <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Button>
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      <section id="portofoliu" className="scroll-mt-24 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
        <div className="mx-auto grid max-w-[1280px] items-center gap-9 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[0.68fr_1.32fr] lg:px-8">
          <Reveal>
            <SectionHeading eyebrow="Audit controlat" title="Începi cu puține date. Decizi pe dovezi.">Primul audit poate folosi 20–50 de cazuri comerciale recente, inclusiv date anonimizate. Nu cere parole, acces complet la inbox sau conectarea Gmail ori Calendar.</SectionHeading>
            <div className="mt-6 grid gap-3">
              {[
                ["Audit de recuperare venituri", "Clarifică expunerea estimată și blocajele curente."],
                ["Pilot controlat · 14 zile", "Validează procesul, responsabilitățile și criteriile de succes."],
                ["Proof-of-value", "Susține o decizie prudentă: continuă, ajustează sau oprește."]
              ].map(([title, description], index) => <div key={title} className="flex gap-3 border-t border-[rgb(var(--border))] pt-3"><span className="text-xs font-bold text-[rgb(var(--primary))]">0{index + 1}</span><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-[rgb(var(--text-muted))]">{description}</p></div></div>)}
            </div>
          </Reveal>
          <Reveal delay={80}><PortfolioSummaryPreview /></Reveal>
        </div>
      </section>

      <section id="control" className="scroll-mt-28 border-y border-slate-800 bg-slate-950 text-slate-50">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Control și siguranță</p>
            <h2 className="mt-4 text-[clamp(2rem,4.7vw,3.5rem)] font-semibold leading-[1.08] tracking-[-0.035em]">Asistență pentru decizie. Nu autonomie riscantă.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-400">ReveNew pregătește context și drafturi. Utilizatorii autorizați verifică, aprobă și decid fiecare pas important.</p>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [ShieldCheckIcon, "Control uman", "Niciun mesaj comercial critic nu pleacă fără aprobarea permisă de flux."],
              [LockClosedIcon, "Izolare pe spațiu de lucru", "Datele și accesul urmează limitele existente ale companiei și rolului."],
              [DocumentCheckIcon, "Auditabilitate", "Schimbările și aprobările păstrează actorul, starea și momentul."],
              [MagnifyingGlassIcon, "Context verificabil", "Sursa, estimarea și motivul recomandării rămân vizibile."]
            ].map(([Icon, title, description], index) => {
              const ControlIcon = Icon as typeof ShieldCheckIcon;
              return <Reveal key={String(title)} delay={index * 70}><article className="h-full border-t border-white/10 py-4"><ControlIcon className="h-5 w-5 text-teal-300" aria-hidden="true" /><h3 className="mt-4 text-base font-semibold">{String(title)}</h3><p className="mt-1.5 text-sm leading-6 text-slate-400">{String(description)}</p></article></Reveal>;
            })}
          </div>
        </div>
      </section>

      <section id="preturi" className="scroll-mt-28 mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <Reveal className="grid items-end gap-6 lg:grid-cols-[0.8fr_1.2fr]"><SectionHeading eyebrow="Investiție clară" title="Începe cu intervenția potrivită." /><p className="max-w-2xl text-base leading-7 text-[rgb(var(--muted-foreground))] lg:justify-self-end">Fiecare opțiune clarifică ce include și ce urmează, fără garanții artificiale sau urgență inventată.</p></Reveal>
        {accessMode === "preview" ? <p className="mt-6 max-w-3xl rounded-card border border-[rgb(var(--brand-500)/0.32)] bg-[rgb(var(--brand-50))] p-3.5 text-sm leading-6">Mod de testare: selecția de mai jos nu creează o plată sau un abonament activ.</p> : null}
        <MarketingPricingGrid />
      </section>

      <section id="intrebari" className="scroll-mt-28 border-y border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
        <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <Reveal className="grid items-end gap-5 lg:grid-cols-[0.82fr_1.18fr]"><SectionHeading eyebrow="Întrebări" title="Claritate înainte de prima decizie." /><p className="text-base leading-7 text-[rgb(var(--muted-foreground))]">Răspunsuri despre produs, date, control, activare și implementare.</p></Reveal>
          <Reveal delay={80} className="mt-9"><FaqAccordion categories={faqCategories} /></Reveal>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <Reveal className="mx-auto max-w-[1120px] overflow-hidden border-y border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-6 py-11 text-center text-[rgb(var(--foreground))] sm:px-12 md:py-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgb(var(--primary))]">Înainte să iasă din atenție</p>
            <h2 className="mx-auto mt-4 max-w-4xl text-[clamp(2.1rem,4.6vw,3.8rem)] font-semibold leading-[1.04] tracking-[-0.045em]">Vezi unde se blochează venitul. Clarifică următoarea acțiune.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[rgb(var(--text-secondary))]">Începe cu oportunitățile existente și construiește un proces verificabil de responsabilitate, follow-up și decizie.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button href="#preturi" size="large">Solicită auditul</Button><Button href={authPath("/login", "login")} variant="secondary" size="large">Intră în cont</Button></div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-12 text-sm text-[rgb(var(--muted-foreground))] sm:px-6 md:grid-cols-[1.25fr_0.75fr_0.75fr] lg:px-8">
          <div><p className="text-2xl font-semibold tracking-[-0.03em] text-[rgb(var(--foreground))]">ReveNew</p><p className="mt-3 max-w-md leading-6">Control operațional pentru oportunitățile comerciale care rămân între procese, responsabilitate și follow-up.</p><p className="mt-6 text-xs">© {new Date().getFullYear()} ReveNew.</p></div>
          <nav className="grid content-start gap-3" aria-label="Navigare footer"><p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[rgb(var(--foreground))]">Produs</p>{marketingSections.map((item) => <a key={item.id} href={item.href} className="focus-ring w-fit rounded hover:text-[rgb(var(--foreground))]">{item.label}</a>)}</nav>
          <nav className="grid content-start gap-3" aria-label="Linkuri utile"><p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[rgb(var(--foreground))]">Acces și legal</p><Link href={authPath("/login", "login")} className="hover:text-[rgb(var(--foreground))]">Intră în cont</Link><Link href="/ghid" className="hover:text-[rgb(var(--foreground))]">Ghid</Link><Link href="/privacy" className="hover:text-[rgb(var(--foreground))]">Confidențialitate</Link><Link href="/terms" className="hover:text-[rgb(var(--foreground))]">Termeni</Link></nav>
        </div>
      </footer>
    </main>
  );
}
