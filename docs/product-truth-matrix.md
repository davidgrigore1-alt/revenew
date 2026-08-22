# Matricea de adevăr a produsului

Stare verificată pentru sprintul comercial buyer-ready. „Disponibil” înseamnă implementat în produs; nu înseamnă că orice provider sau integrare este configurată în fiecare mediu. Valorile estimate rămân separate de venitul confirmat, iar acțiunile cu efect extern cer control uman.

| Capabilitate | Stare | Date reale | AI | Efect extern | Aprobare umană | Audit | Sigură pentru producție | Limită curentă |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Control Center | Disponibil | Da | Asistat | Nu | Da | Da | Da | Calitatea depinde de completarea responsabilului, acțiunii și dovezilor. |
| Recovery Queue | Disponibil | Da | Nu | Nu | Da | Da | Da | Prioritizează excepții verificabile; nu prezice probabilitatea de închidere. |
| Commercial Inbox | Disponibil | Da | Opțional | Nu | Da | Da | Da | Importul creează semnale de revizuit, nu oportunități automate. |
| Opportunities | Disponibil | Da | Asistat | Nu | Da | Da | Da | Starea comercială este derivată din datele înregistrate, nu din surse externe live. |
| Company 360 / Business Memory | Disponibil | Da | Determinist | Nu | Da | Da | Da | Memoria este limitată la dovezile tenantului și nu substituie sursele originale. |
| Ask ReveNew | Disponibil | Da | Da, cu fallback determinist | Nu | Da | Da, operațional | Da | Providerul poate lipsi; răspunsul se restrânge la datele autorizate și dovezi. |
| Analiză AI de oportunitate | Disponibil | Da | Da | Nu | Da | Da, prin artefactele salvate | Da | Recomandarea nu execută acțiuni și nu garantează venit. |
| Drafturi de follow-up | Disponibil | Da | Da | Nu | Da | Da | Da | Draftul rămâne intern până la aprobarea explicită. |
| Trimitere aprobată | Disponibilă numai în modul configurat | Da | Nu este necesar | Da | Obligatorie | Da | Condiționat | Necesită provider de email configurat și confirmare finală; nu există trimitere autonomă. |
| Răspuns și rezultat comercial | Disponibil | Da | Nu | Nu | Da | Da | Da | Rezultatul este confirmat numai prin înregistrare umană; estimarea nu devine automat venit. |
| Import CSV controlat | Disponibil | Da | Nu | Nu | Da | Da | Da | Maximum 1.000 de rânduri per lot; fișierul trebuie mapat și revizuit. |
| Guvernanță enterprise | Parțial disponibilă | Da | Nu | Nu | Da | Da | Condiționat | Izolarea, rolurile și controalele există; achiziția enterprise cere încă validări organizaționale și juridice. |
| Document Intelligence | Parțial disponibilă | Da | Asistat | Nu | Da | Da | Da pentru pregătire internă | Nu există OCR sau ingestie automată a documentelor externe. |
| Voice | Neimplementat live | Nu | Nu | Nu | — | — | Nu | Există doar concepte/sandbox-uri locale; fără telefonie sau apeluri reale. |
| Gmail | Neimplementat live | Nu | Nu | Nu | — | — | Nu | Fără OAuth, citire inbox, creare draft Gmail sau trimitere Gmail. |
| Google Calendar | Neimplementat live | Nu | Nu | Nu | — | — | Nu | Sandbox-ul nu citește disponibilitate și nu creează evenimente reale. |
| Semnale externe automate | Neimplementat live | Nu | Nu | Nu | — | — | Nu | Semnalele provin din introducere/import controlat, nu din monitorizare web autonomă. |
| Automatizare workflow | Limitată la pași interni controlați | Da | Nu | Nu | Da | Da | Da | Nu există agent autonom care schimbă stări sau contactează clienți fără aprobare. |
| Pilot comercial controlat | Disponibil cu baseline și situație finală imuabile | Da | Nu este necesar | Nu | Obligatorie | Da | Da | Cohorta, criteriile, politica și fusul orar sunt înghețate la baseline; comparația folosește aceeași cohortă și nu atribuie cauzalitate. |

## Reguli de prezentare

- Nu prezenta estimarea ca venit confirmat, ROI ori rezultat garantat.
- Nu afirma că Gmail, Calendar, Voice sau semnalele externe live sunt active.
- Pentru o demonstrație comercială folosește date fictive sau un spațiu de lucru autorizat și anonimizat.
- Orice mesaj extern, rezultat sau schimbare comercială materială rămâne sub control uman și trebuie să lase dovadă auditabilă.
