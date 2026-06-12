import type { BusinessService, BusinessTarget, BusinessProfile, Lead, Opportunity, OutreachSequence, WeeklyReport } from "@/lib/types";

export const demoBusiness: BusinessProfile = {
  id: "auto-management-srl",
  name: "Auto Management SRL",
  legalName: "Auto Management SRL",
  cui: "RO12345678",
  website: "automanagement.ro",
  industry: "rent-a-car / servicii auto",
  city: "București",
  county: "Ilfov",
  services: [
    "închiriere auto pe termen scurt",
    "închiriere auto pe termen mediu",
    "închiriere flote corporate",
    "transfer aeroport",
    "mașini de înlocuire pentru clienții service-urilor"
  ],
  targetCustomers: [
    "companii de construcții",
    "companii de logistică",
    "firme de consultanță",
    "companii cu angajați care călătoresc în București",
    "service-uri auto care au nevoie de mașini de înlocuire",
    "organizatori de evenimente",
    "companii străine care vizitează România"
  ],
  averageContractValue: 6200,
  targetCities: ["București", "Otopeni", "Voluntari", "Pipera", "Măgurele"],
  targetIndustries: ["construcții", "logistică", "servicii auto", "evenimente", "consultanță"],
  currentSalesProcess:
    "Lead-urile vin din recomandări, apeluri directe și parteneriate locale. Follow-up-ul se face manual.",
  notificationEmail: "office@automanagement.ro"
};

export const businessServices: BusinessService[] = demoBusiness.services.map((service, index) => ({
  id: `service-${index + 1}`,
  businessId: demoBusiness.id,
  name: service,
  description: `Serviciu demo pentru ${demoBusiness.name}: ${service}.`
}));

export const businessTargets: BusinessTarget[] = [
  ...demoBusiness.targetCustomers.map((value, index) => ({
    id: `target-customer-${index + 1}`,
    businessId: demoBusiness.id,
    type: "customer" as const,
    value
  })),
  ...demoBusiness.targetCities.map((value, index) => ({
    id: `target-city-${index + 1}`,
    businessId: demoBusiness.id,
    type: "city" as const,
    value
  })),
  ...demoBusiness.targetIndustries.map((value, index) => ({
    id: `target-industry-${index + 1}`,
    businessId: demoBusiness.id,
    type: "industry" as const,
    value
  }))
];

