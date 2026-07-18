import Link from "next/link";
import { PageShell } from "@/components/dashboard/PageShell";

const pathways = [
  { step: "01", title: "Configurează contextul comercial", description: "Verifică profilul companiei, serviciile și clienții țintă care susțin prioritizarea.", href: "/settings", action: "Deschide setările" },
  { step: "02", title: "Revizuiește semnalele", description: "Confirmă relevanța cererilor și transformă numai semnalele utile în oportunități.", href: "/inbox", action: "Deschide Inbox Comercial" },
  { step: "03", title: "Organizează execuția", description: "Stabilește responsabilul, următoarea acțiune, termenul și valoarea estimată.", href: "/opportunities", action: "Vezi oportunitățile" },
  { step: "04", title: "Aprobă documentele", description: "Revizuiește drafturile și păstrează controlul uman înaintea oricărei trimiteri externe.", href: "/outreach", action: "Deschide Follow-up Studio" }
];

const faqGroups = [
  {
    title: "Semnale și oportunități",
    items: [
      ["Cum devine un semnal oportunitate?", "Semnalul intră în Inbox Comercial, este revizuit de un utilizator și poate fi aprobat în fluxul existent. Conversia nu are loc fără o decizie explicită."],
      ["Ce este o oportunitate?", "O posibilitate comercială documentată, cu responsabil, valoare estimată, termen și următoarea acțiune. Poate proveni dintr-un lead, reactivare, follow-up, reînnoire sau alt context comercial."],
      ["Ce exprimă valoarea estimată?", "Un interval de lucru pentru prioritizare, nu venit garantat. Valoarea estimată rămâne separată de venitul recuperat confirmat și de rezultatele pierdute."],
      ["Cum funcționează scorurile?", "Fit-ul arată potrivirea, urgența indică timpul de reacție, scorul financiar susține prioritizarea, iar încrederea reflectă calitatea datelor disponibile."]
    ]
  },
  {
    title: "Ownership și execuție",
    items: [
      ["De ce este important responsabilul?", "Ownership-ul elimină ambiguitatea: echipa știe cine continuă conversația, iar managementul poate vedea lucrările neatribuite sau blocate."],
      ["Ce este următoarea acțiune?", "Pasul comercial concret care trebuie executat: apel, mesaj, ofertă, document sau follow-up. Un termen clar face riscul operațional vizibil."],
      ["Ce arată Pipeline-ul?", "Distribuția oportunităților pe etape, valoarea estimată și acoperirea operațională. Schimbarea statusului rămâne explicită și auditabilă."],
      ["Cum tratez oportunitățile fără contact?", "Completează compania și persoana relevantă în CRM, marchează contactul principal și documentează rolul de decizie atunci când este cunoscut."]
    ]
  },
  {
    title: "Documente și control uman",
    items: [
      ["Cum sunt pregătite documentele?", "Drafturile folosesc contextul oportunității și al companiei. Ele ajung în Follow-up Studio pentru revizuire, adaptare și aprobare."],
      ["ReveNew trimite automat mesaje?", "Nu. Interfața diferențiază pregătirea, aprobarea și confirmarea trimiterii. Acțiunile externe rămân sub controlul utilizatorului și al politicilor workspace-ului."],
      ["Ce înseamnă «Netrimis automat»?", "Documentul există în workflow, dar ReveNew nu pretinde că a fost livrat. O trimitere apare ca externă numai când fluxul existent o confirmă."],
      ["Unde verific aprobările?", "Documentele se revizuiesc în Follow-up Studio, iar cererile guvernate apar în Setări → Echipă și guvernanță, numai pentru utilizatorii autorizați."]
    ]
  },
  {
    title: "Date, import și auditabilitate",
    items: [
      ["Ce pot importa?", "Fluxul actual de import acceptă datele comerciale validate de aplicație. Rândurile respinse sau duplicate sunt raportate fără a crea înregistrări false."],
      ["Cum sunt separate datele?", "Datele sunt asociate workspace-ului curent, iar accesul este controlat pe server și prin politicile existente. Interfața nu modifică aceste reguli."],
      ["Ce apare în rapoarte?", "Indicatori calculați din oportunități, acțiuni, documente și rezultate reale. Estimările, rezultatele confirmate, pierderile și monedele sunt prezentate separat."],
      ["Unde găsesc istoricul?", "Detaliul oportunității păstrează evenimentele de workflow, iar jurnalul de audit enterprise este disponibil utilizatorilor cu permisiunile necesare."]
    ]
  }
];

export default function HelpPage() {
  return (
    <PageShell eyebrow="Ajutor" title="Centru de orientare ReveNew" description="Răspunsuri practice pentru semnale, oportunități, follow-up, ownership și controlul comercial.">
      <div className="grid gap-8">
        <section className="overflow-hidden rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-card" aria-labelledby="start-title">
          <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[0.72fr_1.28fr]">
            <div><p className="text-label text-[rgb(var(--primary))]">Începe cu fluxul real</p><h2 id="start-title" className="mt-2 text-2xl font-semibold tracking-[-0.035em]">De la semnal la acțiune comercială controlată.</h2><p className="mt-3 text-sm leading-6 text-[rgb(var(--text-muted))]">ReveNew organizează informația și recomandă următorii pași. Echipa confirmă relevanța, ownership-ul, documentele și rezultatele.</p></div>
            <ol className="grid gap-px overflow-hidden rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--border))] sm:grid-cols-2">
              {pathways.map((item) => <li key={item.step} className="bg-[rgb(var(--surface-subtle))] p-4"><p className="text-label text-[rgb(var(--primary))]">Pasul {item.step}</p><h3 className="mt-2 text-sm font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">{item.description}</p><Link href={item.href} className="focus-ring mt-3 inline-flex min-h-10 items-center rounded-button text-sm font-semibold text-[rgb(var(--primary))]">{item.action} →</Link></li>)}
            </ol>
          </div>
        </section>

        <section aria-labelledby="faq-title">
          <div className="max-w-2xl"><p className="text-label text-[rgb(var(--primary))]">Ghid operațional</p><h2 id="faq-title" className="mt-2 text-xl font-semibold">Răspunsuri după decizia pe care trebuie să o iei</h2><p className="mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Deschide numai subiectul relevant. Explicațiile descriu comportamentul actual al produsului, fără promisiuni automate.</p></div>
          <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
            {faqGroups.map((group) => (
              <section key={group.title} className="rounded-panel border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-card sm:p-5">
                <h3 className="text-base font-semibold">{group.title}</h3>
                <div className="mt-3 divide-y divide-[rgb(var(--border))]">
                  {group.items.map(([question, answer]) => <details key={question} className="group"><summary className="focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-button py-3 text-sm font-semibold marker:hidden"><span>{question}</span><span className="text-lg font-normal text-[rgb(var(--primary))] transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary><p className="pb-4 pr-8 text-sm leading-6 text-[rgb(var(--text-muted))]">{answer}</p></details>)}
                </div>
              </section>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
