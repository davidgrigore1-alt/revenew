# ReveNew — Revizuire comercială (G3E)

## Scop și parcurs

Vederea `/dashboard?view=review` completează **Acum | Brief executiv | Revizuire comercială**, fără un element nou în sidebar. Unitatea de atenție este decizia de management, nu fiecare semnal sau oportunitate.

Înainte: orientare compactă și „Începe revizuirea”. În timpul revizuirii: agendă și detaliu alăturat, navigare explicită între decizii. După: numărul deciziilor consultate și al deciziilor încă deschise. Nu este afișat un număr presupus de „rezolvări”. Progresul de navigare este temporar; checkpoint-ul este persistent.

## Arhitectură și surse

`getRevenueCommand` încarcă metadate interne autorizate; `assembleRevenueCommand` reutilizează `buildOpportunityCommercialState` și agregarea G3C. `projectCommercialReview` adaugă formularea deciziei, condiția de finalizare, continuitatea și ordinea informațiilor. Nu există un motor nou de truth, impact sau dovezi.

Surse: opportunities, opportunity_actions, opportunity_events, commercial_signals și evenimentele lor, metadatele opportunity_documents, commercial_workflow_runs, executive_review_checkpoints și registrul G3C. Nu se încarcă textul documentelor, emailurilor sau calendarului.

## Decizii, grupare și prioritate

O singură decizie principală per oportunitate; simptomele suplimentare rămân în detaliu. Oportunitățile sănătoase și lipsurile de metadate neesențiale nu umplu agenda.

| Situație | Se închide prin |
| --- | --- |
| Aprobare necesară | Decizie umană în sursa de aprobare; alte aprobări încă deschise rămân blocaje |
| Contactare restricționată | Clarificarea autorizată a restricției, niciodată prin terminarea revizuirii |
| Acțiune restantă | Finalizare, anulare sau reprogramare reală; restanțele independente rămân |
| Responsabil lipsă | Atribuirea unui responsabil valid |
| Pas lipsă / termen neconfirmat | Pas comercial și termen viitor confirmate; o acțiune fără termen nu este prezentată ca inexistentă |
| Intervenție neconfirmată | Confirmare în sursa documentului/acțiunii sau în G3C |
| Rezultat neverificat | Verificare ori invalidare explicită prin regulile G3C |
| Inactivitate | Activitate comercială relevantă în istoricul canonic |

Ordine: decizie umană blocantă, restanță, responsabil/pas lipsă, material pregătit, verificare rezultat, inactivitate. Termenul departajează înaintea valorii; suma se compară numai în aceeași monedă. Monedele distincte au ordine stabilă alfabetică, nu o comparație numerică. Fără scor AI.

Contradicțiile documentare nu au o proiecție persistentă sigură disponibilă în aceste surse. Nu sunt fabricate sau recalculate prin parsarea documentelor la încărcare. Investigația explicită rămâne disponibilă prin G3B/Ask.

## Revizuire și continuitate

Se reutilizează checkpoint-ul personal G3D: business, actor, scope și reviewed_through. Nu există un tabel G3E sau o copie a agendei.

Serverul semnează un tichet pentru starea încărcată, cu actor/business/scope, cutoff și request ID. Acțiunea verifică semnătura, contextul autentificat și limita de 30 de minute, apoi apelează numai `record_executive_review`. Refresh, modificarea scope-ului sau revocarea accesului nu pot fi compensate prin ID-uri trimise de browser.

„Rămasă deschisă de la ultima revizuire” apare numai dacă timestamp-urile înregistrării și sursei blocajului susțin continuitatea la cutoff. Pentru o modificare mai recentă, timestamp lipsă sau inactivitate apărută prin trecerea timpului, continuitatea nu este afirmată. Nu reconstruim o stare istorică absentă.

Încheierea nu aprobă, nu execută, nu modifică etape și nu verifică venit. Checkpoint-ul nu filtrează agenda curentă. Istoricul material este filtrat strict după cutoff și în intervalul ales. Un checkpoint anterior intervalului este semnalat explicit.

## Adevăr curent, istoric și impact

Starea curentă este recalculată; Before din G3C nu este modificat. Vector are Irina și acțiunea reprogramată în starea curentă, în timp ce Before păstrează responsabilul lipsă și restanța inițială.

Valoarea detectată este estimarea CRM a cazurilor deschise care necesită decizie. Cazurile închise care așteaptă verificarea rezultatului nu cresc această expunere. Intervențiile, valoarea protejată și venitul verificat provin exclusiv din agregarea G3C. Categoriile și monedele nu se adună. Rezultatul observat nu devine automat venit. Invalidarea ulterioară nu poate reînvia o sumă verificată.

## Ask și prospețime

Se reutilizează conversația și instrumentul `get_commercial_truth`. Întrebările de revizuire au răspuns determinist, citesc o proiecție autorizată proaspătă și indică momentul, intervalul și checkpoint-ul. Un ID selectat poate doar restrânge contextul. Un ID absent din selecție nu produce fallback la datele altei oportunități.

Investigațiile despre contradicții/documente păstrează traseul G3B explicit, la cerere. Pregătirea acțiunilor păstrează limitele existente. Contextul Ask folosește segmente cu două opțiuni, fără select nativ. Răspunsurile vechi sunt observații istorice, nu actualizări optimiste.

Se reutilizează invalidarea G3C.1 a `/dashboard` după atribuiri, acțiuni, aprobări și schimbări comerciale; G3C invalidează aceeași rută după verificări. Refresh reîncarcă proiecția. Nu s-a dezactivat global cache-ul.

## Autorizare, cost și limite

