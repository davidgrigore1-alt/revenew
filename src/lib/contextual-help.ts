export type ContextualHelpEntry = {
  id: string;
  title: string;
  aliases: string[];
  keywords: string[];
  routes: string[];
  anchor?: string;
  primaryActionLabel?: string;
  currentActionLabel?: string;
  shortAnswer: string;
  steps: string[];
  safetyNote?: string;
  relatedQuestions: string[];
};

export type ContextualHelpResult = {
  matched: boolean;
  score: number;
  confidence: "high" | "guided" | "fallback";
  mode: "answer" | "clarify" | "fallback";
  entry: ContextualHelpEntry | null;
  suggestions: string[];
};

export function normalizeHelpText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro-RO")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const contextualHelpEntries: ContextualHelpEntry[] = [
  {
    id: "explanation-inspector",
    title: "Cum verifici de ce apare un element",
    aliases: ["Cum aflu de ce apare asta?", "De ce îmi arată ReveNew asta?", "Cum văd explicația?"],
    keywords: ["de ce", "apare", "explicatie", "fapte", "interpretare", "surse"],
    routes: ["/dashboard", "/ai", "/opportunities", "/crm/organizations"],
    shortAnswer: "Folosește «De ce apare?» sau «De ce este prioritar?» pentru a vedea faptele, interpretarea ReveNew, informațiile lipsă și sursele asociate.",
    steps: ["Păstrează motivul scurt vizibil în elementul principal.", "Deschide controlul de explicație.", "Separă faptele înregistrate de interpretarea ReveNew.", "Verifică informațiile lipsă și proveniența valorii.", "Deschide sursa și decide apoi acțiunea sigură."],
    safetyNote: "Asistentul te îndrumă către explicația canonică; nu regenerează și nu modifică explicația.",
    relatedQuestions: ["Unde văd dovezile?", "Ce înseamnă valoare estimată, neconfirmată?", "Cum verific o recomandare?"]
  },
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
    shortAnswer: "Începe cu Brief-ul executiv: prioritatea principală, motivul, dovada și prima acțiune sigură. «Ce s-a schimbat» arată numai fapte comerciale înregistrate în ultimele 24 de ore.",
    steps: ["Citește prioritatea principală.", "Separă valoarea estimată de venitul confirmat.", "Deschide «De ce este prioritar?» pentru fapte și surse.", "Verifică acțiunea sigură indicată.", "Folosește registrul complet doar dacă ai nevoie de detalii suplimentare."],
    safetyNote: "Prioritatea este calculată din înregistrări existente; faptele recente sunt distincte, iar decizia finală aparține echipei.",
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
    id: "companies-navigation",
    title: "Unde găsești companiile",
    aliases: ["Unde este secțiunea de companii?", "Unde sunt firmele?", "Unde găsesc firmele?", "Unde găsesc clienții?", "Unde sunt companiile?", "Cum caut o firmă?"],
    keywords: ["companie", "companii", "firma", "firme", "client", "clienti", "societate", "societati", "caut"],
    routes: ["/companies", "/contacts"],
    primaryActionLabel: "Du-mă la Companii",
    shortAnswer: "Companiile sunt în meniul Relații → Companii. Acolo poți căuta o firmă și deschide contextul comercial disponibil; pentru o persoană sau un decident folosește secțiunea Contacte.",
    steps: ["Deschide Companii din meniul Relații.", "Folosește căutarea după denumire sau domeniu.", "Deschide compania pentru oportunități, contacte și dovezi asociate.", "Dacă ai doar numele unei persoane, continuă în Contacte."],
    relatedQuestions: ["Unde sunt contactele?", "Cum asociez un contact acestei oportunități?", "Unde văd dovezile unei oportunități?"]
  },
  {
    id: "contacts-navigation",
    title: "Unde găsești contactele",
    aliases: ["Unde sunt contactele?", "Unde găsesc persoanele de contact?", "Unde caut un decident?"],
    keywords: ["contact", "contacte", "persoana", "persoane", "decident", "decidenti"],
    routes: ["/contacts"],
    primaryActionLabel: "Du-mă la Contacte",
    shortAnswer: "Contactele sunt în meniul Relații → Contacte. Folosește această secțiune pentru persoane și decidenți; asocierea cu o oportunitate se verifică apoi în detaliul oportunității.",
    steps: ["Deschide Contacte din meniul Relații.", "Caută persoana după nume sau date profesionale.", "Verifică firma asociată.", "Deschide oportunitatea relevantă înainte de orice comunicare."],
    relatedQuestions: ["Unde sunt firmele?", "Cum asociez un contact acestei oportunități?", "Ce fac dacă lipsește contactul principal?"]
  },
  {
    id: "opportunity-contact",
    title: "Contactul și decidentul unei oportunități",
    aliases: ["Cum asociez un contact acestei oportunități?", "Unde verific persoana de contact?", "Cum găsesc decidentul?", "Ce fac dacă lipsește contactul principal?"],
    keywords: ["contact", "persoana", "decident", "asociez", "oportunitate", "caz", "oferta", "lipseste"],
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
    aliases: ["Cum pregătesc un audit controlat?", "Cum încep auditul?", "Cum încep un audit controlat?", "Începe audit controlat", "Ce date am nevoie pentru audit?", "Pot anonimiza datele?", "Trebuie acces la inbox?", "Ce înseamnă audit controlat?", "Câte cazuri trebuie să trimit?", "Unde pregătesc auditul?", "Care este diferența dintre audit și pilot?", "Unde este raportul de audit?", "Ce date sunt necesare pentru audit?"],
    keywords: ["audit", "pilot", "cazuri", "date", "anonimizate", "inbox", "pregatesc"],
    routes: ["/audit/start", "/reports/revenue-recovery-audit", "/reports/enterprise-pilot-pack", "/reports/pilot-proof-of-value"],
    primaryActionLabel: "Deschide wizardul de audit",
    shortAnswer: "Auditul controlat pornește cu 20–50 de cazuri comerciale recente și cu datele minime necesare pentru dovezi verificabile. Datele pot fi anonimizate, iar primul audit nu cere acces complet la inbox.",
    steps: ["Deschide wizardul de audit.", "Descrie compania și blocajele comerciale.", "Confirmă cele 20–50 de cazuri și câmpurile disponibile.", "Stabilește anonimizarea și obiectivul.", "Revizuiește planul înaintea oricărui transfer de date."],
    safetyNote: "Nicio comunicare externă nu este trimisă automat. Auditul nu garantează venit, iar deciziile rămân sub control uman.",
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
    id: "settings-appearance",
    title: "Aspect și culoare accent",
    aliases: ["Cum schimb culoarea accent?", "Unde aleg tema?", "Cum personalizez aspectul?", "Ce teme sunt disponibile?"],
    keywords: ["aspect", "culoare", "accent", "tema", "teme", "personalizare", "branding"],
    routes: ["/settings"],
    anchor: "settings-appearance",
    primaryActionLabel: "Deschide Aspect",
    shortAnswer: "În Setări → Aspect alegi unul dintre preseturile premium. Accentul schimbă acțiunile și selecțiile, dar nu modifică statusurile critice, succesul sau avertizările.",
    steps: ["Deschide Setări.", "Alege un preset în Culoare accent.", "Verifică previzualizarea.", "Aplică tema sau revino la implicit."],
    safetyNote: "Preferința vizuală se aplică numai în acest browser și nu schimbă logica comercială.",
    relatedQuestions: ["Cum personalizez identitatea spațiului?", "Cum aleg moneda principală?", "Unde găsesc setările?"]
  },
  {
    id: "settings-logo",
    title: "Logo și identitate pentru compania activă",
    aliases: ["Cum adaug logo?", "Cum adaug logo-ul firmei?", "Cum schimb logo-ul firmei?", "Unde schimb sigla?", "Cum schimb numele firmei?", "Cum personalizez brandingul?", "Cum revin la inițiale?", "Ce dimensiune poate avea logo-ul?", "Pot încărca SVG?", "De ce nu se salvează pentru toți?", "Logo-ul se salvează pentru toți?", "De ce nu se schimbă logo-ul ReveNew?", "Care este diferența dintre logo-ul ReveNew și logo-ul companiei?"],
    keywords: ["logo", "sigla", "siglă", "brand", "branding", "identitate", "nume firma", "nume companie", "initiale"],
    routes: ["/settings"],
    anchor: "settings-identity",
    primaryActionLabel: "Deschide Identitate",
    shortAnswer: "În Setări → Identitate poți adăuga un logo PNG, JPG sau WEBP de maximum 800 KB. SVG nu este acceptat în v1. Logo-ul rămâne numai în acest browser, iar ReveNew rămâne brandul fix al produsului.",
    steps: ["Deschide Setări → Identitate.", "Completează numele afișat și inițialele.", "Alege un logo PNG, JPG sau WEBP de maximum 800 KB.", "Verifică previzualizarea; fără logo, interfața folosește inițialele."],
    safetyNote: "Logo-ul nu este încărcat pe server și nu este sincronizat între utilizatori sau dispozitive. Fișierele SVG nu sunt acceptate.",
    relatedQuestions: ["Cum personalizez identitatea spațiului?", "Cum schimb culoarea accent?", "Unde găsesc setările?"]
  },
  {
    id: "settings-identity",
    title: "Identitatea spațiului de lucru",
    aliases: ["Cum personalizez identitatea spațiului?", "Cum schimb numele afișat?", "Unde aleg inițialele?", "Cum aleg moneda principală?", "Cum schimb limba?"],
    keywords: ["identitate", "nume", "initiale", "industrie", "moneda", "valuta", "limba", "branding"],
    routes: ["/settings"],
    anchor: "settings-identity",
    primaryActionLabel: "Deschide Identitate",
    shortAnswer: "Identitatea locală controlează numele afișat, logo-ul sau inițialele, industria și preferințele de monedă și limbă din acest browser. ReveNew rămâne brandul produsului; denumirea legală nu este suprascrisă.",
    steps: ["Deschide Setări → Identitate.", "Completează numele afișat și inițialele.", "Adaugă opțional un logo valid.", "Alege industria și moneda principală.", "Verifică previzualizarea și aplică afișarea locală."],
    safetyNote: "Logo-ul rămâne local în browser, interfața rămâne în română, iar monedele istorice rămân separate.",
    relatedQuestions: ["Cum schimb culoarea accent?", "Cum aleg moneda principală?", "Unde găsesc setările?"]
  },
  {
    id: "access-settings-help",
    title: "Acces, setări și ajutor",
    aliases: ["Unde găsesc setările?", "Ce fac dacă lipsește o opțiune?", "Unde găsesc ajutor?", "Cum caut o secțiune?"],
    keywords: ["acces", "setari", "ajutor", "lipseste", "optiune", "cont", "caut", "sectiune"],
    routes: ["/help", "/settings", "/access"],
    shortAnswer: "Folosește Ajutor pentru orientare și Setări pentru contextul companiei și controalele disponibile rolului tău. Dacă o opțiune lipsește, poate depinde de acces sau de starea datelor.",
    steps: ["Deschide Ajutor pentru traseul operațional.", "Verifică Setări pentru configurația disponibilă.", "Consultă pagina de acces dacă funcția este restricționată.", "Nu încerca să ocolești permisiunile."],
    relatedQuestions: ["Cum funcționează ReveNew?", "Cum pornesc demo-ul?", "Ce verific prima dată pe Dashboard?"]
  }
];