export const opportunities: Opportunity[] = [
  {
    id: "achizitie-publica-inchiriere-auto",
    title: "Achiziție publică pentru servicii de închiriere auto și transport",
    type: "public_procurement",
    status: "new",
    estimatedValueLow: 32000,
    estimatedValueHigh: 58000,
    deadline: "2026-06-18",
    city: "București",
    county: "Ilfov",
    fitScore: 92,
    urgencyScore: 88,
    moneyScore: 91,
    confidenceScore: 76,
    contact: {
      name: "Birou achiziții",
      role: "Autoritate contractantă",
      email: "achizitii@example.ro",
      company: "Instituție publică București"
    },
    summary:
      "O instituție publică pregătește achiziția de servicii de transport și închiriere auto pentru deplasări locale.",
    relevance: [
      "Serviciul cerut se suprapune cu flota pe termen scurt și mediu.",
      "Termenul este apropiat, deci merită verificată documentația azi.",
      "Valoarea estimată este peste media contractelor curente."
    ],
    risks: ["Documentația poate cere capacitate minimă de flotă.", "Termenul de depunere este strâns."],
    recommendedAction: "Verifică caietul de sarcini și pregătește lista de mașini disponibile.",
    rawSourceText:
      "Anunț public pentru servicii de transport persoane și închiriere autoturisme în București și Ilfov.",
    timeline: [
      {
        id: "event-1",
        label: "Sursă detectată",
        date: "2026-06-10",
        description: "Anunțul a fost marcat ca potrivit pentru servicii auto B2B."
      }
    ],
    documents: [
      { id: "doc-1", title: "Checklist ofertă achiziție publică", status: "placeholder" },
      { id: "doc-2", title: "Draft clarificări", status: "placeholder" }
    ],
    actions: [
      {
        id: "action-1",
        title: "Analizează criteriile",
        description: "Extrage cerințele obligatorii și documentele lipsă.",
        status: "pending",
        dueDate: "2026-06-11"
      }
    ]
  },
  {
    id: "constructor-extindere-ilfov",
    title: "Companie de construcții se extinde în Ilfov și poate avea nevoie de mașini temporare",
    type: "b2b_lead",
    status: "reviewed",
    estimatedValueLow: 12000,
    estimatedValueHigh: 28000,
    deadline: "2026-06-21",
    city: "Voluntari",
    county: "Ilfov",
    fitScore: 87,
    urgencyScore: 70,
    moneyScore: 82,
    confidenceScore: 72,
    contact: {
      name: "Radu Ionescu",
      role: "Operations Manager",
      email: "radu.ionescu@example.ro",
      phone: "+40 721 000 101",
      company: "Nord Construct Grup"
    },
    summary:
      "Firma anunță două șantiere noi în Ilfov și are echipe care se deplasează între București, Voluntari și Otopeni.",
    relevance: [
      "Echipele de teren au nevoie de mobilitate pe termen mediu.",
      "Oferta de flotă corporate este direct relevantă.",
      "Decidentul operațional este identificabil."
    ],
    risks: ["Poate avea contract existent cu leasing operațional.", "Bugetul depinde de durata șantierelor."],
    recommendedAction: "Trimite un email scurt despre flote temporare pentru echipe de șantier.",
    rawSourceText: "Compania Nord Construct Grup recrutează personal pentru proiecte noi în zona Ilfov.",
    timeline: [
      {
        id: "event-2",
        label: "Lead calificat",
        date: "2026-06-09",
        description: "Semnalul de extindere a fost corelat cu serviciile de flotă temporară."
      }
    ],
    documents: [{ id: "doc-3", title: "Email outreach construcții", status: "placeholder" }],
    actions: [
      {
        id: "action-2",
        title: "Contactează Operations Manager",
        description: "Propune pachet pentru 3-5 mașini pe 60-90 zile.",
        status: "pending",
        dueDate: "2026-06-12"
      }
    ]
  },
  {
    id: "logistica-masini-inlocuire",
    title: "Companie de logistică poate avea nevoie de vehicule de înlocuire",
    type: "partnership",
    status: "action_generated",
    estimatedValueLow: 9000,
    estimatedValueHigh: 21000,
    deadline: "2026-06-24",
    city: "București",
    county: "Ilfov",
    fitScore: 84,
    urgencyScore: 64,
    moneyScore: 78,
    confidenceScore: 70,
    contact: {
      name: "Mihai Pop",
      role: "Fleet Coordinator",
      email: "fleet@example.ro",
      company: "Rapid Logistic Services"
    },
    summary:
      "O firmă de logistică are fluctuații de flotă și poate folosi mașini de rezervă pentru perioade scurte.",
    relevance: [
      "Serviciul de mașini de înlocuire rezolvă o problemă operațională clară.",
      "Bugetul poate deveni recurent dacă există colaborare lunară."
    ],
    risks: ["Poate cere disponibilitate foarte rapidă.", "Marja depinde de tipul vehiculului cerut."],
    recommendedAction: "Pregătește un pachet de disponibilitate rapidă pentru mașini compacte și break.",
    rawSourceText: "Anunț intern de angajare coordonator flotă și extindere rute urbane.",
    timeline: [
      {
        id: "event-3",
        label: "Draft pregătit",
        date: "2026-06-10",
        description: "A fost pregătit un unghi de contact pentru coordonator flotă."
      }
    ],
    documents: [{ id: "doc-4", title: "Script apel fleet coordinator", status: "placeholder" }],
    actions: [
      {
        id: "action-3",
        title: "Sună coordonatorul de flotă",
        description: "Validează dacă au nevoie de mașini de rezervă în următoarele 30 zile.",
        status: "pending",
        dueDate: "2026-06-10"
      }
    ]
  },
  {
    id: "outreach-hr-operations",
    title: "Campanie corporate către HR și Operations managers",
    type: "cold_outreach",
    status: "new",
    estimatedValueLow: 15000,
    estimatedValueHigh: 36000,
    deadline: "2026-06-28",
    city: "București",
    county: "Ilfov",
    fitScore: 79,
    urgencyScore: 52,
    moneyScore: 80,
    confidenceScore: 68,
    summary:
      "Un segment de companii cu angajați care călătoresc frecvent în București poate fi abordat cu ofertă de mobilitate corporate.",
    relevance: [
      "Serviciul de transfer aeroport și închiriere medie răspunde unei nevoi repetitive.",
      "Mesajul poate fi personalizat pe rolul HR/Operations."
    ],
    risks: ["Rata de răspuns inițială poate fi redusă.", "Necesită follow-up consistent."],
    recommendedAction: "Pornește o secvență de 3 emailuri către 30 companii din București.",
    rawSourceText: "Listă internă de companii cu activitate corporate și birouri în București.",
    timeline: [
      {
        id: "event-4",
        label: "Segment propus",
        date: "2026-06-10",
        description: "Segment creat pentru outreach B2B."
      }
    ],
    documents: [{ id: "doc-5", title: "Secvență email corporate mobility", status: "placeholder" }],
    actions: [
      {
        id: "action-4",
        title: "Selectează primele 30 companii",
        description: "Construiește lista de contacte HR/Operations.",
        status: "pending",
        dueDate: "2026-06-13"
      }
    ]
  },
  {
    id: "client-vechi-60-zile",
    title: "Client B2B vechi nu a fost contactat în 60 zile",
    type: "contract_renewal",
    status: "follow_up_needed",
    estimatedValueLow: 5200,
    estimatedValueHigh: 11200,
    deadline: "2026-06-12",
    city: "București",
    county: "Ilfov",
    fitScore: 90,
    urgencyScore: 85,
    moneyScore: 69,
    confidenceScore: 82,
    contact: {
      name: "Andreea Pavel",
      role: "Office Manager",
      email: "andreea.pavel@example.ro",
      company: "Consulting Bridge"
    },
    summary:
      "Clientul a închiriat mașini pentru delegații în trecut, dar nu a mai fost contactat recent.",
    relevance: [
      "Există istoric de cumpărare.",
      "Follow-up-ul este simplu și poate produce venit rapid.",
      "Serviciul transfer aeroport este probabil relevant."
    ],
    risks: ["Nevoia poate fi sezonieră.", "Contactul poate fi schimbat."],
    recommendedAction: "Trimite un email de reactivare cu ofertă pentru delegații de vară.",
    rawSourceText: "Ultima factură B2B emisă acum 67 zile pentru închiriere 5 zile.",
    timeline: [
      {
        id: "event-5",
        label: "Follow-up întârziat",
        date: "2026-06-10",
        description: "Clientul a depășit pragul de 60 zile fără contact."
      }
    ],
    documents: [{ id: "doc-6", title: "Email reactivare client", status: "placeholder" }],
    actions: [
      {
        id: "action-5",
        title: "Trimite email de reactivare",
        description: "Menționează istoricul și disponibilitatea pentru iunie-iulie.",
        status: "pending",
        dueDate: "2026-06-10"
      }
    ]
  },
  {
    id: "grant-digitalizare-imm",
    title: "Grant digitalizare IMM pentru sistem de rezervări și automatizare vânzări",
    type: "grant",
    status: "reviewed",
    estimatedValueLow: 18000,
    estimatedValueHigh: 22500,
    deadline: "2026-07-02",
    city: "București",
    county: "Ilfov",
    fitScore: 76,
    urgencyScore: 58,
    moneyScore: 74,
    confidenceScore: 62,
    summary:
      "Programul poate finanța platforme digitale, automatizări comerciale și sisteme interne pentru IMM-uri.",
    relevance: [
      "Firma poate digitaliza rezervările și urmărirea lead-urilor.",
      "Valoarea grantului reduce costul investiției în vânzări."
    ],
    risks: ["Eligibilitatea trebuie verificată.", "Aplicarea cere documente financiare."],
    recommendedAction: "Verifică ghidul solicitantului și criteriile CAEN.",
    rawSourceText: "Program IMM pentru digitalizare procese, CRM, automatizare și prezență online.",
    timeline: [
      {
        id: "event-6",
        label: "Grant detectat",
        date: "2026-06-08",
        description: "Programul a fost marcat ca posibil relevant pentru rent-a-car."
      }
    ],
    documents: [{ id: "doc-7", title: "Checklist eligibilitate grant", status: "placeholder" }],
    actions: [
      {
        id: "action-6",
        title: "Verifică eligibilitatea",
        description: "Confirmă CAEN, vechime firmă și documente financiare.",
        status: "pending",
        dueDate: "2026-06-14"
      }
    ]
  },
  {
    id: "eveniment-oaspeti-straini",
    title: "Organizator de evenimente are nevoie de mașini pentru oaspeți străini",
    type: "website_lead",
    status: "contacted",
    estimatedValueLow: 7600,
    estimatedValueHigh: 16800,
    deadline: "2026-06-20",
    city: "București",
    county: "Ilfov",
    fitScore: 83,
    urgencyScore: 79,
    moneyScore: 71,
    confidenceScore: 73,
    contact: {
      name: "Ioana Marin",
      role: "Event Producer",
      email: "ioana@example.ro",
      phone: "+40 733 000 202",
      company: "Urban Events"
    },
    summary:
      "Eveniment corporate cu invitați străini în București. Are nevoie de transfer aeroport și mașini cu șofer/închiriere scurtă.",
    relevance: [
      "Transferul aeroport este serviciu existent.",
      "Termenul apropiat creează urgență.",
      "Poate genera colaborări recurente cu agenția."
    ],
    risks: ["Cererea poate include șofer dedicat.", "Disponibilitatea flotei trebuie confirmată rapid."],
    recommendedAction: "Trimite ofertă rapidă cu opțiuni pentru 3 zile și transfer aeroport.",
    rawSourceText: "Cerere formular website: avem 12 invitați din Germania și Franța, 18-20 iunie.",
    timeline: [
      {
        id: "event-7",
        label: "Contact inițial",
        date: "2026-06-10",
        description: "Lead venit prin formularul website."
      }
    ],
    documents: [{ id: "doc-8", title: "Ofertă eveniment corporate", status: "placeholder" }],
    actions: [
      {
        id: "action-7",
        title: "Trimite ofertă",
        description: "Include variante compacte, sedan și transfer aeroport.",
        status: "pending",
        dueDate: "2026-06-11"
      }
    ]
  },
  {
    id: "service-auto-masini-clienti",
    title: "Service auto are nevoie de mașini de înlocuire pentru clienți",
    type: "partnership",
    status: "new",
    estimatedValueLow: 9800,
    estimatedValueHigh: 24000,
    deadline: "2026-06-26",
    city: "Otopeni",
    county: "Ilfov",
    fitScore: 86,
    urgencyScore: 61,
    moneyScore: 77,
    confidenceScore: 71,
    contact: {
      name: "Cristian Dobre",
      role: "Manager service",
      email: "service@example.ro",
      company: "Dobre Auto Service"
    },
    summary:
      "Service-ul poate oferi clienților mașini de înlocuire printr-un parteneriat lunar.",
    relevance: [
      "Serviciul este explicit în oferta Auto Management.",
      "Parteneriatul poate produce cereri recurente.",
      "Zona Otopeni este în aria țintă."
    ],
    risks: ["Poate cere tarif preferențial.", "Volumul lunar trebuie validat."],
    recommendedAction: "Propune un acord de parteneriat cu tarif pe zi și disponibilitate minimă.",
    rawSourceText: "Service auto local cu volum ridicat de reparații și clienți corporate.",
    timeline: [
      {
        id: "event-8",
        label: "Parteneriat identificat",
        date: "2026-06-09",
        description: "Firma se potrivește cu oferta de mașini de înlocuire."
      }
    ],
    documents: [{ id: "doc-9", title: "Draft parteneriat service auto", status: "placeholder" }],
    actions: [
      {
        id: "action-8",
        title: "Programează discuție",
        description: "Validează volumul lunar și tipurile de mașini cerute.",
        status: "pending",
        dueDate: "2026-06-13"
      }
    ]
  }
];