- Actorul și business-ul sunt rezolvate pe server. Proprietar/admin/manager: business; celelalte roluri: oportunități atribuite.
- RLS și filtrul business se păstrează; scope-ul owned filtrează oportunitățile înaintea interogării surselor asociate și impactului.
- Permisiuni distincte pentru acțiuni, documente, semnale/aprobări și audit workflow. Lipsa unei categorii produce stare parțială, nu absență presupusă.
- În configurația curentă, checkpoint-ul necesită inclusiv `workspace.audit.read` și o încărcare completă. Rolurile fără această permisiune pot consulta datele permise, dar nu încheia persistent revizuirea. Permisiunile nu au fost extinse.
- La încărcare: zero LLM, Google, download Drive, embedding sau furnizor extern. Există numai acces la baza internă și infrastructura existentă de autentificare.
- Maximum 80 oportunități; 1.000 acțiuni; 400 evenimente comerciale; 160 asocieri contacte; 240 semnale; 160 documente pregătite; 80 rulări workflow; 400 evenimente de aprobare. Interogările cer încă un rând pentru detectarea depășirii.
- G3C: maximum 250 cazuri / 2.000 evenimente, restrânse suplimentar la ID-urile autorizate; fără sume din lanțuri incomplete. Cazurile vechi încă neverificate rămân eligibile independent de interval.
- Cel mult 13 interogări de proiecție, fără autentificarea existentă; batch-uri fixe, fără N+1. Agenda 8; schimbări 20 pe server și 5 implicit; dovezi 4; progres 5.
- Portofoliile peste limite sunt selecții explicite, nu evaluări exhaustive. Checkpoint-ul este dezactivat când selecția de oportunități este trunchiată sau sursele necesare sunt incomplete.
- Un eveniment cu timestamp anterior cutoff-ului, dar comis ulterior, nu are garanție de cursor tranzacțional global; nu s-a introdus outbox sau scheduler.

## UI și accesibilitate

Trei niveluri: orientare, decizie, investigație progresivă. Suprafețe neutre, accentul champagne existent, fără grafice sau carduri KPI. Controale comune Button/ActionToolbar de 32px. O singură definiție de grid pentru antet, rânduri, selecție și stare goală, inclusiv spațiul bordurii de selecție. CTA specific per rând; detaliul trimite în tabul existent al acțiunii.

Navigare prin butoane și tab, focus vizibil, aria-pressed pentru selecție, etichete pentru grupuri, focus în titlul detaliului, regiuni de status/eroare și details native. Nu a fost necesar un dropdown nou; Select-ul global existent nu a fost rescris.

## Validare automată

Comandă țintită:

```text
node --test tests/commercial-decision-review-g3e.test.mjs tests/commercial-truth-g3b.test.mjs tests/revenue-impact-g3c.test.mjs tests/execution-control-center.test.mjs tests/real-ai-copilot-v1.test.mjs tests/authorization-surface.test.mjs
```

Rezultat: **112 teste, 111 reușite, 0 eșecuri, 1 omis**. Fișierul G3E: 40/40; test suplimentar de rutare în suita Ask. Testul PostgreSQL G3C necesită containerul opt-in și nu a fost executat. Contractul SQL al checkpoint-ului a fost verificat static; concurența și RLS-ul lui NU au fost validate într-un PostgreSQL real în această trecere.

Typecheck, lint și validate:security au trecut. Nu s-au rulat build, suita integrală, Browser QA, demo sau aplicări de migrații.

## Migrație și pași manuali

G3E nu adaugă/modifică migrații. Migrația G3D deja existentă, `20260828131036_executive_review_checkpoints.sql`, rămâne neaplicată și necesită review manual: RLS între două business-uri și utilizatori, roluri, scope, concurență, retry/replay, append-only și cutoff. Revizuiți migrația și baseline-ul prin procesul proiectului înainte de aplicare. Nu au fost calculate hash-uri, modificate baseline-uri sau aplicate migrații.

### Checklist manual — neexecutat

La **1920×1080** și **1440×900** verificați Acum, Brief executiv și Revizuire comercială; orientare, start, agendă, selecție, CTA/tab destinație, carry-over, schimbări, progres, dovada impactului, finish, refresh și Ask.

Verificați alinierea rândurilor și antetului, baseline-ul butoanelor, overflow, text lung, selecția vizibilă, lipsa select-urilor native, lipsa spațiului mort/cardurilor inutile, UTF-8 și clipping. Verificați tab/focus, tastatură, zoom și ecrane mai înguste. După configurarea checkpoint-ului, testați revizuire N → modificare → revizuire N+1 pe două sesiuni și roluri diferite.

## Fișiere G3E

- src/app/(protected)/dashboard/page.tsx
- src/components/dashboard/ControlCenterViews.tsx
- src/components/dashboard/CommercialDecisionReview.tsx (nou)
- src/components/dashboard/RevenueCommandBrief.tsx
- src/components/intelligence/CopilotConversation.tsx
- src/lib/commercial-decision-review.ts (nou)
- src/lib/revenue-command.ts
- src/lib/revenue-command-server.ts
- src/lib/revenue-command-review.ts
- src/lib/revenue-impact-server.ts
- src/lib/ai/revenue-command-answer.ts (nou)
- src/lib/ai/commercial-truth-answer.ts
- src/lib/ai/copilot-orchestrator.ts
- tests/commercial-decision-review-g3e.test.mjs (nou)
- tests/real-ai-copilot-v1.test.mjs
- docs/commercial-decision-room-g3e.md (nou)
- docs/revenue-command-g3d.md (documentarea dependenței locale)

## Amânat intenționat

Snapshot-uri ale agendei, note/sesiuni noi, istoric persistent al contradicțiilor, cursor global de evenimente, scheduler/digest, integrare nouă, forecast, probabilități, scoring AI, FX, execuție externă automată și atribuirea automată de ROI. Niciun commit, push sau deploy.
