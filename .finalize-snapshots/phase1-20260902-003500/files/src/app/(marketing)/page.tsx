import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

import { FaqAccordion, type FaqCategory } from "@/components/marketing/FaqAccordion";
import {
  AudienceCases,
  ControlCenterStage,
  DecisionTheater,
  ExecutiveCommercialDiagnostic,
  GovernanceConsole,
  HeroProductStage,
  IntegrationEcosystem,
  OperationalDiagnostic,
  RelationshipContext,
  WorkflowBuilderStage
} from "@/components/marketing/LandingV3Visuals";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingPricingGrid } from "@/components/marketing/MarketingPricingGrid";
import { ProductPreview } from "@/components/marketing/ProductPreview";
import { PortfolioSummaryPreview } from "@/components/marketing/ProductShowcases";
import { Reveal } from "@/components/marketing/Reveal";
import { Button } from "@/components/ui/Button";
import { authPath } from "@/lib/auth/redirects";
import { getReveNewAccessMode } from "@/lib/billing/paid-access";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "ReveNew | Execuție comercială, cu dovezi și control",
  description: "ReveNew arată ce s-a blocat în execuția comercială, cine trebuie să acționeze, pe ce dovezi se bazează decizia și care este următorul pas sigur.",
  alternates: { canonical: canonicalUrl("/") },
  openGraph: {
    title: "ReveNew | Vezi ce trebuie făcut înainte să pierzi oportunitatea",
    description: "Conectează oportunități, conversații, întâlniri și documente într-un sistem comercial bazat pe dovezi și control uman.",
    url: canonicalUrl("/"),
    type: "website",
    locale: "ro_RO"
  },
  twitter: {
    card: "summary",
    title: "ReveNew | Execuție comercială, cu dovezi și control",
    description: "Vezi ce s-a blocat, cine răspunde și care este următorul pas comercial."
  }
};

const faqCategories: FaqCategory[] = [
  {
    title: "Produs",
    items: [
      { question: "Este ReveNew un CRM?", answer: "ReveNew include companii, contacte și oportunități, dar este construit în primul rând pentru execuție comercială: ce necesită atenție, cine răspunde, care este următorul pas și ce rezultat a fost confirmat." },
      { question: "Înlocuiește SmartBill?", answer: "Nu. SmartBill rămâne instrumentul pentru facturare, gestiune și procese fiscale. ReveNew urmărește execuția comercială din jurul oportunităților; orice conectare între sisteme se validează separat înainte de activare." },
      { question: "AI-ul trimite emailuri singur?", answer: "Nu. AI-ul poate pregăti un draft sau un pas intern, dar aprobarea și trimiterea externă sunt acțiuni separate, permise și confirmate de un utilizator autorizat." }
    ]
  },
  {
    title: "Date și integrări",
    items: [
      { question: "Pe ce informații se bazează AI-ul?", answer: "Pe contextul autorizat disponibil în workspace și pe sursele asociate situației analizate. Dovezile și informațiile lipsă rămân vizibile." },
      { question: "Pot folosi datele pe care le am deja?", answer: "Da. Datele pot intra prin importurile disponibile sau prin conectorii configurați. Sursa, perioada și dreptul de acces rămân explicite înainte ca informația să fie folosită operațional." },
      { question: "Se conectează la Google Workspace?", answer: "Da, pentru context autorizat din Gmail, Google Calendar și Google Drive, după conectare și numai în limitele permisiunilor acordate." }
    ]
  },
  {
    title: "Control și acces",
    items: [
      { question: "Cum tratați valorile comerciale?", answer: "Estimarea, expunerea, valoarea recuperabilă și venitul confirmat sunt concepte distincte. ReveNew nu transformă automat pipeline-ul sau potențialul în venit." },
      { question: "Este potrivit și pentru o echipă mică?", answer: "Da, dacă echipa pierde timp reconstruind cine răspunde, ce s-a promis și ce urmează. Nu este necesar un departament dedicat de RevOps pentru a folosi un flux controlat." },
      { question: "Cum începe implementarea?", answer: "Alegeți un proces comercial concret, confirmați sursele și persoanele autorizate, apoi validați configurația înainte de utilizarea operațională." }
    ]
  }
];