export const leads: Lead[] = [
  {
    id: "lead-1",
    companyName: "Nord Construct Grup",
    industry: "Construcții",
    city: "Voluntari",
    contactName: "Radu Ionescu",
    email: "radu.ionescu@example.ro",
    phone: "+40 721 000 101",
    leadScore: 87,
    estimatedBudget: 18000,
    needSignal: "Două șantiere noi în Ilfov",
    recommendedAngle: "Flotă temporară pentru echipe de teren",
    status: "qualified"
  },
  {
    id: "lead-2",
    companyName: "Rapid Logistic Services",
    industry: "Logistică",
    city: "București",
    contactName: "Mihai Pop",
    email: "fleet@example.ro",
    leadScore: 84,
    estimatedBudget: 14000,
    needSignal: "Extindere rute urbane",
    recommendedAngle: "Vehicule de înlocuire cu disponibilitate rapidă",
    status: "in_outreach"
  },
  {
    id: "lead-3",
    companyName: "Urban Events",
    industry: "Evenimente",
    city: "București",
    contactName: "Ioana Marin",
    email: "ioana@example.ro",
    phone: "+40 733 000 202",
    leadScore: 83,
    estimatedBudget: 9600,
    needSignal: "Invitați străini pentru eveniment corporate",
    recommendedAngle: "Transfer aeroport și închiriere scurtă",
    status: "contacted"
  },
  {
    id: "lead-4",
    companyName: "Dobre Auto Service",
    industry: "Service auto",
    city: "Otopeni",
    contactName: "Cristian Dobre",
    email: "service@example.ro",
    leadScore: 86,
    estimatedBudget: 16000,
    needSignal: "Clienți care așteaptă reparații 3-7 zile",
    recommendedAngle: "Parteneriat pentru mașini de înlocuire",
    status: "new"
  },
  {
    id: "lead-5",
    companyName: "Consulting Bridge",
    industry: "Consultanță",
    city: "București",
    contactName: "Andreea Pavel",
    email: "andreea.pavel@example.ro",
    leadScore: 78,
    estimatedBudget: 8200,
    needSignal: "Delegații recurente în București",
    recommendedAngle: "Reactivare client și pachet delegații",
    status: "contacted"
  }
];

