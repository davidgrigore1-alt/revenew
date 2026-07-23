import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ClockIcon,
  DocumentCheckIcon,
  EyeIcon,
  FlagIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";
import { FaqAccordion, type FaqCategory } from "@/components/marketing/FaqAccordion";
import { MarketingMetrics } from "@/components/marketing/MarketingMetrics";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { ProductPreview } from "@/components/marketing/ProductPreview";
import { OpportunityExecutionPreview, PortfolioSummaryPreview } from "@/components/marketing/ProductShowcases";
import { RevenueLeakMap } from "@/components/marketing/RevenueLeakMap";
import { Reveal } from "@/components/marketing/Reveal";
import { WhyReveNewComparison } from "@/components/marketing/WhyReveNewComparison";
import { Button } from "@/components/ui/Button";
import { authPath } from "@/lib/auth/redirects";
import { getReveNewAccessMode } from "@/lib/billing/paid-access";
import { commercialPricingPlans } from "@/lib/billing/plans";
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
  ["Responsabilitate neclară", "Echipa vede oportunitatea, dar nimeni nu răspunde explicit de următorul pas.", UserGroupIcon],
  ["Prioritate difuză", "Valoarea, riscul și vechimea nu sunt comparate într-un singur sistem.", FlagIcon],
  ["Vizibilitate incompletă", "Managementul află târziu unde s-a blocat execuția comercială.", EyeIcon]
] as const;

const steps = [
  ["01", "Detectezi", "Aduni semnalele comerciale care există deja."],
  ["02", "Prioritizezi", "Compari valoarea, riscul și informațiile lipsă."],
  ["03", "Atribui", "Stabilești responsabilul, termenul și următoarea acțiune."],
  ["04", "Urmărești", "Păstrezi deciziile și rezultatul auditabile."]
] as const;

const audiences = [
  ["Companii B2B", "Cicluri comerciale cu valoare relevantă per client și follow-up repetat.", BuildingOffice2Icon],
  ["Echipe comerciale", "Mai multe surse, contacte și propuneri care trebuie ordonate operațional.", UserGroupIcon],
  ["Responsabili și management", "Vizibilitate asupra valorii în risc, responsabililor și blocajelor curente.", EyeIcon],
  ["Consultanță și servicii", "Brief-uri, oferte și relații recurente care nu pot fi lăsate fără urmărire.", DocumentCheckIcon]
] as const;

