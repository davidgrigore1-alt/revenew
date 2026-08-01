export type ContextualHelpEntry = {
  id: string;
  title: string;
  aliases: string[];
  keywords: string[];
  routes: string[];
  anchor?: string;
  shortAnswer: string;
  steps: string[];
  safetyNote?: string;
  relatedQuestions: string[];
};

export type ContextualHelpResult = {
  matched: boolean;
  score: number;
  entry: ContextualHelpEntry | null;
  suggestions: string[];
};

export function normalizeHelpText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro-RO")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const contextualHelpEntries: ContextualHelpEntry[] = [
  {
    id: "revenew-core-flow",
    title: "Cum funcționează ReveNew",
    aliases: ["Cum funcționează ReveNew?", "Ce face ReveNew?", "Care este fluxul ReveNew?"],
    keywords: ["functioneaza", "revenew", "flux", "semnal", "decizie"],
    routes: ["/dashboard"],
    anchor: "dashboard-critical-decision",
    shortAnswer: "ReveNew leagă un semnal comercial de dovezi, recomandare, decizie umană și o acțiune sigură. Auditul și pilotul verifică valoarea fără să o promită.",
    steps: ["Pornește din Control Center.", "Verifică semnalul și dovezile.", "Citește recomandarea și informațiile lipsă.", "Confirmă decizia umană și acțiunea sigură.", "Folosește auditul sau pilotul pentru validare."],
    safetyNote: "ReveNew nu execută automat acțiuni comerciale riscante.",
    relatedQuestions: ["Ce verific prima dată pe Dashboard?", "Cum verific o recomandare?", "Cum pregătesc un audit controlat?"]
  },
  {
    id: "dashboard-first-check",
    title: "Prima verificare în Control Center",
    aliases: ["Ce verific prima dată pe Dashboard?", "Cu ce încep în Control Center?", "Care este decizia critică?"],
    keywords: ["dashboard", "control center", "prima", "verific", "decizie", "critic"],
    routes: ["/dashboard"],
    anchor: "dashboard-critical-decision",
    shortAnswer: "Începe cu decizia critică: de ce contează acum, ce valoare este estimată, ce dovadă există și care este prima acțiune sigură.",
    steps: ["Citește prioritatea principală.", "Separă valoarea estimată de venitul confirmat.", "Verifică dovada și informațiile lipsă.", "Deschide acțiunea sigură indicată."],
    safetyNote: "Prioritatea este o recomandare explicată; decizia finală aparține echipei.",
    relatedQuestions: ["Ce înseamnă valoare estimată, neconfirmată?", "Unde văd dovezile?", "Cum verific o recomandare?"]
  },
  {
    id: "recommendation-evidence",
    title: "Cum verifici o recomandare",
    aliases: ["Cum verific o recomandare?", "Unde văd dovezile recomandării?", "Unde văd dovezile?", "Cum citesc inteligența operațională?"],
    keywords: ["recomandare", "inteligenta", "dovada", "dovezi", "verific", "ai"],
    routes: ["/ai"],
    anchor: "ai-recommendation",
    shortAnswer: "O recomandare sigură arată motivul, dovada, informațiile lipsă, riscul inacțiunii și acțiunea propusă. Dacă dovada lipsește, nu o trata ca decizie finală.",
    steps: ["Deschide Inteligență operațională.", "Citește «De ce contează acum».", "Verifică dovada și informațiile lipsă.", "Compară acțiunea sigură cu politica echipei.", "Confirmă sau respinge printr-o decizie umană."],
    safetyNote: "Asistența structurează informația; nu trimite și nu aplică automat recomandarea.",
    relatedQuestions: ["De ce AI-ul nu trimite automat?", "Unde văd dovezile unei oportunități?", "Ce verific prima dată pe Dashboard?"]
  },
  {
    id: "inbox-signal-review",
    title: "Cum revizuiești un semnal comercial",
    aliases: ["Ce este un semnal?", "Cum verific un semnal în Inbox?", "Ce înseamnă Ce a înțeles ReveNew?"],
    keywords: ["inbox", "semnal", "clasific", "arhiv", "respinge", "inteles"],
    routes: ["/inbox"],
    anchor: "inbox-signal-intelligence",
    shortAnswer: "Un semnal este informație comercială de verificat, nu o oportunitate confirmată. Revizuirea păstrează sursa, clarifică lipsurile și cere o decizie înainte de conversie.",
    steps: ["Selectează semnalul.", "Verifică sursa și contextul original.", "Compară interpretarea ReveNew cu dovada.", "Completează responsabilul și următoarea acțiune dacă sunt cunoscute.", "Clasifică, amână, respinge sau arhivează cu motiv."],
    safetyNote: "Clasificarea nu trimite comunicări externe.",
    relatedQuestions: ["Cum amân o acțiune?", "Cum verific o recomandare?", "Unde văd dovezile?"]
  },
  {
    id: "opportunity-contact",
    title: "Contactul și decidentul unei oportunități",
    aliases: ["Cum asociez un contact acestei oportunități?", "Unde verific persoana de contact?", "Cum găsesc decidentul?"],
    keywords: ["contact", "persoana", "decident", "asociez", "oportunitate", "caz", "oferta"],
    routes: ["/opportunities"],
    anchor: "opportunity-commercial-facts",
    shortAnswer: "În detaliul oportunității verifică faptele comerciale și zona de contacte. Dacă nu există un contact confirmat, tratează lipsa ca informație de verificat înaintea comunicării.",
    steps: ["Deschide oportunitatea relevantă.", "Verifică «Fapte comerciale» și contactul principal.", "Deschide panoul de contacte disponibil în pagină.", "Asociază un contact existent sau completează informația prin controlul disponibil.", "Revizuiește dovezile înainte de orice comunicare."],
    safetyNote: "Dacă pagina nu oferă controlul de asociere pentru acel caz, folosește registrul Contacte și nu inventa identitatea decidentului.",
    relatedQuestions: ["Unde văd dovezile unei oportunități?", "Ce fac dacă lipsește contactul principal?", "Cum verific o recomandare?"]
  },
  {
    id: "opportunity-evidence",
    title: "Dovezile unei oportunități",
    aliases: ["Unde văd dovezile unei oportunități?", "Unde văd dovezile?", "Ce documente susțin oportunitatea?"],
    keywords: ["dovada", "dovezi", "document", "sursa", "oportunitate"],
    routes: ["/opportunities"],
    anchor: "opportunity-evidence",
    shortAnswer: "Detaliul oportunității păstrează sursele, semnalele asociate și istoricul care susțin recomandarea. Folosește numai faptele vizibile înaintea acțiunii.",
    steps: ["Deschide oportunitatea.", "Verifică recomandarea explicată.", "Deschide dovezile și semnalele asociate.", "Notează informațiile lipsă.", "Confirmă acțiunea sigură numai după verificare."],
    safetyNote: "O valoare estimată nu înlocuiește o dovadă și nu reprezintă venit confirmat.",
    relatedQuestions: ["Cum asociez un contact acestei oportunități?", "Cum verific o recomandare?", "Ce înseamnă valoare estimată, neconfirmată?"]
  },
  {
    id: "today-postpone",
    title: "Cum amâni responsabil o acțiune",
    aliases: ["Cum amân o acțiune?", "Cum schimb termenul?", "Unde văd ce am de făcut azi?"],
    keywords: ["aman", "amana", "amanare", "termen", "azi", "actiune", "today"],
    routes: ["/today"],
    anchor: "today-action",
    shortAnswer: "Amânarea trebuie să păstreze motivul și un termen clar. Deschide acțiunea din Activitatea mea și folosește opțiunea disponibilă fără a marca lucrarea ca finalizată.",
    steps: ["Deschide Activitatea mea.", "Alege acțiunea relevantă.", "Verifică de ce contează acum.", "Folosește opțiunea de amânare și stabilește un termen realist.", "Revino la oportunitate dacă trebuie schimbat contextul."],
    relatedQuestions: ["Ce verific prima dată pe Dashboard?", "Cum verific o recomandare?", "Ce este un semnal?"]
  },
  {
    id: "approvals-human-control",
    title: "Ce înseamnă aprobarea umană",
    aliases: ["Ce înseamnă aprobarea?", "De ce este necesară decizia umană?", "Se trimite ceva după aprobare?"],
    keywords: ["aprobare", "aprob", "uman", "trimite", "decizie"],
    routes: ["/approvals"],
    anchor: "approvals-human-control",
    shortAnswer: "Aprobarea confirmă că o persoană a verificat dovada și schimbarea propusă. Nu înseamnă automat că un mesaj a fost trimis.",
    steps: ["Deschide Aprobări.", "Verifică sursa recomandării.", "Citește exact ce se va schimba.", "Confirmă înregistrările afectate.", "Aprobă sau respinge cu motiv."],
    safetyNote: "Nicio comunicare externă nu este trimisă automat.",
    relatedQuestions: ["De ce AI-ul nu trimite automat?", "Cum verific o recomandare?", "Unde văd dovezile?"]
  },
  {
    id: "estimated-value",
    title: "Valoare estimată și venit confirmat",
    aliases: ["Ce este valoarea estimată?", "Ce înseamnă valoare estimată, neconfirmată?", "Este valoarea expusă venit?"],
    keywords: ["venit", "valoare", "estimata", "estimare", "confirmat", "expusa"],
    routes: ["/reports"],
    anchor: "reports-audit-summary",
    shortAnswer: "Valoarea estimată ajută la prioritizare și rămâne neconfirmată. Venitul confirmat apare separat, numai după înregistrarea explicită a unui rezultat câștigat.",
    steps: ["Verifică eticheta indicatorului.", "Confirmă moneda.", "Separă pipeline-ul de valoarea expusă.", "Nu interpreta estimarea ca venit sau rezultat garantat."],
    safetyNote: "ReveNew nu estimează ROI și nu garantează recuperarea valorii.",
    relatedQuestions: ["Cum pregătesc un audit controlat?", "Ce verific prima dată pe Dashboard?", "Cum verific o recomandare?"]
  },
  {
    id: "controlled-audit",
    title: "Cum pregătești un audit controlat",
    aliases: ["Cum pregătesc un audit controlat?", "Care este diferența dintre audit și pilot?", "Unde este raportul de audit?"],
    keywords: ["audit", "pilot", "raport", "dovada", "anonimizate"],
    routes: ["/reports/revenue-recovery-audit", "/reports/enterprise-pilot-pack", "/reports/pilot-proof-of-value"],
    anchor: "reports-audit-summary",
    shortAnswer: "Auditul pornește dintr-un eșantion limitat și verifică blocajele, dovezile și acțiunile sigure. Pilotul validează procesul controlat; dovada valorii susține decizia de continuare, ajustare sau oprire.",
    steps: ["Pregătește 20–50 de cazuri recente.", "Anonimizează datele când este necesar.", "Verifică riscurile și dovezile din audit.", "Definește pilotul și criteriile de succes.", "Evaluează dovada valorii fără promisiuni financiare."],
    safetyNote: "Primul audit nu necesită acces complet la inbox și nu garantează venit.",
    relatedQuestions: ["Ce înseamnă valoare estimată, neconfirmată?", "Cum notez feedbackul după demo?", "Cum funcționează ReveNew?"]
  },
  {
    id: "demo-controlled",
    title: "Cum pornești demonstrația controlată",
    aliases: ["Cum pornesc demo-ul?", "Cum opresc traseul demo?", "Unde este prezentarea controlată?"],
    keywords: ["demo", "demonstratie", "traseu", "pornesc", "opresc"],
    routes: ["/demo"],
    shortAnswer: "Ruta Demo oferă un traseu controlat prin problema comercială, dovadă, recomandare, decizie, audit și pilot. Bara traseului poate fi oprită în orice moment.",
    steps: ["Deschide Demo.", "Pornește cu decizia critică.", "Urmează pașii în ordine.", "Folosește «Oprește» pentru a închide bara traseului.", "Înregistrează concluziile după conversație."],
    relatedQuestions: ["Cum notez feedbackul după demo?", "Cum pregătesc un audit controlat?", "Cum funcționează ReveNew?"]
  },
  {
    id: "demo-feedback",
    title: "Cum înregistrezi concluziile după demo",
    aliases: ["Cum notez feedbackul după demo?", "Unde înregistrez concluziile demo-ului?", "Ce înseamnă fit pentru audit?"],
    keywords: ["feedback", "concluzii", "demo", "fit", "urmator", "pas"],
    routes: ["/demo/feedback"],
    anchor: "demo-feedback-fit",
    shortAnswer: "Concluziile demo-ului transformă observațiile într-o evaluare explicabilă, lipsuri și un următor pas. Evaluarea folosește numai datele introduse și rămâne locală în browser.",
    steps: ["Completează contextul cumpărătorului.", "Notează durerea și datele disponibile.", "Confirmă ce a înțeles cumpărătorul.", "Înregistrează obiecțiile.", "Revizuiește fit-ul și copiază rezumatul intern."],
    safetyNote: "Instrumentul nu califică automat și nu trimite feedback extern.",
    relatedQuestions: ["Cum pornesc demo-ul?", "Cum pregătesc un audit controlat?", "Ce este valoarea estimată?"]
  },
  {
    id: "automatic-sending",
    title: "De ce asistența nu trimite automat",
    aliases: ["De ce AI-ul nu trimite automat?", "ReveNew trimite emailuri singur?", "Cine aprobă acțiunea?"],
    keywords: ["ai", "automat", "trimite", "email", "aproba", "mesaj"],
    routes: ["/approvals"],
    anchor: "approvals-human-control",
    shortAnswer: "Recomandările pot pregăti contextul și următorul pas, dar comunicarea externă cere verificare și aprobare umană explicită.",
    steps: ["Verifică dovada.", "Revizuiește conținutul propus.", "Confirmă persoana și efectul acțiunii.", "Aprobă numai după verificare."],
    safetyNote: "Nu există trimitere automată sau recuperare autonomă.",
    relatedQuestions: ["Ce înseamnă aprobarea?", "Cum verific o recomandare?", "Cum pregătesc un audit controlat?"]
  },
  {
    id: "access-settings-help",
    title: "Acces, setări și ajutor",
    aliases: ["Unde găsesc setările?", "Ce fac dacă lipsește o opțiune?", "Unde găsesc ajutor?"],
    keywords: ["acces", "setari", "ajutor", "lipseste", "optiune", "cont"],
    routes: ["/help", "/settings", "/access"],
    shortAnswer: "Folosește Ajutor pentru orientare și Setări pentru contextul companiei și controalele disponibile rolului tău. Dacă o opțiune lipsește, poate depinde de acces sau de starea datelor.",
    steps: ["Deschide Ajutor pentru traseul operațional.", "Verifică Setări pentru configurația disponibilă.", "Consultă pagina de acces dacă funcția este restricționată.", "Nu încerca să ocolești permisiunile."],
    relatedQuestions: ["Cum funcționează ReveNew?", "Cum pornesc demo-ul?", "Ce verific prima dată pe Dashboard?"]
  }
];

