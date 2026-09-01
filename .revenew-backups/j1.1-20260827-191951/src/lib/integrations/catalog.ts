export type IntegrationStage = "connected" | "next" | "planned";

export type IntegrationCatalogItem = {
  id: string;
  name: string;
  category: "Comunicare" | "CRM" | "Documente" | "Contracte" | "Platformă";
  stage: IntegrationStage;
  description: string;
  capabilities: string[];
  mark: string;
  brandColor: string;
  brandForeground: string;
  note?: string;
};

export const integrationCatalog: IntegrationCatalogItem[] = [
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    category: "Comunicare",
    stage: "next",
    description: "Outlook Mail, Calendar și context Microsoft într-o singură conexiune enterprise.",
    capabilities: ["Outlook Mail", "Calendar", "Teams context"],
    mark: "M",
    brandColor: "#ffffff",
    brandForeground: "#111827",
    note: "Prioritatea recomandată pentru următorul connector."
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "CRM",
    stage: "next",
    description: "Sincronizează companii, contacte, deal-uri și schimbări CRM relevante pentru execuție.",
    capabilities: ["Companies", "Contacts", "Deals", "Webhooks"],
    mark: "H",
    brandColor: "#ff7a59",
    brandForeground: "#ffffff"
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    category: "CRM",
    stage: "next",
    description: "Leagă deal-uri, organizații, persoane și activități de motorul de intervenții ReveNew.",
    capabilities: ["Deals", "Organizations", "People", "Activities"],
    mark: "P",
    brandColor: "#1f2d3d",
    brandForeground: "#ffffff"
  },
  {
    id: "slack",
    name: "Slack",
    category: "Comunicare",
    stage: "next",
    description: "Notificări comerciale controlate și acces la Ask ReveNew din spațiul de lucru al echipei.",
    capabilities: ["Notifications", "Ask ReveNew", "Workflow triggers"],
    mark: "S",
    brandColor: "#4a154b",
    brandForeground: "#ffffff"
  },
  {
    id: "google-drive",
    name: "Google Drive",
    category: "Documente",
    stage: "planned",
    description: "Context pentru oferte, propuneri și documente comerciale autorizate.",
    capabilities: ["Files", "Proposals", "Contracts"],
    mark: "D",
    brandColor: "#f8fafc",
    brandForeground: "#1f2937"
  },
  {
    id: "docusign",
    name: "DocuSign",
    category: "Contracte",
    stage: "planned",
    description: "Folosește starea acordurilor și semnăturilor ca semnal comercial verificabil.",
    capabilities: ["Envelope status", "Signatures", "Webhooks"],
    mark: "D",
    brandColor: "#2f67f6",
    brandForeground: "#ffffff"
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "CRM",
    stage: "planned",
    description: "Context enterprise din Accounts, Contacts și Opportunities, fără dublarea CRM-ului.",
    capabilities: ["Accounts", "Contacts", "Opportunities"],
    mark: "SF",
    brandColor: "#0d9dda",
    brandForeground: "#ffffff"
  },
  {
    id: "webhooks-api",
    name: "API & Webhooks",
    category: "Platformă",
    stage: "planned",
    description: "Primește semnale din sisteme interne și livrează evenimente ReveNew către infrastructura companiei.",
    capabilities: ["Inbound events", "Outbound webhooks", "Service API"],
    mark: "{}",
    brandColor: "#17181a",
    brandForeground: "#f5f5f5",
    note: "Potrivit pentru implementări enterprise și sisteme interne."
  }
];

export const integrationStageLabels: Record<IntegrationStage, string> = {
  connected: "Conectat",
  next: "Prioritate următoare",
  planned: "Planificat"
};
