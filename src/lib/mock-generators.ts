import type { Business, Opportunity } from "@/lib/types";
import { cleanCommercialLongText, cleanCommercialText, missingDataItems } from "@/lib/text/signal-quality";
import { formatCurrency, formatDate } from "@/lib/utils";

function serviceLine(business: Business) {
  return business.services.slice(0, 3).map((item) => cleanCommercialText(item, "")).filter(Boolean).join(", ") || "servicii B2B adaptate contextului comercial";
}

function contactLine(opportunity: Opportunity) {
  if (!opportunity.contact) return "persoana responsabilă de decizie trebuie confirmată";
  return `${cleanCommercialText(opportunity.contact.name, "contact neconfirmat")}${opportunity.contact.role ? `, ${cleanCommercialText(opportunity.contact.role)}` : ""}${opportunity.contact.company ? ` la ${cleanCommercialText(opportunity.contact.company)}` : ""}`;
}

function locationLine(opportunity: Opportunity) {
  return [opportunity.city, opportunity.county].map((item) => cleanCommercialText(item, "")).filter(Boolean).join(" / ") || "locație de confirmat";
}

function valueLine(opportunity: Opportunity) {
  if (!opportunity.estimatedValueHigh && !opportunity.estimatedValueLow) return "valoare de confirmat";
  return `${formatCurrency(opportunity.estimatedValueLow)} - ${formatCurrency(opportunity.estimatedValueHigh)}`;
}

function missingData(opportunity: Opportunity) {
  return missingDataItems([
    ["persoana responsabilă de decizie", opportunity.contact?.name],
    ["criteriile comerciale finale", opportunity.recommendedAction],
    ["termenul final pentru răspuns", opportunity.deadline],
    ["valoarea sau volumul estimat", opportunity.estimatedValueHigh]
  ]);
}

function confirmationBlock(opportunity: Opportunity) {
  const items = missingData(opportunity);
  if (!items.length) return "De confirmat înainte de trimitere:\n- condițiile finale, disponibilitatea și persoana care validează oferta.";
  return `De confirmat înainte de trimitere:\n${items.map((item) => `- ${item};`).join("\n")}`;
}

export function generateOutreachEmail(opportunity: Opportunity, business: Business) {
  const title = cleanCommercialText(opportunity.title, "oportunitatea identificată");
  const subject =
    opportunity.type === "grant"
      ? `Clarificare eligibilitate și pași următori pentru ${business.name}`
      : `Propunere de discuție pentru ${locationLine(opportunity)}`;

  return `Subiect: ${subject}

Bună ziua,

Vă contactez în legătură cu "${title}". Din informațiile disponibile, pare să existe o nevoie comercială care merită clarificată înainte de pregătirea unei oferte.

${business.name} poate susține acest context prin ${serviceLine(business)}, cu o abordare adaptată locației ${locationLine(opportunity)} și intervalului orientativ ${valueLine(opportunity)}.

Propun o discuție scurtă de 10-15 minute pentru a confirma nevoia, calendarul și pașii următori. Îmi puteți indica, vă rog, persoana potrivită sau o fereastră bună pentru discuție?

${confirmationBlock(opportunity)}

Cu stimă,
${business.name}`;
}

export function generateCallScript(opportunity: Opportunity, business: Business) {
  const title = cleanCommercialText(opportunity.title, "oportunitatea identificată");

  return `Script apel - ${title}

Obiectiv:
Confirmă dacă oportunitatea este activă, cine decide și ce informații sunt necesare pentru o propunere serioasă.

Contact vizat:
${contactLine(opportunity)}

Deschidere:
Bună ziua, sunt de la ${business.name}. Vă contactez în legătură cu "${title}". Aș vrea să confirm rapid dacă subiectul este încă activ și cine coordonează discuția comercială.

Întrebări de calificare:
- Care este nevoia principală pe care doriți să o acoperiți?
- Care este termenul real pentru decizie sau livrare?
- Există un volum estimativ, o perioadă de utilizare sau un buget orientativ?
- Cine validează oferta și condițiile comerciale?
- Ce criterii contează cel mai mult în alegerea furnizorului?

Răspunsuri la obiecții probabile:
- Dacă este prea devreme: putem trimite o propunere scurtă, fără angajament, pentru comparație internă.
- Dacă lipsesc detalii: revenim cu o listă clară de informații necesare.
- Dacă există deja furnizor: putem valida rapid dacă există o alternativă mai potrivită pentru context.

Închidere:
Dacă informațiile sunt suficiente, revenim cu o propunere inițială pentru ${serviceLine(business)}. Care este cel mai bun canal pentru detalii și când ar fi util un follow-up?

Note de capturat:
- decident;
- termen;
- volum;
- buget orientativ;
- criterii de selecție.`;
}

