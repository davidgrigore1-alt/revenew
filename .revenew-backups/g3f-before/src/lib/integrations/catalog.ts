export type IntegrationStage = "implemented" | "next" | "planned";
export type IntegrationCategory = "Comunicare" | "CRM" | "Documente" | "Contracte" | "Platformă";

export type IntegrationCatalogItem = {
  id: string;
  name: string;
  category: IntegrationCategory;
  stage: IntegrationStage;
  description: string;
  capabilities: string[];
  useCases: Array<{ label: string; detail: string }>;
  permissions: string[];
  scope: "Utilizator" | "Workspace";
  logoUrl: string | null;
  logoMode?: "mark" | "wordmark";
  note?: string;
};

export const integrationCatalog: IntegrationCatalogItem[] = [
  {
    id: "google-workspace",
    name: "Google Workspace",
    category: "Comunicare",
    stage: "implemented",
    description: "Conversații și întâlniri autorizate într-un singur context comercial.",
    capabilities: ["Gmail", "Calendar", "Drive", "Docs", "Sheets", "Meet"],
    useCases: [
      { label: "Ask ReveNew", detail: "Răspunsuri susținute de conversațiile și întâlnirile autorizate." },
      { label: "Inbox Comercial", detail: "Conversații Gmail și pregătirea răspunsurilor cu control uman." },
      { label: "Meeting Briefs", detail: "Pregătirea întâlnirilor pe baza Calendarului și a contextului comercial." }
    ],
    permissions: ["Citire Gmail", "Citire Calendar", "Trimitere Gmail cu autorizare separată și confirmare explicită"],
    scope: "Utilizator",
    logoUrl: "/brands/applications/google-symbol.svg",
    logoMode: "mark",
    note: "Drive, Docs, Sheets și integrarea dedicată Meet sunt planificate; conectarea contului nu le activează."
  },
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    category: "Comunicare",
    stage: "next",
    description: "Outlook Mail, Calendar și context Microsoft într-o singură conexiune pentru echipe B2B.",
    capabilities: ["Outlook Mail", "Calendar", "OneDrive", "SharePoint", "Teams"],
    useCases: [
      { label: "Inbox Comercial", detail: "Conversații Outlook autorizate legate de contextul comercial." },
      { label: "Meeting Briefs", detail: "Întâlniri și participanți folosiți pentru pregătirea întâlnirilor." },
      { label: "Ask ReveNew", detail: "Context Microsoft disponibil pentru întrebări și analiză verificabilă." }
    ],
    permissions: ["Mail read", "Calendar read", "Teams context — doar unde este autorizat"],
    scope: "Workspace",
    logoUrl: "/brands/applications/microsoft-365.svg",
    logoMode: "mark",
    note: "Primul connector recomandat după Google Workspace."
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "CRM",
    stage: "next",
    description: "Leagă Companies, Contacts și Deals de motorul comercial ReveNew fără să dubleze CRM-ul.",
    capabilities: ["Companies", "Contacts", "Deals", "Webhooks"],
    useCases: [
      { label: "Commercial Graph", detail: "Normalizează companii, contacte și deal-uri în contextul ReveNew." },
      { label: "Intervention Engine", detail: "Schimbările relevante din CRM pot deveni semnale comerciale." },
      { label: "Workflows", detail: "Evenimentele CRM pot alimenta reguli și lucru pregătit." }
    ],
    permissions: ["CRM objects read", "Webhooks", "Write doar dacă va fi aprobat explicit într-un pass viitor"],
    scope: "Workspace",
    logoUrl: "/brands/applications/hubspot.svg",
    logoMode: "mark"
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    category: "CRM",
    stage: "next",
    description: "Conectează Deals, Organizations, People și Activities la contextul de execuție comercială.",
    capabilities: ["Deals", "Organizations", "People", "Activities"],
    useCases: [
      { label: "Pipeline context", detail: "Păstrează stadiile și activitatea comercială aliniate cu ReveNew." },
      { label: "Next action", detail: "Identifică oportunități fără pas următor sau cu follow-up restant." },
      { label: "Ask ReveNew", detail: "Permite analiză peste contextul CRM autorizat." }
    ],
    permissions: ["CRM read", "Activities read", "Webhooks după configurare"],
    scope: "Workspace",
    logoUrl: "/brands/applications/pipedrive.svg",
    logoMode: "wordmark"
  },
  {
    id: "slack",
    name: "Slack",
    category: "Comunicare",
    stage: "next",
    description: "Aduce intervenții și aprobări în spațiul de lucru al echipei, fără execuție comercială autonomă.",
    capabilities: ["Notifications", "Ask ReveNew", "Workflow triggers"],
    useCases: [
      { label: "Intervention alerts", detail: "Livrează notificări pentru situațiile care chiar necesită atenție." },
      { label: "Approvals", detail: "Direcționează utilizatorul către ReveNew pentru control și aprobare." },
      { label: "Ask ReveNew", detail: "Extensie viitoare pentru interogări controlate din Slack." }
    ],
    permissions: ["Workspace identity", "Selected channels", "Notifications"],
    scope: "Workspace",
    logoUrl: "/brands/applications/slack.svg",
    logoMode: "mark"
  },
  {
    id: "docusign",
    name: "Docusign",
    category: "Contracte",
    stage: "planned",
    description: "Transformă starea acordurilor și a semnăturilor într-un semnal comercial verificabil.",
    capabilities: ["Envelope status", "Signatures", "Webhooks"],
    useCases: [
      { label: "Contract state", detail: "Detectează acorduri trimise, vizualizate, semnate sau blocate." },
      { label: "Commercial signal", detail: "Schimbarea stării poate actualiza prioritatea intervenției." },
      { label: "Audit", detail: "Păstrează proveniența semnalului în istoricul comercial." }
    ],
    permissions: ["Envelope status read", "Webhook events", "No signing on behalf of users"],
    scope: "Workspace",
    logoUrl: "/brands/applications/docusign.svg",
    logoMode: "wordmark"
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "CRM",
    stage: "planned",
    description: "Context enterprise din Accounts, Contacts și Opportunities, cu trasabilitate și control.",
    capabilities: ["Accounts", "Contacts", "Opportunities"],
    useCases: [
      { label: "Enterprise CRM", detail: "Leagă obiectele Salesforce de Commercial Graph." },
      { label: "Execution intelligence", detail: "Starea CRM poate alimenta Intervention Engine și Ask." },
      { label: "Auditability", detail: "Păstrează sursa și momentul fiecărui fapt sincronizat." }
    ],
    permissions: ["CRM object read", "Change events / webhooks", "Write separat și numai cu control explicit"],
    scope: "Workspace",
    logoUrl: "/brands/applications/salesforce.svg",
    logoMode: "wordmark"
  },
  {
    id: "webhooks-api",
    name: "API & Webhooks",
    category: "Platformă",
    stage: "planned",
    description: "Conectează sisteme interne cu ReveNew prin evenimente și API-uri auditate.",
    capabilities: ["Inbound events", "Outbound webhooks", "Service API"],
    useCases: [
      { label: "Custom signals", detail: "Primește evenimente din ERP, billing sau sisteme interne." },
      { label: "Outbound events", detail: "Livrează schimbări ReveNew către infrastructura companiei." },
      { label: "Enterprise extensibility", detail: "Permite integrarea fără a cere un connector dedicat." }
    ],
    permissions: ["Scoped API keys", "Signed webhooks", "Explicit event contracts"],
    scope: "Workspace",
    logoUrl: null,
    note: "Pentru implementări enterprise și sisteme interne."
  }
];

export const integrationStageLabels: Record<IntegrationStage, string> = {
  implemented: "Disponibil",
  next: "În curând",
  planned: "Planificat"
};