export const screenExplanationEntries: ContextualHelpEntry[] = [
  {
    id: "screen-dashboard", title: "Cum folosești Control Center", aliases: ["Explică această pagină"], keywords: [], routes: ["/dashboard"], anchor: "dashboard-critical-decision",
    shortAnswer: "Ești în Control Center. Brief-ul executiv comprimă prioritățile active, schimbările comerciale din ultimele 24 de ore și activitatea atribuită ție.",
    steps: ["Unde te afli: în Control Center.", "Ce faci aici: începi cu cel mult trei priorități deduplicate.", "De ce contează: vezi rapid blocajul, dovada și acțiunea sigură.", "Ce verifici prima dată: prioritatea principală și sursa ei; «Ce s-a schimbat» conține fapte înregistrate, nu recomandări.", "Următorul pas sigur: deschide înregistrarea indicată și verific-o înainte de execuție."],
    safetyNote: "Estimările rămân separate de venitul confirmat, iar decizia finală aparține echipei.",
    relatedQuestions: ["Ce verific prima dată pe Dashboard?", "Unde văd dovezile?", "Ce înseamnă valoare estimată, neconfirmată?"]
  },
  {
    id: "screen-ai", title: "Cum folosești Inteligență operațională", aliases: ["Explică această pagină"], keywords: [], routes: ["/ai"], anchor: "ai-recommendation",
    shortAnswer: "Ești în Inteligență operațională, unde recomandările sunt explicate prin dovezi, lipsuri și limite de control.",
    steps: ["Unde te afli: în Inteligență operațională.", "Ce faci aici: verifici recomandările și contextul lor.", "De ce contează: o recomandare fără dovadă nu trebuie aplicată.", "Ce verifici prima dată: dovada, informațiile lipsă și riscul.", "Următorul pas sigur: revizuiește recomandarea și păstrează decizia sub control uman."],
    safetyNote: "Asistența nu aplică recomandarea și nu trimite comunicări automat.",
    relatedQuestions: ["Cum verific o recomandare?", "Unde văd dovezile?", "De ce AI-ul nu trimite automat?"]
  },
  {
    id: "screen-approvals", title: "Cum folosești Aprobări", aliases: ["Explică această pagină"], keywords: [], routes: ["/approvals"], anchor: "approvals-human-control", currentActionLabel: "Arată aprobările",
    shortAnswer: "Ești în Aprobări, unde schimbările sensibile sunt verificate de o persoană înainte să producă efecte.",
    steps: ["Unde te afli: în coada Aprobări.", "Ce găsești aici: cereri, dovezi și efectul exact al deciziei.", "De ce contează: aprobarea previne acțiuni comerciale greșite sau premature.", "Ce verifici prima dată: sursa și înregistrările afectate.", "Următorul pas sigur: aprobă sau respinge motivat numai după verificare."],
    safetyNote: "Aprobarea nu înseamnă trimitere automată.", relatedQuestions: ["Ce înseamnă aprobarea?", "Unde văd dovezile?", "De ce AI-ul nu trimite automat?"]
  },
  {
    id: "screen-inbox", title: "Cum folosești Inbox Comercial", aliases: ["Explică această pagină"], keywords: [], routes: ["/inbox"], anchor: "inbox-signal-intelligence",
    shortAnswer: "Ești în Inbox Comercial, unde un semnal este verificat înainte să devină oportunitate sau acțiune.",
    steps: ["Unde te afli: în Inbox Comercial.", "Ce faci aici: transformi semnale în decizii verificabile.", "De ce contează: contextul incomplet poate produce duplicate sau acțiuni greșite.", "Ce verifici prima dată: dovada, riscurile și informațiile lipsă din Context pentru decizie.", "Următorul pas sigur: confirmă recomandarea înainte de conversie sau pregătirea unei acțiuni."],
    safetyNote: "Un semnal rămâne de verificat și nu declanșează automat o comunicare.",
    relatedQuestions: ["Ce este un semnal?", "Cum verific un semnal în Inbox?", "Ce înseamnă Ce a înțeles ReveNew?"]
  },
  {
    id: "screen-opportunity", title: "Cum folosești detaliul oportunității", aliases: ["Explică această pagină"], keywords: [], routes: ["/opportunities"], anchor: "opportunity-commercial-facts",
    currentActionLabel: "Arată rezumatul",
    shortAnswer: "Ești pe detaliul oportunității, centrul de control pentru valoarea estimată, dovezi, responsabil și următoarea acțiune comercială.",
    steps: ["Unde te afli: pe detaliul oportunității.", "Ce faci aici: verifici valoarea estimată, contactul, responsabilul și acțiunile.", "De ce contează: lipsurile și blocajele pot opri progresul sau produce un handoff slab.", "Ce verifici prima dată: dovezile și termenul următoarei acțiuni.", "Următorul pas sigur: completează sau revizuiește acțiunea înainte de execuție."],
    safetyNote: "Valoarea este estimată până la confirmarea explicită a unui rezultat câștigat.",
    relatedQuestions: ["Cum asociez un contact acestei oportunități?", "Unde văd dovezile unei oportunități?", "Ce înseamnă valoare estimată, neconfirmată?"]
  },
  {
    id: "screen-recovery", title: "Cum folosești Recuperare venituri", aliases: ["Explică această pagină"], keywords: [], routes: ["/recoverable"],
    shortAnswer: "Ești în Recuperare venituri, coada oportunităților unde lipsa unui responsabil, termen sau pas următor poate produce pierderi comerciale.",
    steps: ["Unde te afli: în coada de recuperare.", "Ce găsești aici: blocaje comerciale ordonate după urgență și impact estimat.", "De ce contează: munca rămasă fără control poate fi uitată.", "Ce verifici prima dată: motivul principal și dovada.", "Următorul pas sigur: deschide oportunitatea și completează controlul lipsă."],
    safetyNote: "Valoarea este estimată și nu reprezintă venit confirmat.", relatedQuestions: ["Ce este valoarea estimată?", "Cum verific o recomandare?", "Unde văd dovezile?"]
  },
  {
    id: "screen-pipeline", title: "Cum folosești Pipeline", aliases: ["Explică această pagină"], keywords: [], routes: ["/pipeline"],
    shortAnswer: "Ești în Pipeline, unde urmărești poziția oportunităților în fluxul comercial fără a confunda estimările cu rezultatele confirmate.",
    steps: ["Unde te afli: în Pipeline.", "Ce găsești aici: oportunități grupate după starea comercială.", "De ce contează: blocajele devin vizibile înainte să fie uitate.", "Ce verifici prima dată: oportunitățile fără pas următor sau responsabil.", "Următorul pas sigur: deschide oportunitatea care cere clarificare."],
    safetyNote: "Pipeline-ul nu garantează închiderea sau venitul.", relatedQuestions: ["Ce este valoarea estimată?", "Cum verific o recomandare?", "Ce verific prima dată pe Dashboard?"]
  },
  {
    id: "screen-company-360", title: "Cum folosești Company 360", aliases: ["Explică această pagină"], keywords: [], routes: ["/crm/organizations"], anchor: "company-ask", currentActionLabel: "Arată întrebările despre companie",
    shortAnswer: "Ești în Company 360, unde identitatea, situația curentă și istoricul comercial al unei organizații sunt reunite pe baza relațiilor înregistrate.",
    steps: ["Unde te afli: în Company 360.", "Ce găsești aici: contextul relației, oportunități, persoane, bucle deschise și dovezi.", "De ce contează: reduci timpul de căutare înaintea unei decizii sau discuții.", "Ce verifici prima dată: ce contează acum și dovada asociată.", "Următorul pas sigur: întreabă despre companie sau deschide acțiunea recomandată."],
    safetyNote: "ReveNew nu inventează fapte despre companie și nu caută pe web.", relatedQuestions: ["Unde văd dovezile?", "Cum verific o recomandare?", "Unde sunt contactele?"]
  },
  {
    id: "screen-companies", title: "Cum folosești Companii", aliases: ["Explică această pagină"], keywords: [], routes: ["/companies"], anchor: "companies-register", currentActionLabel: "Arată companiile",
    shortAnswer: "Ești în Companii, registrul organizațiilor comerciale din spațiul de lucru.",
    steps: ["Unde te afli: în registrul Companii.", "Ce găsești aici: clienți, prospecți și parteneri, cu activitatea și relațiile comerciale disponibile.", "De ce contează: acesta este punctul de intrare către contextul și istoricul unei organizații.", "Ce verifici prima dată: caută organizația relevantă și verifică ultima activitate disponibilă.", "Următorul pas: deschide Company 360 pentru relația selectată."],
    relatedQuestions: ["Unde sunt contactele?", "Cum caut o firmă?", "Unde văd dovezile?"]
  },
  {
    id: "screen-contacts", title: "Cum folosești Contacte", aliases: ["Explică această pagină"], keywords: [], routes: ["/contacts"],
    shortAnswer: "Ești în Contacte, registrul persoanelor asociate companiilor și oportunităților comerciale.",
    steps: ["Unde te afli: în Contacte.", "Ce găsești aici: persoane, roluri profesionale și relații înregistrate.", "De ce contează: continuitatea comercială depinde de o persoană corect identificată.", "Ce verifici prima dată: firma și rolul contactului.", "Următorul pas sigur: deschide oportunitatea asociată înainte de comunicare."],
    safetyNote: "Rolurile lipsă nu sunt deduse automat.", relatedQuestions: ["Unde sunt firmele?", "Cum asociez un contact acestei oportunități?", "Ce fac dacă lipsește contactul principal?"]
  },
  {
    id: "screen-outreach", title: "Cum folosești Documente", aliases: ["Explică această pagină"], keywords: [], routes: ["/outreach"],
    shortAnswer: "Ești în Documente, unde drafturile comerciale sunt pregătite, revizuite și păstrate lângă oportunitatea lor.",
    steps: ["Unde te afli: în Documente.", "Ce găsești aici: drafturi, starea revizuirii și contextul oportunității.", "De ce contează: separi pregătirea internă de utilizarea externă.", "Ce verifici prima dată: sursa, versiunea și aprobarea.", "Următorul pas sigur: revizuiește documentul înainte de orice trimitere."],
    safetyNote: "Pregătirea unui document nu înseamnă trimitere automată.", relatedQuestions: ["Ce înseamnă aprobarea?", "Unde văd dovezile?", "De ce AI-ul nu trimite automat?"]
  },
  {
    id: "screen-feedback", title: "Cum folosești concluziile după demo", aliases: ["Explică această pagină"], keywords: [], routes: ["/demo/feedback"], anchor: "demo-feedback-fit",
    shortAnswer: "Ești în concluziile după demo, unde observațiile devin o evaluare prudentă și un pas următor.",
    steps: ["Unde te afli: în concluziile după demo.", "Ce faci aici: notezi durerea, obiecțiile și disponibilitatea datelor.", "De ce contează: decizia de audit trebuie susținută de context real.", "Ce verifici prima dată: problema comercială și datele pe care clientul le poate furniza.", "Următorul pas sigur: revizuiește evaluarea înainte de a propune auditul."],
    relatedQuestions: ["Cum notez feedbackul după demo?", "Cum pregătesc un audit controlat?", "Cum pornesc demo-ul?"]
  },
  {
    id: "screen-demo", title: "Cum folosești traseul demo", aliases: ["Explică această pagină"], keywords: [], routes: ["/demo"],
    shortAnswer: "Ești în traseul demo, o prezentare controlată de 7–10 minute de la risc la audit.",
    steps: ["Unde te afli: în traseul demo.", "Ce faci aici: prezinți problema, dovada, recomandarea și controlul uman.", "De ce contează: cumpărătorul vede valoarea fără promisiuni financiare.", "Ce verifici prima dată: întrebarea cumpărătorului și scopul pasului curent.", "Următorul pas sigur: urmează traseul și încheie cu auditul pe un eșantion limitat."],
    relatedQuestions: ["Cum pornesc demo-ul?", "Cum pregătesc un audit controlat?", "Cum notez feedbackul după demo?"]
  },
  {
    id: "screen-reports", title: "Cum folosești rapoartele", aliases: ["Explică această pagină"], keywords: [], routes: ["/reports"], anchor: "reports-audit-summary",
    shortAnswer: "Ești în Rapoarte, unde pipeline-ul, valoarea expusă și rezultatele confirmate sunt prezentate separat.",
    steps: ["Unde te afli: în Rapoarte.", "Ce faci aici: pregătești auditul, pilotul și dovada valorii.", "De ce contează: managementul trebuie să distingă estimările de rezultate.", "Ce verifici prima dată: eticheta valorii, moneda și perioada.", "Următorul pas sigur: deschide raportul potrivit și verifică dovezile înainte de prezentare."],
    safetyNote: "Rapoartele nu promit venit recuperat și nu execută acțiuni.",
    relatedQuestions: ["Cum pregătesc un audit controlat?", "Ce înseamnă valoare estimată, neconfirmată?", "Care este diferența dintre audit și pilot?"]
  },
  {
    id: "screen-settings", title: "Cum folosești Setări", aliases: ["Explică această pagină"], keywords: [], routes: ["/settings"], anchor: "settings-appearance",
    shortAnswer: "Ești în Setări, unde controlezi aspectul local, identitatea afișată și preferințele permise rolului tău.",
    steps: ["Unde te afli: în Setări.", "Ce faci aici: ajustezi aspectul și identitatea de afișare.", "De ce contează: o identitate clară reduce confuzia între produs și compania activă.", "Ce verifici prima dată: secțiunea pe care vrei să o modifici și limita ei de aplicare.", "Următorul pas sigur: previzualizează schimbarea înainte de aplicare."],
    relatedQuestions: ["Cum schimb culoarea accent?", "Cum personalizez identitatea spațiului?", "Unde găsesc setările?"]
  },
  {
    id: "screen-today", title: "Cum folosești Activitatea mea", aliases: ["Explică această pagină"], keywords: [], routes: ["/today"],
    shortAnswer: "Ești în Activitatea mea, lista acțiunilor comerciale atribuite ție și ordonate după termen.",
    steps: ["Unde te afli: în Activitatea mea.", "Ce faci aici: gestionezi acțiunile proprii scadente, restante sau viitoare.", "De ce contează: întârzierile și handoff-urile neclare pot produce pierderi comerciale.", "Ce verifici prima dată: acțiunile restante și dovada asociată.", "Următorul pas sigur: revizuiește acțiunea înainte să o finalizezi sau să o amâni."],
    safetyNote: "Lista rămâne atribuită utilizatorului curent; excepțiile manageriale sunt tratate separat.",
    relatedQuestions: ["Cum amân o acțiune?", "Ce verific prima dată pe Dashboard?", "Unde văd dovezile?"]
  },
  {
    id: "screen-audit", title: "Cum folosești Audit controlat", aliases: ["Explică această pagină"], keywords: [], routes: ["/audit/start"],
    shortAnswer: "Ești în Audit controlat. Ajungi aici din Control Center, Demo sau Rapoarte și pregătești primul audit pe 20–50 de cazuri comerciale recente.",
    steps: ["Unde te afli: în Audit controlat.", "Ce faci aici: completezi contextul, eșantionul și obiectivul auditului.", "De ce contează: datele limitate și anonimizabile permit o validare prudentă.", "Ce verifici prima dată: compania, blocajele și disponibilitatea celor 20–50 de cazuri.", "Următorul pas sigur: completează pasul curent și revizuiește planul înaintea oricărui transfer de date."],
    safetyNote: "Primul audit nu cere acces complet la inbox, nu trimite comunicări și nu garantează venit.",
    relatedQuestions: ["Cum pregătesc un audit controlat?", "Pot anonimiza datele?", "Ce date am nevoie pentru audit?"]
  },
  {
    id: "screen-help", title: "Cum folosești Ajutor", aliases: ["Explică această pagină"], keywords: [], routes: ["/help"],
    shortAnswer: "Ești în Ajutor, unde găsești explicații despre fluxul ReveNew și limitele de control.",
    steps: ["Unde te afli: în Ajutor.", "Ce faci aici: cauți explicația unei etape sau a unei reguli comerciale.", "De ce contează: folosirea consecventă păstrează deciziile verificabile.", "Ce verifici prima dată: întrebarea apropiată de problema ta.", "Următorul pas sigur: deschide explicația și revino la ruta indicată."],
    relatedQuestions: ["Cum funcționează ReveNew?", "Cum pregătesc un audit controlat?", "De ce AI-ul nu trimite automat?"]
  }
];