function routeMatches(entryRoute: string, pathname: string) {
  return pathname === entryRoute || pathname.startsWith(`${entryRoute}/`);
}

function scoreEntry(entry: ContextualHelpEntry, normalizedQuestion: string, pathname: string) {
  let score = 0;
  const normalizedWords = normalizedQuestion.split(" ").filter(Boolean);
  const questionWords = new Set(normalizedWords.filter((word) => word.length > 2));
  for (const alias of entry.aliases) {
    const normalizedAlias = normalizeHelpText(alias);
    if (normalizedQuestion === normalizedAlias) score += 40;
    else if (normalizedQuestion.includes(normalizedAlias) || normalizedAlias.includes(normalizedQuestion)) score += 14;
  }
  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalizeHelpText(keyword);
    const matchesKeyword = normalizedKeyword.includes(" ")
      ? ` ${normalizedQuestion} `.includes(` ${normalizedKeyword} `)
      : normalizedWords.some((word) => word === normalizedKeyword || (normalizedKeyword.length >= 4 && word.startsWith(normalizedKeyword)));
    if (matchesKeyword) score += 5;
  }
  for (const word of normalizeHelpText(entry.title).split(" ")) {
    if (word.length > 3 && questionWords.has(word)) score += 2;
  }
  if (score > 0 && entry.routes.some((route) => routeMatches(route, pathname))) score += 30;
  return score;
}

