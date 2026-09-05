import type { ImportEntityType } from "./actions";
type FieldDefinition = { key: string; label: string; required?: boolean; aliases: string[] };
export const crmImportFields: Record<ImportEntityType, FieldDefinition[]> = {
  organizations: [
    { key: "name", label: "Nume companie", required: true, aliases: ["name", "company", "companie", "organization", "organizatie"] },
    { key: "website", label: "Website / domeniu", aliases: ["website", "domain", "domeniu"] },
    { key: "industry", label: "Industrie", aliases: ["industry", "industrie"] },
    { key: "phone", label: "Telefon", aliases: ["phone", "telefon"] },
    { key: "city", label: "Oraș", aliases: ["city", "oras"] },
    { key: "county", label: "Județ", aliases: ["county", "judet"] },
    { key: "country", label: "Țară", aliases: ["country", "tara"] }
  ],
  contacts: [
    { key: "full_name", label: "Nume complet", required: true, aliases: ["full_name", "name", "nume", "contact"] },
    { key: "email", label: "Email", aliases: ["email", "e_mail"] },
    { key: "phone", label: "Telefon E.164", aliases: ["phone", "telefon"] },
    { key: "organization", label: "Companie existentă", aliases: ["organization", "company", "companie", "organizatie"] },
    { key: "job_title", label: "Funcție", aliases: ["job_title", "role", "functie"] },
    { key: "decision_role", label: "Rol de decizie", aliases: ["decision_role", "rol_decizie"] }
  ],
  opportunities: [
    { key: "title", label: "Titlu oportunitate", required: true, aliases: ["title", "opportunity", "oportunitate", "name"] },
    { key: "estimated_value", label: "Valoare estimată", aliases: ["estimated_value", "value", "valoare"] },
    { key: "currency", label: "Monedă", aliases: ["currency", "moneda"] },
    { key: "summary", label: "Context comercial", aliases: ["summary", "context", "descriere"] },
    { key: "next_action", label: "Următoarea acțiune", aliases: ["next_action", "actiune", "follow_up"] },
    { key: "owner_profile_id", label: "ID responsabil", aliases: ["owner_profile_id", "responsabil_id"] }
  ]
};