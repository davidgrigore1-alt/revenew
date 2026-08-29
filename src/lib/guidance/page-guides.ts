export type PageGuide = {
  id: string;
  title: string;
  purpose: string;
  whatYouSee: string;
  whatYouDo: string;
  nextStep: string;
  href: string;
};

export const pageGuides: PageGuide[] = [
  { id: "dashboard", title: "Control Center", purpose: "Vezi situațiile comerciale care cer atenție", whatYouSee: "Priorități, impact estimat și următorii pași", whatYouDo: "Deschizi cazul prioritar și verifici acțiunea sigură", nextStep: "Revizuiește prima situație din listă", href: "/dashboard" },
  { id: "companies", title: "Companii", purpose: "Păstrezi contextul comercial al organizațiilor", whatYouSee: "Companii, relații și date utile pentru oportunități", whatYouDo: "Completezi datele confirmate și contactul principal", nextStep: "Adaugă sau deschide o companie", href: "/companies" },
  { id: "contacts", title: "Contacte", purpose: "Clarifici persoanele implicate în decizii comerciale", whatYouSee: "Persoane, roluri și legături cu companii", whatYouDo: "Confirmi persoana relevantă și rolul acesteia", nextStep: "Adaugă sau deschide un contact", href: "/contacts" },
  { id: "opportunities", title: "Oportunități", purpose: "Urmărești cazurile comerciale confirmate", whatYouSee: "Valoare estimată, responsabil, termen și următoarea acțiune", whatYouDo: "Prioritizezi excepțiile și completezi lipsurile", nextStep: "Deschide oportunitatea prioritară", href: "/opportunities" },
  { id: "pipeline", title: "Pipeline", purpose: "Urmărești cum avansează oportunitățile comerciale", whatYouSee: "Oportunitățile grupate după etapa curentă", whatYouDo: "Verifici responsabilul, termenul și următoarea acțiune", nextStep: "Actualizează pasul confirmat al unei oportunități", href: "/pipeline" },
  { id: "inbox", title: "Inbox Comercial", purpose: "Revizuiești semnalele înainte să devină oportunități", whatYouSee: "Semnale, dovezi și informații lipsă", whatYouDo: "Verifici relevanța și alegi următorul pas sigur", nextStep: "Deschide semnalul care cere revizuire", href: "/inbox" },
  { id: "documents", title: "Documente comerciale", purpose: "Găsești contextul documentat al cazurilor comerciale", whatYouSee: "Documente autorizate și legătura lor cu oportunitățile", whatYouDo: "Verifici sursa și contextul înainte de folosire", nextStep: "Deschide documentul relevant", href: "/documents" },
  { id: "meetings", title: "Întâlniri", purpose: "Pregătești conversațiile comerciale", whatYouSee: "Agenda autorizată și contextul apropiat", whatYouDo: "Verifici participanții și pregătești un brief", nextStep: "Deschide următoarea întâlnire", href: "/meetings" },
  { id: "sequences", title: "Secvențe și mesaje", purpose: "Pregătești comunicarea repetabilă sub control uman", whatYouSee: "Secvențe, pași și înrolări existente", whatYouDo: "Revizuiești pașii înainte de activare sau înrolare", nextStep: "Deschide o secvență sau creează un draft", href: "/sequences" },
  { id: "workflows", title: "Workflow-uri", purpose: "Vezi regulile care pregătesc pași comerciali", whatYouSee: "Condiții, acțiuni și starea fiecărui flux", whatYouDo: "Verifici contextul înainte de orice aplicare", nextStep: "Deschide workflow-ul relevant", href: "/workflows" },
  { id: "prepared", title: "Lucru pregătit", purpose: "Revizuiești materialele pregătite înainte de execuție", whatYouSee: "Drafturi și actualizări care necesită control uman", whatYouDo: "Verifici conținutul și alegi fluxul potrivit", nextStep: "Deschide materialul pregătit", href: "/prepared" },
  { id: "apps", title: "Aplicații", purpose: "Gestionezi sursele autorizate de context comercial", whatYouSee: "Conexiuni, capacități și starea sincronizării", whatYouDo: "Conectezi sau verifici numai integrațiile necesare", nextStep: "Deschide conexiunea relevantă", href: "/apps" },
  { id: "settings", title: "Setări", purpose: "Configurezi spațiul de lucru și accesul", whatYouSee: "Identitate, preferințe, integrații și control", whatYouDo: "Actualizezi numai opțiunile pe care le administrezi", nextStep: "Alege secțiunea de configurat", href: "/settings" }
];

export function pageGuideForPath(pathname: string) {
  if (pathname.startsWith("/opportunities/")) return pageGuides.find((guide) => guide.id === "opportunities") ?? null;
  if (pathname.startsWith("/workflows")) return pageGuides.find((guide) => guide.id === "workflows") ?? null;
  return pageGuides.find((guide) => guide.href === pathname) ?? null;
}
