# Arhitectura informațională ReveNew v1

## Scop

Acest document fixează rolul fiecărei suprafețe din produs și regula de prioritate a informației. Nu schimbă modelul de date, permisiunile sau fluxurile. Obiectivul este ca un utilizator să înțeleagă în mai puțin de 30 de secunde ce contează, de ce, ce dovadă există și care este următoarea acțiune sigură.

## Modelul principal de navigare

Navigarea existentă rămâne sursa de adevăr și nu primește destinații noi:

1. **Control** — Control Center și Activitatea mea.
2. **Flux comercial** — Inbox Comercial, Aprobări, Oportunități, Recuperare venituri și Pipeline.
3. **Inteligență** — Inteligență operațională.
4. **Relații** — Companii și Contacte.
5. **Execuție** — Documente.
6. **Management** — Rapoarte.
7. **Utilitare** — Setări și Ajutor.

Regulă: bara laterală răspunde la „unde lucrez?”, antetul răspunde la „care este scopul paginii?”, iar primul bloc de conținut răspunde la întrebarea comercială a paginii. Numele companiei active apare în bara laterală pe desktop și în antet numai când bara laterală nu este vizibilă.

## Harta scopului paginilor

| Rută | Rol unic | Întrebarea din primul ecran | Conținut primar | Conținut secundar |
| --- | --- | --- | --- | --- |
| `/dashboard` | centru de control executiv | Ce merită atenție acum? | brief executiv, prima acțiune sigură, valoare estimată și dovadă | registre și indicatori operaționali |
| `/today` | lista personală de execuție | Ce trebuie să fac eu? | acțiuni restante și urgente atribuite | acțiuni viitoare și finalizate |
| `/inbox` | triajul informației noi | Ce informație nouă cere revizuire? | semnal selectat, dovadă, lipsuri, acțiune sigură | restul semnalelor și importul |
| `/approvals` | controlul deciziilor umane | Ce trebuie decis de o persoană? | propunerea selectată și efectul exact | istoricul deciziilor |
| `/opportunities` | registrul inițiativelor comerciale | Ce oportunități sunt urmărite? | căutare, filtre și listă cu stare, responsabil, valoare și pas următor | creare, import și analiză |
| `/opportunities/[id]` | centrul de lucru al oportunității | Ce blochează progresul și ce facem sigur acum? | titlu, stare, valoare estimată, responsabil, termen, acțiune și dovezi | istoric, documente, contacte și formulare |
| `/recoverable` | coada lucrărilor comerciale expuse | Ce oportunități pot pierde valoare prin întârziere sau lipsuri? | prioritate, motiv, valoare estimată deduplicată și rută de intervenție | metodologie și pregătire asistată |
| `/pipeline` | poziționare pe etape | Unde se află oportunitățile active? | distribuție și oportunități pe etapă | schimbări de stare și rezultate |
| `/ai` | analiză controlată | Ce pot întreba, descoperi și decide pe baza dovezilor? | Întreabă → Descoperă → Decide | registrul de capabilități și limite |
| `/companies` | registrul organizațiilor | Ce companie caut? | căutare și relații comerciale | creare și editare |
| `/crm/organizations/[id]` | Company 360 și memorie comercială | Ce trebuie să știm și să nu uităm despre relație? | identitate, memorie, bucle deschise, acțiune și dovezi | întrebare contextuală, contacte și oportunități |
| `/contacts` | registrul persoanelor | Cine participă în relațiile comerciale? | căutare, rol și companie | creare și editare |
| `/outreach` și `/documents` | controlul materialelor comerciale | Ce document trebuie revizuit sau aprobat? | stare, conținut și control uman | arhivă și legătura cu oportunitatea |
| `/reports` | imagine executivă asupra rezultatelor și tiparelor | Ce este estimat, expus și confirmat? | cele trei valori distincte și deciziile aferente | indicatori detaliați și export |
| `/reports/revenue-recovery-audit` | audit executiv | Ce risc comercial este susținut de dovezi? | priorități, valoare estimată deduplicată, acțiune sigură | metodologie și dovezi detaliate |
| `/reports/enterprise-pilot-pack` | propunere de pilot controlat | Ce validăm în 14 zile și cine decide? | scop, criterii, aport client și primul pas | plan și condiții de continuare |
| `/reports/pilot-proof-of-value` | configurarea, măsurarea și concluzia pilotului | Ce s-a schimbat în aceeași cohortă, pe definiții înghețate? | contract, baseline imuabil, situație finală, criterii și schimbări verificate | dovezi, limitări și discuția continuă/ajustează/oprește |
| `/settings` | configurarea produsului și a accesului | Ce poate fi configurat și de cine? | aspect, identitate, companie, echipă și acces | capacitate, confidențialitate și date locale de dezvoltare pliate |
| `/help` | orientare operațională | Cum folosesc sigur fluxul relevant? | traseu real și întrebări după decizie | audit controlat și ghiduri |
| `/demo` | poveste de demonstrație controlată | Care este problema și traseul de validare? | problema comercială, lumea demonstrativă și prima decizie | traseul complet, audit și pilot |