const deliverables = [
  ["Control Center operațional", "Vezi într-un singur loc ce necesită intervenție astăzi și de ce."],
  ["Responsabil și acțiune următoare", "Fiecare oportunitate are responsabil, termen și pas următor explicit."],
  ["Prioritizare comercială", "Valoarea estimată, riscul și vechimea susțin ordinea de lucru."],
  ["Timeline și audit", "Schimbările, documentele, aprobările și rezultatele păstrează context."],
  ["Follow-up pregătit", "Echipa poate revizui și ajusta drafturile înainte de orice utilizare."],
  ["Raportare executivă", "Managementul primește un sumar clar, cu estimări separate de rezultatele confirmate."]
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
    <main className="min-h-screen overflow-x-clip bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <a href="#continut" className="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-button focus:bg-[rgb(var(--surface))] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold">Sari la conținut</a>
      <MarketingNav />

      <section id="continut" className="relative isolate border-b border-[rgb(var(--border))] bg-[radial-gradient(circle_at_80%_28%,rgb(var(--brand-100)/0.46),transparent_34%)] dark:bg-[radial-gradient(circle_at_80%_28%,rgb(var(--brand-900)/0.16),transparent_35%)]">
        <div aria-hidden="true" className="marketing-grid pointer-events-none absolute inset-0 -z-20 opacity-35" />
        <div aria-hidden="true" className="marketing-noise pointer-events-none absolute inset-0 -z-20 opacity-[0.07]" />
        <div aria-hidden="true" className="marketing-ambient pointer-events-none absolute left-[8%] top-24 -z-10 h-64 w-64 rounded-full bg-[rgb(var(--brand-300)/0.14)] blur-[110px] dark:bg-[rgb(var(--brand-700)/0.10)]" />
        <div className="mx-auto grid min-h-[calc(100svh-64px)] w-full max-w-[1280px] items-center gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-12 lg:px-8 xl:gap-16">
          <Reveal className="lg:col-span-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--brand-500)/0.42)] bg-[rgb(var(--brand-50)/0.78)] px-3.5 py-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[rgb(var(--brand-800))] shadow-card dark:bg-[rgb(var(--brand-950)/0.62)] dark:text-[rgb(var(--brand-300))]">
              <SparklesIcon className="h-4 w-4" aria-hidden="true" /> Revenue recovery · sub control uman
            </p>
            <h1 className="mt-7 max-w-[700px] text-[clamp(2.75rem,5.5vw,4.5rem)] font-semibold leading-[1.01] tracking-[-0.052em]">
              Venitul nu se pierde doar în pipeline. <span className="text-[rgb(var(--primary))]">Se pierde între acțiuni.</span>
            </h1>
            <p className="mt-6 max-w-[620px] text-base leading-7 text-[rgb(var(--text-secondary))] sm:text-lg sm:leading-8">
              ReveNew identifică oportunitățile comerciale rămase în urmă, clarifică responsabilitatea și transformă follow-up-ul într-un proces urmărit până la rezultat.
            </p>
            <p className="mt-4 max-w-[650px] text-sm font-semibold leading-6 text-[rgb(var(--foreground))]">ReveNew recomandă, iar echipa ta decide. Nu este recuperare de creanțe: urmărește oportunități comerciale, nu datorii.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="#preturi" size="large" className="group shadow-[0_16px_38px_rgb(var(--brand-700)/0.16)]">Solicită Revenue Recovery Audit <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Button>
              <Button href="#cum-functioneaza" variant="secondary" size="large">Vezi cum funcționează</Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-[rgb(var(--text-muted))]">
              {["Fără promisiuni de venit", "Fără outreach autonom", "Date izolate pe spațiu de lucru"].map((item) => <span key={item} className="inline-flex items-center gap-2"><CheckCircleIcon className="h-4 w-4 text-[rgb(var(--success-text))]" aria-hidden="true" />{item}</span>)}
            </div>
          </Reveal>
          <Reveal delay={120} className="pb-7 lg:col-span-6 lg:pb-0"><ProductPreview /></Reveal>
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
              <article className="marketing-card-lift flex h-full items-start gap-4 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-card">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-[rgb(var(--brand-50))] text-[rgb(var(--brand-800))] dark:bg-[rgb(var(--surface-muted))] dark:text-[rgb(var(--brand-300))]"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                <div><h3 className="font-semibold tracking-[-0.01em]">{title}</h3><p className="mt-1.5 text-xs leading-5 text-[rgb(var(--muted-foreground))]">{description}</p></div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="cum-functioneaza" className="scroll-mt-28 border-y border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
        <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <Reveal><SectionHeading eyebrow="Metoda ReveNew" title="Patru etape. Un fir operațional.">De la semnal la rezultat, fără rupturi de context.</SectionHeading></Reveal>
          <div className="relative mt-10 grid gap-4 lg:grid-cols-4">
            <div aria-hidden="true" className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-[linear-gradient(90deg,transparent,rgb(var(--brand-500)/0.55),transparent)] lg:block" />
            {steps.map(([number, title, description], index) => (
              <Reveal key={title} delay={index * 80}>
                <article className="relative h-full rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-card">
                  <span className="relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgb(var(--brand-500)/0.5)] bg-[rgb(var(--brand-950))] text-xs font-bold text-[rgb(var(--brand-300))]">{number}</span>
                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.025em]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

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
          <Reveal><SectionHeading eyebrow="Ce urmărește ReveNew" title="Valoare, responsabilitate și disciplină de execuție.">Un singur tablou pentru ce contează și ce blochează progresul.</SectionHeading></Reveal>
          <Reveal delay={90} className="mt-9"><MarketingMetrics /></Reveal>
        </div>
      </section>

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
              <article className={`marketing-card-lift flex h-full gap-4 rounded-panel border p-5 shadow-card ${index === 0 ? "border-[rgb(var(--brand-500)/0.42)] bg-[linear-gradient(135deg,rgb(var(--brand-50)),rgb(var(--surface)))] dark:bg-[linear-gradient(135deg,rgb(var(--brand-950)/0.5),rgb(var(--surface)))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface))]"}`}>
                <Icon className="h-6 w-6 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />
                <div><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1.5 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{description}</p></div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="ce-primesti" className="scroll-mt-28 border-y border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
          <Reveal>
            <SectionHeading eyebrow="Ce primești" title="Control operațional, nu încă un strat de raportare.">ReveNew conectează semnalul comercial, persoana responsabilă, următorul pas și rezultatul într-o imagine pe care echipa o poate folosi zilnic.</SectionHeading>
            <div className="mt-6 rounded-panel border border-[rgb(var(--brand-500)/0.4)] bg-[rgb(var(--brand-50))] p-4 dark:bg-[rgb(var(--brand-950)/0.55)]">
              <p className="text-sm font-semibold text-[rgb(var(--foreground))]">Principiul de bază</p>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted-foreground))]">Nicio valoare estimată nu este prezentată drept venit confirmat. Fiecare intervenție importantă păstrează context și control uman.</p>
            </div>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {deliverables.map(([title, description], index) => (
              <Reveal key={title} delay={index * 55} className={index === 0 || index === deliverables.length - 1 ? "sm:col-span-2" : ""}>
                <article className={`marketing-card-lift h-full rounded-card border p-4 ${index === 0 ? "border-[rgb(var(--brand-500)/0.46)] bg-[linear-gradient(110deg,rgb(var(--brand-50)),rgb(var(--surface-elevated))_76%)] shadow-elevated dark:bg-[linear-gradient(110deg,rgb(var(--brand-950)/0.55),rgb(var(--surface-elevated))_76%)] sm:p-5" : index === deliverables.length - 1 ? "border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] shadow-card"}`}>
                  <div className="flex items-start gap-3"><CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" /><div><h3 className={index === 0 ? "text-lg font-semibold" : "font-semibold"}>{title}</h3><p className="mt-1.5 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{description}</p></div></div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="portofoliu" className="scroll-mt-24 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
        <div className="mx-auto grid max-w-[1280px] items-center gap-9 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[0.68fr_1.32fr] lg:px-8">
          <Reveal>
            <SectionHeading eyebrow="Vizibilitate executivă" title="Separi estimarea de rezultatul confirmat.">Un portofoliu sănătos rămâne credibil când valoarea, progresul și intervențiile sunt explicate distinct.</SectionHeading>
          </Reveal>
          <Reveal delay={80}><PortfolioSummaryPreview /></Reveal>
        </div>
      </section>

      <section id="control" className="scroll-mt-28 relative isolate overflow-hidden border-y border-white/5 bg-[#292722] text-[#f4efe5] dark:bg-[rgb(var(--surface-subtle))]">
        <div aria-hidden="true" className="marketing-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.08]" />
        <div aria-hidden="true" className="absolute -right-32 top-12 -z-10 h-96 w-96 rounded-full bg-[rgb(var(--brand-500)/0.08)] blur-[120px]" />
        <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgb(var(--brand-300))]">Control și siguranță</p>
            <h2 className="mt-4 text-[clamp(2rem,4.7vw,3.5rem)] font-semibold leading-[1.08] tracking-[-0.035em]">Asistență pentru decizie. Nu autonomie riscantă.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#c9c0b1]">ReveNew pregătește context și drafturi. Utilizatorii autorizați verifică, aprobă și decid fiecare pas important.</p>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [ShieldCheckIcon, "Control uman", "Niciun mesaj comercial critic nu pleacă fără aprobarea permisă de flux."],
              [LockClosedIcon, "Izolare pe spațiu de lucru", "Datele și accesul urmează limitele existente ale companiei și rolului."],
              [DocumentCheckIcon, "Auditabilitate", "Schimbările și aprobările păstrează actorul, starea și momentul."],
              [MagnifyingGlassIcon, "Context verificabil", "Sursa, estimarea și motivul recomandării rămân vizibile."]
            ].map(([Icon, title, description], index) => {
              const ControlIcon = Icon as typeof ShieldCheckIcon;
              return <Reveal key={String(title)} delay={index * 70}><article className="h-full rounded-panel border border-white/[0.09] bg-white/[0.035] p-4"><ControlIcon className="h-5 w-5 text-[rgb(var(--brand-300))]" aria-hidden="true" /><h3 className="mt-4 text-base font-semibold">{String(title)}</h3><p className="mt-1.5 text-sm leading-6 text-[#bdb4a5]">{String(description)}</p></article></Reveal>;
            })}
          </div>
        </div>
      </section>

      <section id="preturi" className="scroll-mt-28 mx-auto max-w-[1280px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <Reveal className="grid items-end gap-6 lg:grid-cols-[0.8fr_1.2fr]"><SectionHeading eyebrow="Investiție clară" title="Începe cu intervenția potrivită." /><p className="max-w-2xl text-base leading-7 text-[rgb(var(--muted-foreground))] lg:justify-self-end">Fiecare opțiune clarifică ce include și ce urmează, fără garanții artificiale sau urgență inventată.</p></Reveal>
        {accessMode === "preview" ? <p className="mt-6 max-w-3xl rounded-card border border-[rgb(var(--brand-500)/0.32)] bg-[rgb(var(--brand-50))] p-3.5 text-sm leading-6 dark:bg-[rgb(var(--surface-muted))]">Mod de testare: selecția de mai jos nu creează o plată sau un abonament activ.</p> : null}
        <div className="mt-8 grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {commercialPricingPlans.map((plan, index) => {
            const featured = plan.title === "ReveNew Managed";
            const audit = plan.title === "Revenue Recovery Audit";
            const custom = plan.title === "Custom Implementation";
            return (
              <Reveal key={plan.title} delay={index * 80} className={custom ? "md:col-span-2 xl:col-span-1" : ""}>
                <article className={`marketing-card-lift relative flex h-full overflow-hidden rounded-[1.15rem] border p-5 shadow-card ${featured ? "border-[rgb(var(--brand-500)/0.48)] bg-[linear-gradient(180deg,rgb(var(--brand-50)),rgb(var(--surface))_38%)] dark:bg-[linear-gradient(180deg,rgb(var(--surface-muted)),rgb(var(--surface))_40%)]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface))]"}`}>
                  {featured ? <span className="absolute right-5 top-5 rounded-full bg-[rgb(var(--brand-950))] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[rgb(var(--brand-300))]">Operare continuă</span> : null}
                  <div className="flex w-full flex-col">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[rgb(var(--primary))]">{custom ? "Implementare enterprise" : plan.label}</p>
                    <h3 className="mt-4 pr-20 text-2xl font-semibold tracking-[-0.025em]">{custom ? "Implementare personalizată" : plan.title}</h3>
                    <div className="mt-5 border-y border-[rgb(var(--border))] py-4"><p className="text-4xl font-semibold tracking-[-0.035em]">{custom ? "Ofertă" : plan.price}</p><p className="mt-1.5 text-sm text-[rgb(var(--muted-foreground))]">{custom ? "în funcție de volum și complexitate" : plan.billing}</p></div>
                    <p className="mt-4 text-sm leading-6 text-[rgb(var(--muted-foreground))]">{plan.description}</p>
                    <ul className="mt-5 grid gap-2.5 text-sm text-[rgb(var(--text-secondary))]">
                      {plan.items.slice(0, 6).map((item) => <li key={item} className="flex gap-2.5"><CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary))]" aria-hidden="true" />{item}</li>)}
                    </ul>
                    <div className="mt-auto pt-6"><Button href={authPath("/signup", audit ? "audit" : "select_plan")} variant={featured ? "primary" : "secondary"} className="group w-full">{custom ? "Solicită o discuție" : plan.cta}<ArrowUpRightIcon className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /></Button></div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section id="intrebari" className="scroll-mt-28 border-y border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]">
        <div className="mx-auto max-w-[1120px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <Reveal className="grid items-end gap-5 lg:grid-cols-[0.82fr_1.18fr]"><SectionHeading eyebrow="Întrebări" title="Claritate înainte de prima decizie." /><p className="text-base leading-7 text-[rgb(var(--muted-foreground))]">Răspunsuri despre produs, date, control, activare și implementare.</p></Reveal>
          <Reveal delay={80} className="mt-9"><FaqAccordion categories={faqCategories} /></Reveal>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <Reveal className="relative mx-auto max-w-[1120px] overflow-hidden rounded-[1.5rem] border border-[rgb(var(--brand-400)/0.38)] bg-[rgb(var(--surface-elevated))] px-6 py-11 text-center text-[rgb(var(--foreground))] shadow-elevated sm:px-12 md:py-14">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgb(var(--brand-100)/0.72),transparent_54%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgb(var(--brand-900)/0.16),transparent_54%)]" />
          <div className="relative">
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
