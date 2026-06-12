import { DataCard } from "@/components/dashboard/DataCard";
import { PageShell } from "@/components/dashboard/PageShell";
const glossary = [
  [
    "Ce vinzi de fapt?",
    "MoneyHunter AI vinde recuperarea oportunitatilor comerciale pierdute, nu doar acces la o aplicatie."
  ],
  [
    "Ce vinzi de fapt cu MoneyHunter AI?",
    "MoneyHunter AI nu este doar un CRM. Este un sistem care ajuta firmele sa nu piarda cereri comerciale. Platforma aduna semnale, le transforma in oportunitati, pregateste actiuni si arata managerului ce trebuie urmarit."
  ],
  [
    "Cum apar oportunitatile?",
    "In MoneyHunter, oportunitatile pot fi adaugate manual sau pot porni din Inbox Comercial. Inbox-ul aduna semnale precum apeluri, emailuri, formulare, mesaje sau lead-uri importate. Semnalele importante pot fi transformate in oportunitati, iar apoi platforma pregateste emailuri, follow-up-uri, oferte si rapoarte."
  ],
  ["Ce este o oportunitate?", "Un semnal comercial care poate deveni bani: un lead, o licitatie, un client vechi, o recomandare sau o nevoie observata."],
  ["Ce este pipeline-ul?", "Lista organizata de oportunitati active, cu valoare estimata, status, scoruri si urmatorul pas."],
  ["Ce inseamna Fit?", "Cat de bine se potriveste oportunitatea cu serviciile, locatia si publicul tinta al firmei tale."],
  ["Ce inseamna Urgenta?", "Cat de repede trebuie actionat, in functie de deadline, context si risc de pierdere."],
  ["Ce inseamna Bani?", "Estimarea valorii comerciale posibile. Nu este venit garantat."],
  ["Ce inseamna Incredere?", "Cat de sigura este analiza in functie de datele disponibile in textul oportunitatii."],
  ["Ce inseamna follow-up?", "Urmatorul mesaj, apel sau pas comercial dupa primul contact. Multe oportunitati se pierd fara follow-up."],
  ["Ce este modul de prezentare?", "Un set de exemple folosit pentru explorarea produsului inainte de configurarea workspace-ului real."],
  ["Ce este workspace-ul?", "Spatiul firmei tale, unde sunt organizate profilul, oportunitatile, documentele, actiunile si rapoartele."],
  ["Cum sunt pregatite documentele?", "Documentele folosesc datele oportunitatii si profilul firmei, apoi pot fi revizuite inainte de trimitere."]
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