Rutele de onboarding, activare, administrare și instrumente își păstrează rolurile existente. Ele nu intră în navigarea comercială principală și nu trebuie să concureze cu fluxul de mai sus.

## Proprietatea faptelor și duplicări

### Contextuale și utile

- Valoarea estimată apare în listă, detaliu, coada de recuperare și rapoarte deoarece răspunde unor decizii diferite; eticheta trebuie să precizeze dacă este „în pipeline” sau „expusă”.
- Controlul uman apare lângă aprobări, documente și recomandări deoarece este o limită operațională locală, nu o declarație decorativă.
- Dovada apare compact lângă recomandare și complet în timeline/audit.
- Starea și acțiunea următoare apar în listă pentru scanare și în detaliu pentru execuție.

### Redundante și de redus

- Numele companiei active nu trebuie repetat simultan în bara laterală și antet pe desktop.
- Ghidul contextual nu trebuie să împingă decizia principală sub primul ecran; rămâne disponibil prin dezvăluire progresivă.
- Rezumatele de număr și valoare nu trebuie repetate în mai multe carduri pe aceeași pagină fără o decizie distinctă.
- Etichetele de secțiune, pictogramele și badge-urile nu se folosesc dacă titlul și poziția transmit deja sensul.

### Potențial conflictuale

- „Valoare estimată în pipeline”, „valoare estimată expusă” și „venit confirmat” nu sunt interschimbabile și nu se însumează între monede.
- O oportunitate cu mai multe blocaje poate apărea în mai multe priorități, dar valoarea ei este numărată o singură dată în totalurile expuse.
- Starea oportunității, starea acțiunii, starea aprobării și starea documentului sunt vocabulare diferite; nu se comprimă într-un singur status generic.
- Descoperirile, recomandările și răspunsurile la întrebări pot folosi aceleași dovezi, dar trebuie să aibă scopuri diferite: detectare, decizie, respectiv interogare.

## Vocabular de stare

| Obiect | Stări prezentate utilizatorului | Semnificație |
| --- | --- | --- |
| oportunitate | Propunere, În lucru, Câștigată, Pierdută, Ignorată | ciclul comercial |
| atenție | În risc, Restant, Blocat, Fără responsabil, Fără acțiune următoare | motivul intervenției |
| acțiune | De făcut, În lucru, Finalizată | execuția internă |
| aprobare | De aprobat, Aprobată, Respinsă, Expirată | decizia umană |
| document | Draft, De revizuit, Aprobat, Pregătit, Trimis extern, Arhivat | utilizarea materialului |
| dovadă | Disponibilă, Insuficientă, Lipsește | nivelul de susținere al unei afirmații |

Regulă: starea folosește badge numai când ajută scanarea sau previne o interpretare greșită. Metadatele neutre rămân text.

## Ierarhia suprafețelor

1. **Decizie** — un singur bloc dominant: risc, valoare contextualizată, acțiune sigură și control.
2. **Execuție** — liste, tabele, formulare pliate și controale necesare lucrului.
3. **Dovadă** — sursa scurtă lângă afirmație; detaliul în timeline sau audit.
4. **Context** — explicații, metodologie, registre și ajutor prin dezvăluire progresivă.

Cardurile delimitează o unitate de decizie sau interacțiune, nu fiecare grup de text. Divizoarele și spațiul înlocuiesc cardurile imbricate atunci când informația aparține aceleiași unități.

## Antet și primul ecran

- Un singur `h1`, urmat de o propoziție de scop.
- Maximum o acțiune primară; acțiunile secundare sunt vizual mai calme.
- Eticheta de context nu este scrisă agresiv cu majuscule și spațiere mare.
- La 1280×720 trebuie să fie vizibil începutul conținutului primar, nu doar antetul și ajutorul.
- Ajutorul contextual este pliat implicit și poate fi închis persistent.

## Motion semantic

| Rol | Durată | Utilizare |
| --- | --- | --- |
| feedback | 70–120 ms | hover, focus, apăsare |
| reveal | 120–180 ms | conținut pliat și indicatori |
| content | 160–220 ms | apariția unui rezultat local |
| panel | 180–280 ms | drawer, modal, comandă |
| page | 120–180 ms | fade și deplasare verticală de maximum 4 px |

Mișcarea nu schimbă ordinea informației, nu întârzie acțiunea și nu rulează continuu în aplicația autentificată. `prefers-reduced-motion` anulează animațiile și tranzițiile.

## Capabilități protejate

Simplificarea trebuie să păstreze: Executive Brief, căutarea universală, Ask ReveNew, descoperirile comerciale, timeline-ul oportunității, memoria comercială Company 360, Explain Everything și Living Demo. Acestea pot fi mutate în ierarhie sau pliate, dar nu eliminate și nu transformate în afirmații fără dovadă.

## Criteriu de acceptare

O modificare trece filtrul de arhitectură numai dacă reduce timpul de căutare, clarifică o diferență de metrică/stare, face dovada mai accesibilă sau conduce spre o acțiune sigură. O schimbare pur decorativă nu este suficientă.