export const outreachSequences: OutreachSequence[] = [
  {
    id: "seq-1",
    name: "Flote temporare pentru construcții",
    target: "Operations managers din construcții",
    status: "draft",
    messages: [
      {
        id: "msg-1",
        subject: "Mașini temporare pentru echipele din Ilfov",
        body: "Bună ziua, am observat că extindeți proiectele în Ilfov. Auto Management poate acoperi rapid 3-5 mașini pentru echipele de teren.",
        status: "draft",
        dueDate: "2026-06-12",
        recipientCompany: "Nord Construct Grup"
      },
      {
        id: "msg-1b",
        subject: "Disponibilitate flotă pentru proiecte de construcții",
        body: "Putem pregăti rapid mașini pentru echipele care se deplasează între șantiere, cu preluare/livrare în București și Ilfov.",
        status: "sent",
        dueDate: "2026-06-10",
        recipientCompany: "BuildPro Ilfov"
      }
    ],
    followUps: [
      {
        id: "follow-1",
        task: "Follow-up telefonic dacă nu răspund în 48 ore",
        dueDate: "2026-06-14",
        status: "pending"
      }
    ]
  },
  {
    id: "seq-2",
    name: "Reactivare clienți B2B",
    target: "Clienți fără comandă în ultimele 60 zile",
    status: "active",
    messages: [
      {
        id: "msg-2",
        subject: "Disponibilitate auto pentru delegațiile din iunie",
        body: "Bună, revenim cu disponibilitatea flotei pentru următoarele săptămâni. Putem pregăti rapid mașini pentru echipa voastră.",
        status: "scheduled",
        dueDate: "2026-06-12",
        recipientCompany: "Consulting Bridge"
      },
      {
        id: "msg-3",
        subject: "Mașini pentru invitații străini ai evenimentului",
        body: "Pentru evenimente corporate, putem acoperi transfer aeroport și închiriere pe 2-4 zile, cu opțiuni sedan și compacte.",
        status: "replied",
        dueDate: "2026-06-11",
        recipientCompany: "Urban Events"
      },
      {
        id: "msg-4",
        subject: "Parteneriat pentru mașini de înlocuire",
        body: "Auto Management poate susține service-urile auto cu mașini de înlocuire pentru clienți, pe bază de disponibilitate și tarif preferențial.",
        status: "draft",
        dueDate: "2026-06-13",
        recipientCompany: "Dobre Auto Service"
      }
    ],
    followUps: [
      {
        id: "follow-2",
        task: "Trimite variantă de ofertă pentru 5 zile",
        dueDate: "2026-06-12",
        status: "pending"
      }
    ]
  }
];

