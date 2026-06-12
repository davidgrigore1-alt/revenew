import type { Business, Opportunity } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

function serviceLine(business: Business) {
  return business.services.slice(0, 3).join(", ") || "servicii B2B adaptate contextului comercial";
}

function contactLine(opportunity: Opportunity) {
  return opportunity.contact
    ? `${opportunity.contact.name}, ${opportunity.contact.role}${opportunity.contact.company ? ` la ${opportunity.contact.company}` : ""}`
    : `echipa responsabila de oportunitatea din ${opportunity.city}`;
}

export function generateOutreachEmail(opportunity: Opportunity, business: Business) {
  const subject =
    opportunity.type === "grant"
      ? `Clarificare oportunitate si eligibilitate pentru ${business.name}`
      : `Propunere colaborare pentru ${opportunity.city}/${opportunity.county}`;

  return `Subject: ${subject}

Buna ziua,

Va contactez in legatura cu oportunitatea "${opportunity.title}", unde contextul descris indica o nevoie concreta ce poate fi abordata prin serviciile ${business.name}.

Din profilul oportunității, înțelegem că sunt importante disponibilitatea, viteza de răspuns și o soluție comerciala clara pentru zona ${opportunity.city}/${opportunity.county}. ${business.name} poate susține acest tip de situație prin ${serviceLine(business)}, cu o abordare adaptata duratei, volumului și condițiilor operaționale.

Pentru o prima evaluare, putem pregati o varianta estimativa in intervalul ${formatCurrency(opportunity.estimatedValueLow)} - ${formatCurrency(opportunity.estimatedValueHigh)}, in functie de cerintele finale, termenul disponibil si resursele necesare.

Dacă este relevant, propun o discutie de 10-15 minute pentru a confirma contextul, disponibilitatea și pașii următori. Îmi puteți indica, va rog, o fereastra potrivita sau persoana responsabila pentru aceasta solicitare?

Cu stima,
${business.name}`;
}

export function generateCallScript(opportunity: Opportunity, business: Business) {
  return `Script apel - ${opportunity.title}

Contact vizat: ${contactLine(opportunity)}

1. Deschidere
Buna ziua, sunt de la ${business.name}. Va contactez in legatura cu oportunitatea "${opportunity.title}". Am vrut sa verific rapid daca subiectul este încă activ si cine coordoneaza discutia comerciala.

2. Intrebari de calificare
- Care este nevoia principala pe care doriti sa o acoperiti?
- Care este termenul real pentru decizie sau livrare?
- Există un volum estimativ, o perioada de utilizare sau un buget orientativ?
- Cine valideaza oferta si conditiile comerciale?

3. Propunere de valoare
${business.name} poate pregati o varianta structurata pentru ${serviceLine(business)}, adaptata contextului din ${opportunity.city}/${opportunity.county} si intervalului estimativ ${formatCurrency(opportunity.estimatedValueLow)} - ${formatCurrency(opportunity.estimatedValueHigh)}.

4. Inchidere
Daca informatiile sunt suficiente, putem reveni cu o propunere initiala. Care este cel mai bun canal pentru trimiterea detaliilor si cand ar fi util sa revenim cu follow-up?`;
}

export function generateOfferDraft(opportunity: Opportunity, business: Business) {
  return `Draft oferta - ${opportunity.title}

Context
${opportunity.summary}

Solutie propusa
${business.name} propune o solutie bazata pe ${serviceLine(business)}, adaptata cerintelor comerciale, locatiei ${opportunity.city}/${opportunity.county} si termenului ${formatDate(opportunity.deadline)}.

Beneficii comerciale
- Raspuns structurat pentru o nevoie deja identificata.
- Claritate asupra serviciilor, termenelor si conditiilor de livrare.
- Posibilitatea de ajustare in functie de volum, durata si disponibilitate.
- Reducerea timpului necesar pentru validarea unei prime variante comerciale.

Estimare / interval de valoare
Interval orientativ: ${formatCurrency(opportunity.estimatedValueLow)} - ${formatCurrency(opportunity.estimatedValueHigh)}.
Estimarea finală depinde de cerințele confirmate, calendar, volum și condiții operaționale.

Pasi urmatori
1. Confirmarea contactului și a persoanei decidente.
2. Validarea nevoii, termenului si criteriilor comerciale.
3. Verificarea disponibilitatii interne si a conditiilor de livrare.
4. Trimiterea unei oferte finale cu pret, termen si conditii.
5. Programarea unui follow-up pentru clarificari si decizie.`;
}

export function generateChecklist(opportunity: Opportunity, business: Business) {
  const procurement = opportunity.type === "public_procurement";
  const grant = opportunity.type === "grant";

  return `Checklist operational - ${opportunity.title}

- Verifica persoana de contact: ${contactLine(opportunity)}.
- Confirmă nevoia reală și contextul comercial.
- Verifica termenul limita: ${formatDate(opportunity.deadline)}.
- Confirmă locația principală: ${opportunity.city}/${opportunity.county}.
- Verifica disponibilitatea pentru serviciile relevante: ${serviceLine(business)}.
- Pregătește intervalul orientativ: ${formatCurrency(opportunity.estimatedValueLow)} - ${formatCurrency(opportunity.estimatedValueHigh)}.
- Stabileste urmatorul pas: email, apel, oferta sau clarificare.
- Programează follow-up la 48 de ore dupa primul contact.
${procurement ? "- Verifică documentele obligatorii, criteriile de calificare, garanțiile și termenii procedurii.\n" : ""}${grant ? "- Verifică eligibilitatea, documentele financiare și condițiile programului de finanțare.\n" : ""}- Notează concluzia în statusul oportunității.`;
}

export function generateFollowUpMessage(opportunity: Opportunity, business: Business) {
  return `Subject: Follow-up pentru ${opportunity.title}

Buna ziua,

Revin cu un follow-up legat de oportunitatea "${opportunity.title}".

${business.name} poate pregati o propunere initiala pentru ${serviceLine(business)}, in functie de cerintele finale, termen si disponibilitate. Din informatiile disponibile, contextul pare relevant pentru zona ${opportunity.city}/${opportunity.county} si merita validat intr-o discutie scurta.

Dacă subiectul este încă activ, putem discuta 10-15 minute pentru a confirma nevoia și pașii următori. Alternativ, ne puteți trimite câteva detalii suplimentare pentru a reveni cu o variantă orientativă.

Cu stima,
${business.name}`;
}