export function generateOfferDraft(opportunity: Opportunity, business: Business) {
  const title = cleanCommercialText(opportunity.title, "oportunitatea identificată");
  const summary = cleanCommercialLongText(opportunity.summary, "Contextul comercial trebuie confirmat înainte de oferta finală.");

  return `Draft ofertă - ${title}

Context oportunitate
${summary}

Scop propus
${business.name} propune o soluție bazată pe ${serviceLine(business)}, adaptată locației ${locationLine(opportunity)} și calendarului ${formatDate(opportunity.deadline)}.

Structură comercială orientativă
- Interval estimativ: ${valueLine(opportunity)}.
- Servicii incluse: ${serviceLine(business)}.
- Calendar și disponibilitate: de confirmat înainte de transmiterea ofertei finale.
- Condiții comerciale: de stabilit după validarea volumului, duratei și cerințelor operaționale.

Ipoteze
- Oportunitatea este încă activă.
- Datele din sursă trebuie validate cu persoana responsabilă.
- Oferta finală nu trebuie transmisă fără confirmarea criteriilor comerciale.

Elemente deschise
${confirmationBlock(opportunity)}

Pași următori
1. Confirmarea contactului și a persoanei decidente.
2. Validarea nevoii, termenului și criteriilor comerciale.
3. Verificarea disponibilității interne.
4. Pregătirea ofertei finale cu preț, termen și condiții.
5. Programarea unui follow-up pentru decizie.`;
}

export function generateChecklist(opportunity: Opportunity, business: Business) {
  const procurement = opportunity.type === "public_procurement";
  const grant = opportunity.type === "grant";
  const extra = [
    procurement ? "- Verifică documentele obligatorii, criteriile de calificare, garanțiile și termenii procedurii." : "",
    grant ? "- Verifică eligibilitatea, documentele financiare și condițiile programului de finanțare." : ""
  ].filter(Boolean).join("\n");

  return `Checklist operațional - ${cleanCommercialText(opportunity.title, "oportunitate")}

- Confirmă persoana de contact: ${contactLine(opportunity)}.
- Confirmă nevoia reală și contextul comercial.
- Verifică termenul limită: ${formatDate(opportunity.deadline)}.
- Confirmă locația principală: ${locationLine(opportunity)}.
- Verifică disponibilitatea pentru serviciile relevante: ${serviceLine(business)}.
- Pregătește intervalul orientativ: ${valueLine(opportunity)}.
- Notează informațiile lipsă înainte de ofertare.
- Stabilește următorul pas: email, apel, ofertă sau clarificare.
- Programează follow-up la 48 de ore după primul contact.
${extra ? `${extra}\n` : ""}- Actualizează statusul oportunității după contact.`;
}

export function generateFollowUpMessage(opportunity: Opportunity, business: Business) {
  return `Subiect: Follow-up pentru ${cleanCommercialText(opportunity.title, "oportunitatea discutată")}

Bună ziua,

Revin cu un follow-up legat de oportunitatea "${cleanCommercialText(opportunity.title, "oportunitatea discutată")}".

${business.name} poate pregăti o propunere inițială pentru ${serviceLine(business)}, în funcție de cerințele finale, termen și disponibilitate. Din informațiile disponibile, contextul pentru ${locationLine(opportunity)} merită validat într-o discuție scurtă.

Dacă subiectul este încă activ, putem discuta 10-15 minute pentru a confirma nevoia și pașii următori. Alternativ, ne puteți trimite detaliile lipsă pentru a reveni cu o variantă orientativă.

${confirmationBlock(opportunity)}

Cu stimă,
${business.name}`;
}