export const weeklyReport: WeeklyReport = {
  opportunitiesFound: 8,
  estimatedPipelineValue: 197500,
  actionsCompleted: 5,
  actionsPrepared: opportunities.reduce((sum, item) => sum + item.actions.length + item.documents.length, 0),
  risks: [
    "Termenele scurte pot bloca achizițiile publice dacă documentele nu sunt pregătite rapid.",
    "Lead-urile corporate au nevoie de follow-up consecvent, altfel se răcesc în 3-5 zile.",
    "Disponibilitatea flotei trebuie verificată înainte de orice ofertă fermă."
  ],
  suggestedOutreachAngle:
    "Poziționează Auto Management SRL ca partener rapid pentru flote temporare, mașini de înlocuire și transferuri în București/Ilfov.",
  deadlinesThisWeek: opportunities.filter((item) => item.deadline && item.deadline <= "2026-06-18"),
  followUpsNeeded: opportunities.filter((item) => item.status === "follow_up_needed"),
  recommendedFocus:
    "Prioritatea săptămânii este combinarea oportunităților rapide: reactivarea clientului vechi, oferta pentru eveniment și verificarea achiziției publice.",
  topOpportunities: [...opportunities]
    .sort((a, b) => b.estimatedValueHigh - a.estimatedValueHigh)
    .slice(0, 5)
};
