import { DataCard } from "@/components/dashboard/DataCard";
import { PageShell } from "@/components/dashboard/PageShell";
const glossary = [
  [
    "Ce vinzi de fapt?",
    "MoneyHunter AI vinde recuperarea oportunităților comerciale pierdute, nu doar acces la o aplicație."
  ],
  [
    "Ce vinzi de fapt cu MoneyHunter AI?",
    "MoneyHunter AI nu este doar un CRM. Este un sistem care ajută firmele să nu piardă cereri comerciale. Platforma aduna semnale, le transformă în oportunități, pregătește acțiuni și arată managerului ce trebuie urmărit."
  ],
  [
    "Cum apar oportunitățile?",
    "În MoneyHunter, oportunitățile pot fi adăugate manual sau pot porni din Inbox Comercial. Inbox-ul aduna semnale precum apeluri, emailuri, formulare, mesaje sau lead-uri importate. Semnalele importante pot fi transformate în oportunități, iar apoi platforma pregătește emailuri, follow-up-uri, oferte si rapoarte."
  ],
  ["Ce este o oportunitate?", "Un semnal comercial care poate deveni bani: un lead, o licitatie, un client vechi, o recomandare sau o nevoie observata."],
  ["Ce este pipeline-ul?", "Lista organizată de oportunități active, cu valoare estimată, status, scoruri și următorul pas."],
  ["Ce inseamna Fit?", "Cat de bine se potriveste oportunitatea cu serviciile, locatia si publicul tinta al firmei tale."],
  ["Ce inseamna Urgenta?", "Cat de repede trebuie actionat, in functie de deadline, context si risc de pierdere."],
  ["Ce inseamna Bani?", "Estimarea valorii comerciale posibile. Nu este venit garantat."],
  ["Ce înseamnă Încredere?", "Cât de sigură este analiza în funcție de datele disponibile în textul oportunității."],
  ["Ce înseamnă follow-up?", "Următorul mesaj, apel sau pas comercial după primul contact. Multe oportunități se pierd fără follow-up."],
  ["Ce este modul de prezentare?", "Un set de exemple folosit pentru explorarea produsului inainte de configurarea workspace-ului real."],
  ["Ce este workspace-ul?", "Spațiul firmei tale, unde sunt organizate profilul, oportunitățile, documentele, acțiunile și rapoartele."],
  ["Cum sunt pregătite documentele?", "Documentele folosesc datele oportunității și profilul firmei, apoi pot fi revizuite înainte de trimitere."]
];

export default function HelpPage() {
  return (
    <PageShell
      eyebrow="Ajutor"
      title="Glosar MoneyHunter AI"
      description="Termeni esentiali pentru folosirea platformei in fluxul comercial."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <DataCard title="Flux comercial">
          <div className="flex flex-wrap gap-2 text-sm font-semibold text-zinc-300">
            {["Semnal comercial", "Revizuire", "Oportunitate", "Document / follow-up", "Raport"].map((item, index, items) => (
              <span key={item} className="inline-flex items-center gap-2">
                <span className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2">{item}</span>
                {index < items.length - 1 ? <span className="text-mint-400">-&gt;</span> : null}
              </span>
            ))}
          </div>
        </DataCard>
        {glossary.map(([title, description]) => (
          <DataCard key={title} title={title}>
            <p className="text-sm leading-6 text-zinc-300">{description}</p>
          </DataCard>
        ))}
      </div>
    </PageShell>
  );
}