export function suggestedHelpQuestions(pathname: string, limit = 4) {
  const contextual = contextualHelpEntries.filter((entry) => entry.routes.some((route) => routeMatches(route, pathname)));
  const fallback = contextualHelpEntries.filter((entry) => ["dashboard-first-check", "recommendation-evidence", "revenew-core-flow", "controlled-audit"].includes(entry.id));
  return [...contextual, ...fallback]
    .filter((entry, index, entries) => entries.findIndex((candidate) => candidate.id === entry.id) === index)
    .slice(0, limit)
    .map((entry) => entry.aliases[0]);
}

export function findContextualHelp(question: string, pathname = "/dashboard"): ContextualHelpResult {
  const normalizedQuestion = normalizeHelpText(question);
  if (!normalizedQuestion) return { matched: false, score: 0, entry: null, suggestions: suggestedHelpQuestions(pathname, 3) };

  const ranked = contextualHelpEntries
    .map((entry, index) => ({ entry, index, score: scoreEntry(entry, normalizedQuestion, pathname) }))
    .sort((left, right) => right.score - left.score || left.index - right.index);
  const best = ranked[0];
  if (!best || best.score < 5) return { matched: false, score: best?.score ?? 0, entry: null, suggestions: suggestedHelpQuestions(pathname, 3) };
  return { matched: true, score: best.score, entry: best.entry, suggestions: best.entry.relatedQuestions.slice(0, 3) };
}