function SectionHeading({ eyebrow, title, children, centered = false, inverse = false, compact = false }: { eyebrow: string; title: ReactNode; children?: ReactNode; centered?: boolean; inverse?: boolean; compact?: boolean }) {
  return <div className={centered ? "mx-auto max-w-[860px] text-center" : "max-w-[760px]"}><p className={`text-[0.68rem] font-bold uppercase tracking-[0.19em] ${inverse ? "text-[#d8bd76]" : "text-[#9b681a]"}`}>{eyebrow}</p><h2 className={`mt-4 font-semibold leading-[0.98] tracking-[-0.057em] ${compact ? "text-[clamp(2.15rem,3.8vw,3.35rem)]" : "text-[clamp(2.35rem,4.6vw,4rem)]"} ${inverse ? "text-white" : "text-[#111216]"}`}>{title}</h2>{children ? <p className={`mt-5 text-base leading-7 sm:text-lg sm:leading-8 ${inverse ? "text-white/68" : "text-[#60656e]"}`}>{children}</p> : null}</div>;
}

export default function LandingPage() {
  const accessMode = getReveNewAccessMode();

  return (
    <main className="marketing-canvas min-h-screen overflow-x-clip bg-[#f7f5ef] text-[#111216]">
      <a href="#continut" className="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-button focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold">Sari la conținut</a>
      <MarketingNav />

      <section id="continut" className="relative overflow-hidden bg-[#090a0c] text-white">
        <div aria-hidden="true" className="landing-v3-hero-glow pointer-events-none absolute inset-x-0 top-0 h-[38rem]" />
        <div className="relative mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1080px] pb-5 pt-14 text-center sm:pt-16 lg:pt-20">
            <p className="mx-auto inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.035] px-3 py-1.5 text-center text-[0.66rem] font-semibold uppercase leading-5 tracking-[0.13em] text-white/72 sm:w-fit sm:text-[0.69rem] sm:tracking-[0.15em]"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#d8bd76]" />ReveNew · Execuție comercială, sub control</p>
            <h1 className="mx-auto mt-6 max-w-[1030px] text-[clamp(2.55rem,12vw,5.25rem)] font-semibold leading-[0.93] tracking-[-0.066em] sm:text-[clamp(3.15rem,6vw,5.25rem)]">Vezi ce trebuie făcut înainte să pierzi oportunitatea.</h1>
            <p className="mx-auto mt-5 max-w-[860px] text-base leading-7 text-white/70 sm:text-xl sm:leading-8">ReveNew leagă CRM-ul, emailurile, întâlnirile și documentele într-un spațiu de control care arată unde s-a rupt execuția, cine răspunde și ce pas sigur urmează.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button href="#cum-functioneaza" size="large" className="border-[#d8bd76] bg-[#d8bd76] text-[#17130b] hover:bg-[#e2ca88]">Vezi cum funcționează<ArrowRightIcon className="h-4 w-4" /></Button><Button href="#preturi" variant="secondary" size="large" className="border-white/18 bg-white/[0.035] text-white hover:bg-white/[0.07]">Vezi planurile</Button></div>
            <p className="mx-auto mt-3.5 max-w-3xl text-xs leading-5 text-white/55">Context autorizat · Dovezi inspectabile · Control uman · Pas pregătit, nu executat · Estimările rămân separate de venitul confirmat</p>
          </div>
          <Reveal className="relative z-10 mx-auto mt-1 max-w-[1320px] translate-y-8 sm:translate-y-11"><HeroProductStage><ProductPreview /></HeroProductStage></Reveal>
        </div>
      </section>

      <section id="produs" className="scroll-mt-24 border-y border-[#ddd8cc] bg-[#ebe7de]"><div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 md:py-24 lg:px-8"><div className="grid items-start gap-8 lg:grid-cols-[0.82fr_1.18fr]"><Reveal><SectionHeading eyebrow="Problema" title="CRM-ul îți spune ce ai. ReveNew îți arată unde se rupe execuția.">Oportunitățile nu se pierd pentru că lipsește încă un dashboard. Se pierd când termenul, responsabilul sau următorul pas dispar între instrumente.</SectionHeading></Reveal><Reveal delay={60} className="lg:pt-5"><p className="max-w-xl border-l border-[#b58537] pl-5 text-base leading-7 text-[#60656d] lg:justify-self-end">De la registru la diagnostic: aceleași date capătă moment, motiv, owner și un pas sigur de revizuit.</p><ExecutiveCommercialDiagnostic /></Reveal></div><Reveal delay={90} className="mt-10"><OperationalDiagnostic /></Reveal></div></section>

      <section id="cum-functioneaza" className="scroll-mt-24 bg-[#090a0c] text-white"><div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 md:py-28 lg:px-8"><Reveal><SectionHeading eyebrow="Inteligență și control" title="AI-ul explică. Echipa decide." centered inverse>Concluzia, dovezile, lipsurile și pasul pregătit apar în aceeași revizuire. Aprobarea rămâne explicit umană.</SectionHeading></Reveal><Reveal delay={70} className="mt-12"><DecisionTheater /></Reveal></div></section>

      <section id="integrari" className="scroll-mt-24 border-y border-[#ddd8cc] bg-[#f2efe8]"><div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 md:py-24 lg:px-8"><Reveal><SectionHeading eyebrow="Integrări" title="Lucrează cu instrumentele pe care echipa le folosește deja." centered>Conectorii reali, implementările posibile și cerințele personalizate sunt prezentate ca stări diferite.</SectionHeading></Reveal><Reveal delay={70} className="mt-12"><IntegrationEcosystem /></Reveal></div></section>

      <section className="border-y border-[#ddd8cc] bg-[#f1eee6]"><div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 md:py-28 lg:px-8"><div className="grid gap-12 lg:grid-cols-[0.58fr_1.42fr] lg:items-center"><Reveal><SectionHeading eyebrow="Control Center" title="Începe ziua cu ceea ce contează.">Nu o colecție de KPI-uri. O coadă explicabilă de situații, cu motiv, responsabil și următorul pas.</SectionHeading><div className="mt-7 grid grid-cols-2 gap-3 text-xs font-semibold text-[#5d626a]">{["Ce necesită atenție", "De ce acum", "Cine răspunde", "Ce urmează"].map(item => <p key={item} className="border-t border-[#d5cfc2] pt-3">{item}</p>)}</div></Reveal><Reveal delay={80}><ControlCenterStage /></Reveal></div></div></section>

      <section className="bg-white"><div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 md:py-28 lg:px-8"><div className="grid gap-12 lg:grid-cols-[0.68fr_1.32fr] lg:items-center"><Reveal><SectionHeading eyebrow="Context comercial" title="Nu doar contacte și câmpuri.">Companii, contacte, oportunități, documente, ownership și termene devin un context coerent pentru decizia curentă.</SectionHeading><p className="mt-7 max-w-xl text-sm leading-7 text-[#70747c]">Relațiile provin din starea autorizată și persistată. ReveNew nu inventează legături din nume sau similarități.</p></Reveal><Reveal delay={80}><RelationshipContext /></Reveal></div></div></section>

      <section className="border-y border-[#ddd8cc] bg-[#ebe7de]"><div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 md:py-20 lg:px-8"><div className="grid items-end gap-6 lg:grid-cols-[0.82fr_1.18fr]"><Reveal><SectionHeading compact eyebrow="Procese repetabile" title={<>Transformă procesul bun <span className="whitespace-nowrap">într-un</span> flux controlat.</>} /></Reveal><Reveal delay={50}><p className="max-w-[39rem] text-[0.95rem] leading-7 text-[#62666e] lg:justify-self-end">Trigger, condiții, context, control și acțiune pregătită — fără ca definiția salvată să devină execuție autonomă.</p></Reveal></div><Reveal delay={90} className="mt-8"><WorkflowBuilderStage /></Reveal></div></section>

      <section className="bg-white"><div className="mx-auto grid max-w-[1240px] items-center gap-12 px-4 py-20 sm:px-6 md:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:px-8"><Reveal><SectionHeading eyebrow="Adevăr financiar" title="Știi ce s-a întâmplat. Și ce nu este încă dovedit.">Rapoartele păstrează diferența dintre confirmat, estimat, operațional și diagnostic. Pipeline-ul nu devine automat venit.</SectionHeading><div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-3 text-sm font-semibold text-[#5f636a]">{["Confirmat", "Estimat", "Operațional", "Diagnostic"].map(item => <p key={item} className="border-t border-[#ddd9cf] pt-3">{item}</p>)}</div></Reveal><Reveal delay={70}><PortfolioSummaryPreview /></Reveal></div></section>

      <section id="securitate" className="scroll-mt-24 bg-[#090a0c] text-white"><div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 md:py-24 lg:px-8"><div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end"><Reveal><SectionHeading eyebrow="Încredere enterprise" title="Date comerciale serioase. Control serios." inverse>Izolarea între spații de lucru, autoritatea verificată pe server, contextul permis și adevărul financiar fac parte din contractul produsului.</SectionHeading></Reveal><Reveal delay={60}><p className="max-w-xl border-l border-[#d8bd76]/40 pl-5 text-sm leading-7 text-white/65 lg:justify-self-end">Fiecare efect important trebuie să poată răspunde simplu: cine a decis, pe ce bază și ce s-a schimbat. Acestea sunt controale de produs, nu afirmații de certificare externă.</p></Reveal></div><Reveal delay={90} className="mt-12"><GovernanceConsole /></Reveal></div></section>

      <section className="bg-white"><div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 md:py-24 lg:px-8"><div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]"><Reveal><SectionHeading eyebrow="Pentru cine" title="Pentru echipe în care vânzarea nu se termină într-un singur click.">Dacă follow-up-ul, oferta, aprobarea și ownership-ul circulă între oameni și instrumente, ReveNew face firul comercial vizibil.</SectionHeading><p className="mt-7 text-sm leading-7 text-[#747880]">Servicii B2B · distribuție · logistică · echipamente · construcții · software · consultanță · mentenanță</p></Reveal><Reveal delay={70}><AudienceCases /></Reveal></div></div></section>

      <section id="preturi" className="landing-v3-pricing scroll-mt-24 border-y border-white/10 bg-[#090a0c] text-white"><div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 md:py-24 lg:px-8"><Reveal className="grid items-end gap-7 lg:grid-cols-[0.8fr_1.2fr]"><SectionHeading eyebrow="Prețuri" title="Alege nivelul potrivit procesului tău." inverse /><p className="max-w-2xl text-base leading-7 text-white/66 lg:justify-self-end">Compară planurile după complexitatea procesului. Activarea este asistată, iar accesul, integrarea și capacitatea se confirmă înainte de utilizare.</p></Reveal><Reveal delay={50} className="mt-8 grid divide-y divide-white/12 border-y border-white/12 md:grid-cols-3 md:divide-x md:divide-y-0">{[["01", "Alegi procesul", "Follow-up, ofertare sau aprobare."], ["02", "Confirmăm configurația", "Date, acces și integrare validate."], ["03", "Activăm controlat", "Responsabilitate și limite explicite."]].map(([number, title, copy]) => <div key={title} className="grid grid-cols-[auto_1fr] gap-x-3 px-2 py-3.5 md:px-4"><p className="row-span-2 text-[0.62rem] font-bold tracking-[0.12em] text-[#d8bd76]">{number}</p><p className="text-xs font-semibold text-white/88">{title}</p><p className="mt-1 text-[0.68rem] leading-5 text-white/58">{copy}</p></div>)}</Reveal>{accessMode === "preview" ? <p className="mt-6 max-w-3xl rounded-[0.75rem] border border-[#d8bd76]/30 bg-[#d8bd76]/[0.08] p-3.5 text-sm leading-6 text-[#e4ce91]">Mod de testare: selecția de mai jos nu creează o plată sau un abonament activ.</p> : null}<MarketingPricingGrid /></div></section>

      <section id="intrebari" className="scroll-mt-24 bg-white"><div className="mx-auto max-w-[1100px] px-4 py-20 sm:px-6 md:py-24 lg:px-8"><Reveal><SectionHeading eyebrow="Întrebări" title="Claritate înainte de prima decizie." centered>Răspunsuri despre produs, AI, date, integrări și control.</SectionHeading></Reveal><Reveal delay={70} className="mt-10"><FaqAccordion categories={faqCategories} /></Reveal></div></section>

      <section className="bg-[#090a0c] text-white"><Reveal className="mx-auto max-w-[1240px] px-4 py-20 text-center sm:px-6 md:py-24 lg:px-8"><p className="text-[0.68rem] font-bold uppercase tracking-[0.19em] text-[#d8bd76]">Următorul pas</p><h2 className="mx-auto mt-4 max-w-4xl text-[clamp(2.35rem,11vw,4.5rem)] font-semibold leading-[0.96] tracking-[-0.06em] sm:text-[clamp(2.7rem,5vw,4.5rem)]">Nu mai lăsa următorul pas comercial la întâmplare.</h2><p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/66 sm:text-lg">Alege procesul pe care vrei să-l clarifici, apoi confirmă datele, accesul și limitele înainte de activare.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button href="/signup?intent=select_plan" size="large" className="border-[#d8bd76] bg-[#d8bd76] text-[#17130b] hover:bg-[#e2ca88]">Continuă spre configurare<ArrowRightIcon className="h-4 w-4" /></Button><Button href="#preturi" variant="secondary" size="large" className="border-white/18 bg-white/[0.035] text-white hover:bg-white/[0.07]">Compară planurile</Button></div></Reveal></section>

      <footer className="border-t border-[#ddd9cf] bg-[#f1eee7]"><div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-12 text-sm text-[#696d74] sm:px-6 md:grid-cols-[1.5fr_0.75fr_0.75fr] lg:px-8"><div><p className="text-2xl font-semibold tracking-[-0.035em] text-[#111216]">ReveNew</p><p className="mt-3 max-w-md leading-6">Control operațional pentru execuția comercială: ce necesită atenție, cine răspunde, care este următorul pas și ce rezultat a fost confirmat.</p><p className="mt-6 text-xs">© {new Date().getFullYear()} ReveNew.</p></div><nav className="grid content-start gap-3" aria-label="Resurse"><p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[#111216]">Resurse</p><Link href="/ghid" className="hover:text-[#111216]">Ghid</Link><a href="#integrari" className="hover:text-[#111216]">Integrări</a><a href="#intrebari" className="hover:text-[#111216]">Întrebări</a></nav><nav className="grid content-start gap-3" aria-label="Încredere și acces"><p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-[#111216]">Încredere</p><Link href="/privacy" className="hover:text-[#111216]">Confidențialitate</Link><Link href="/terms" className="hover:text-[#111216]">Termeni</Link><Link href={authPath("/login", "login")} className="hover:text-[#111216]">Autentificare</Link></nav></div></footer>
    </main>
  );
}