const vagueGuidancePhrases = ["nu inteleg", "ce fac aici", "ajuta ma", "nu stiu unde sa merg", "ce trebuie sa fac", "unde incep"];

function routeMatches(entryRoute: string, pathname: string) {
  return pathname === entryRoute || pathname.startsWith(`${entryRoute}/`);
}

export function getScreenExplanation(pathname: string): ContextualHelpResult {
  const entry = screenExplanationEntries.find((candidate) => candidate.routes.some((route) => routeMatches(route, pathname)))
    ?? contextualHelpEntries.find((candidate) => candidate.id === "revenew-core-flow")!;
  return { matched: true, score: 100, confidence: "high", mode: "clarify", entry, suggestions: entry.relatedQuestions.slice(0, 4) };
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
  if (!normalizedQuestion) return { matched: false, score: 0, confidence: "fallback", mode: "fallback", entry: null, suggestions: suggestedHelpQuestions(pathname, 3) };
  if (normalizedQuestion === "explica aceasta pagina" || vagueGuidancePhrases.some((phrase) => normalizedQuestion.includes(phrase))) {
    return getScreenExplanation(pathname);
  }

  const ranked = contextualHelpEntries
    .map((entry, index) => ({ entry, index, score: scoreEntry(entry, normalizedQuestion, pathname) }))
    .sort((left, right) => right.score - left.score || left.index - right.index);
  const best = ranked[0];
  if (!best || best.score < 5) return { matched: false, score: best?.score ?? 0, confidence: "fallback", mode: "fallback", entry: null, suggestions: suggestedHelpQuestions(pathname, 3) };
  return { matched: true, score: best.score, confidence: best.score >= 30 ? "high" : "guided", mode: "answer", entry: best.entry, suggestions: best.entry.relatedQuestions.slice(0, 4) };
}
