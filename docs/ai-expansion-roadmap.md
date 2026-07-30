# ReveNew AI Expansion Roadmap & Safe Action Control Plane v1

## Rezumat executiv

ReveNew poate evolua către un strat AI controlat pentru execuția operațională a afacerii, dar numai dacă fiecare capabilitate are un scop limitat, permisiuni explicite, dovezi, jurnal de audit și o limită clară între recomandare și acțiune.

Direcția de produs este:

> AI care ajută afacerile să acționeze mai repede, sub reguli de business, permisiuni, dovezi, audit și aprobare umană.

Acest document nu activează Gmail, Google Calendar, telefonie sau agenți autonomi. Nu există conectări live, apeluri, evenimente externe ori tokenuri OAuth implementate prin acest sprint. Primul audit ReveNew continuă să funcționeze pe un eșantion limitat și nu necesită acces complet la inbox, calendar sau CRM.

## Maturitatea AI actuală

### Disponibil intern

- Analistul business explică riscul comercial dintr-un pachet compact de dovezi și folosește fallback determinist când providerul nu este disponibil.
- ReveNew poate sugera următoarea acțiune și poate pregăti drafturi de follow-up pentru revizuire.
- Auditul de recuperare venituri și dovada de valoare structurează numai datele disponibile.
- Valorile estimate rămân separate de venitul confirmat.
- Acțiunile comerciale importante folosesc aprobări, permisiuni și urme de audit existente.

### Limitări actuale

- Gmail nu este conectat și ReveNew nu citește inboxul.
- Google Calendar nu este conectat și ReveNew nu citește sau creează evenimente.
- Nu există recepționer voice, telefonie, Twilio sau model voice în timp real.
- Nu există stocare de tokenuri OAuth.
- Nu există dreptul unei capabilități AI de a executa autonom efecte externe.

Registrul intern din `src/lib/ai-capabilities.ts` descrie starea, riscul și cerințele fiecărei capabilități. Este metadată internă și nu apelează furnizori.

## Principiile controlului acțiunilor AI

1. **Dovezi înainte de afirmație.** O recomandare comercială trebuie să indice datele care o susțin și informațiile lipsă.
2. **Domeniu minim.** Se transmit sau se citesc numai datele necesare sarcinii curente.
3. **Propunere înainte de execuție.** AI-ul explică, clasifică, pregătește sau propune înainte ca o acțiune să poată fi aprobată.
4. **Aprobare explicită pentru efecte externe.** Trimiterea, crearea unui eveniment și un apel real necesită aprobare umană și nu pot porni implicit.
5. **Separarea atribuțiilor.** Pentru acțiuni cu risc ridicat, solicitarea, aprobarea și execuția trebuie să poată fi atribuite și auditate distinct.
6. **Fail closed.** Lipsa dovezii, permisiunii, auditului, OAuth-ului sau stocării securizate blochează acțiunea.
7. **Idempotency și stare verificabilă.** O acțiune externă viitoare trebuie să poată fi reluată fără duplicare și să distingă propus, aprobat, executat, eșuat și revocat.
8. **Tenant derivat pe server.** Identitatea spațiului de lucru nu este acceptată de la client ca autoritate.
9. **Rezultat confirmat de oameni.** AI-ul nu confirmă venit și nu transformă o estimare în rezultat financiar.
10. **Revocare și oprire.** Integrările viitoare trebuie să poată fi deconectate imediat, iar acțiunile în așteptare trebuie invalidate.

## Etapele capabilităților AI

### Etapa A — AI intern sigur

Capabilități: explicarea riscului, rezumarea oportunităților, sugestii de acțiune următoare, drafturi, clasificarea semnalelor importate manual și limbaj de audit/pilot derivat din dovezi.

Reguli:

- fără efecte externe;
- dovezi obligatorii pentru afirmațiile materiale;
- revizuire umană pentru concluzii și mesaje comerciale;
- fără trimitere automată;
- audit al solicitării, versiunii și deciziei când rezultatul este păstrat sau aplicat.

Aceasta este singura etapă potrivită pentru extindere imediată în produsul curent.

### Etapa B — Asistent Calendar în sandbox

Prima versiune folosește exclusiv date locale sau demonstrative:

- program de lucru;
- servicii și durate;
- indisponibilități;
- buffer între programări;
- propunerea a unu până la trei intervale;
- programare în așteptare;
- confirmare umană.

Nu folosește Google Calendar, nu creează evenimente și nu apelează un API extern.

#### Stare implementată — Calendar Assistant Sandbox v1

Motorul determinist din `src/lib/appointment-sandbox.ts` și fixture-ul fictiv din `src/lib/appointment-sandbox-fixtures.ts` implementează propunerea locală de intervale pentru un salon. Sunt verificate programul afacerii, programul și calificarea persoanei, durata, bufferul, programările existente, indisponibilitățile și fusul orar.

Rezultatul este limitat la 1–3 propuneri explicabile. `createPendingSandboxBooking` creează numai o stare `pending_approval`, cu aprobare umană și audit obligatorii, fără efect extern. Sandbox-ul nu se conectează la Google Calendar, nu creează evenimente reale și nu trimite confirmări. Detaliile operaționale sunt în [Calendar Assistant Sandbox v1](appointment-sandbox.md).

Următorul pas sigur este un flux demonstrativ text foarte mic, care colectează cererea, explică intervalele propuse și predă selecția spre aprobare. Integrarea `free/busy` rămâne o etapă viitoare, blocată de proiectarea OAuth și revizuirea de securitate.

### Etapa C — Integrare Google Calendar

Ordinea sigură:

1. OAuth cu scope minim și consimțământ separat per spațiu de lucru.
2. Citire `free/busy` înainte de acces la detaliile evenimentelor.
3. Verificarea fusului orar, programului și suprapunerilor.
4. Propunere de interval în ReveNew.
5. Crearea evenimentului numai după aprobarea explicită și imediată.
6. Idempotency, audit, revocare și reconcilierea erorilor.

Accesul de scriere rămâne blocat până la revizuirea de securitate, modelul de tokenuri, politicile RLS și testarea izolării.

### Etapa D — Asistent Gmail în sandbox

Prima versiune:

- utilizatorul lipește sau importă manual un mesaj selectat;
- ReveNew clasifică intenția și semnalul;
- pregătește un draft;
- indică dovezile și informațiile lipsă;
- cere aprobare;
- nu creează draft în Gmail și nu trimite.

Această etapă trebuie să includă minimizare PII, limite de retenție și prevenirea prompt injection din conținutul importat.

### Etapa E — Integrare Gmail

Ordinea sigură:

1. OAuth least-privilege și ecran clar de consimțământ.
2. Fire selectate de utilizator; fără acces implicit la inboxul complet.
3. Citire limitată pentru clasificare și context.
4. Creare de draft înaintea oricărei permisiuni de trimitere.
5. Trimitere numai după confirmare umană finală, cu fingerprint și idempotency.
6. Audit al actorului, conținutului aprobat, versiunii, rezultatului providerului și revocării.

ReveNew nu trebuie să solicite acces complet la inbox pentru audit și nu trebuie să păstreze copii integrale ale mesajelor dacă un rezumat minim și referința la sursă sunt suficiente.

### Etapa F — Recepționer AI în sandbox

Prima versiune este text-mode:

- conversație simulată;
- disclosure că interlocutorul interacționează cu un asistent AI, când scenariul o cere;
- extragerea intenției de programare;
- alegerea serviciului;
- intervale propuse din disponibilitate locală;
- programare în așteptare;
- rezumat și handoff către o persoană.

Nu există apel real, telefonie sau sinteză voice.

#### Stare implementată — Text Receptionist Sandbox v1

Motorul determinist `src/lib/text-receptionist-sandbox.ts` colectează prin alegeri structurate serviciul, data, intervalul, preferința de personal și detaliile opționale. El reutilizează motorul local de programări, explică propunerile, creează numai `pending_approval` și pregătește handoff-ul pentru operator.

Pagina protejată `/demo/appointment-control` face fluxul demonstrabil și afișează permanent limitele: sandbox local, Google Calendar neconectat, nicio programare reală și aprobare obligatorie. Nu există LLM, telefonie, API extern, persistență sau confirmare trimisă.

#### Stare implementată — Evaluation & Demo Hardening v1

Evaluatorul local `src/lib/text-receptionist-evaluation.ts` acoperă cererea completă, informațiile lipsă, servicii invalide sau inactive, incompatibilitatea persoanei, fallback-ul calificat, lipsa intervalelor, schimbarea preferinței, `pending_approval` și handoff-ul. Rezultatele sunt deterministe și verifică explicit că nu există efect extern sau confirmare trimisă.

Interfața permite redeschiderea controlată a preferințelor înainte de handoff. Propunerile anterioare sunt eliminate și recalculate; o propunere deja predată operatorului nu este modificată implicit.

#### Stare curentă — validare umană locală

Protocolul [Appointment Control Pilot Validation](appointment-control-validation-protocol.md) definește sesiuni de 15 minute cu 3–5 evaluatori, scenarii operaționale, feedback minimizat și criterii continuă / ajustează / oprește. Rezultatele validează numai claritatea și interesul pentru un pilot; nu demonstrează venit, ROI, booking live sau product-market fit.

### Etapa G — Recepționer AI real

Necesită înainte de producție:

- furnizor de telefonie și model voice aprobate;
- disclosure clar că apelantul vorbește cu AI;
- bază legală, consimțământ și notificare pentru înregistrare/transcriere;
- reguli de business versionate și limite de conversație;
- handoff uman disponibil;
- prevenirea abuzului și verificarea identității unde este necesar;
- minimizare PII și politică de retenție;
- monitorizarea costurilor, latenței și erorilor;
- revizuire juridică, de securitate și de protecție a datelor.

Această etapă este blocată până la finalizarea acestor controale.

## Roadmap Gmail

| Fază | Acces | Acțiune permisă | Poartă obligatorie |
| --- | --- | --- | --- |
| Import manual | Mesaj ales explicit | Clasifică și explică | Dovezi + revizuire |
| Sandbox draft | Context minim | Pregătește draft | Aprobare umană |
| Gmail read limitat | Fir selectat | Citește contextul necesar | OAuth + audit + retenție |
| Gmail create draft | Fir selectat | Creează draft | Aprobare + idempotency |
| Gmail send | Mesaj aprobat | Trimite o singură versiune | Confirmare finală + audit |

Nu se recomandă inbox sync complet, campanii autonome sau trimitere în masă.

## Roadmap Calendar

| Fază | Sursă | Acțiune permisă | Poartă obligatorie |
| --- | --- | --- | --- |
| Disponibilitate demo | Reguli locale | Explică intervalele | Date fictive/local-only |
| Propunere sandbox | Reguli locale | Propune 1–3 sloturi | Confirmare umană |
| Google free/busy | Scope minim | Verifică ocupat/liber | OAuth + audit |
| Creare eveniment | Calendar autorizat | Creează după aprobare | Idempotency + confirmare |

Citirea `free/busy` trebuie validată înaintea oricărui acces de scriere.

## Roadmap recepționer AI / secretară voice

1. Dialog text cu date demonstrative.
2. Extragere structurată a intenției și informațiilor lipsă.
3. Propunere de programare locală în așteptare.
4. Handoff uman și rezumat auditabil.
5. Pilot intern cu scenarii, disclosure și evaluare în limba română.
6. Telefonie reală numai după revizuirea juridică, de securitate, confidențialitate și cost.

Nu se construiește mai întâi vocea. Se validează mai întâi fluxul operațional și regulile de programare în text.

## MVP — ReveNew AI Receptionist for Salons

### Obiectiv

Validarea într-un sandbox text a capacității de a înțelege o cerere de programare, de a propune intervale corecte și de a preda cazul unei persoane când informația este incompletă sau situația este sensibilă.

### Date necesare

- numele salonului;
- servicii;
- durata fiecărui serviciu;
- preț opțional, etichetat informativ;
- personal și servicii eligibile;
- program de lucru;
- zile indisponibile;
- buffer între programări;
- numele clientului;
- număr de telefon, numai când este necesar și cu retenție limitată;
- data și ora preferate;
- note strict necesare;
- setarea de consimțământ și transcriere.

### Flux

1. Clientul începe un chat sandbox; un apel real rămâne etapă viitoare.
2. Asistentul spune clar că este un asistent AI atunci când scenariul se aplică.
3. Solicită serviciul.
4. Solicită intervalul preferat.
5. Verifică disponibilitatea locală.
6. Propune unu până la trei intervale.
7. Clientul alege.
8. Programarea devine `în așteptare` sau `confirmată` numai conform setării explicite a salonului; sandbox-ul inițial folosește `în așteptare`.
9. Salonul primește un rezumat în interfața locală.
10. Propunerea și decizia sunt înregistrate în audit.
11. O persoană poate revizui, ajusta sau anula.

### Criterii de succes

- intervalele respectă programul, durata și bufferul;
- nu se inventează disponibilitate;
- informațiile lipsă sunt cerute explicit;
- cazurile ambigue sunt predate unei persoane;
- nu există efect extern;
- fiecare propunere poate fi explicată și reprodusă.

## Aprobări și audit

Pentru orice capabilitate care scrie date sau poate produce un efect extern trebuie definite:

- actorul care a cerut acțiunea;
- spațiul de lucru derivat pe server;
- capabilitatea și versiunea ei;
- obiectul comercial și dovada;
- payload-ul minim sau fingerprint-ul conținutului aprobat;
- aprobatorul, politica și expirarea;
- starea `propus`, `aprobat`, `executat`, `eșuat`, `revocat`;
- idempotency key pentru efecte externe;
- rezultat sigur al providerului, fără secrete sau conținut inutil;
- timestamp și motiv de handoff/oprire.

O aprobare nu poate fi reutilizată după modificarea materială a mesajului, intervalului, destinatarului sau regulii de business.

## OAuth, securitate și cerințe de conformitate

### Înainte de orice integrare live

- OAuth Authorization Code cu PKCE unde este aplicabil;
- scope-uri minime, aprobate separat pentru citire și scriere;
- tokenuri criptate la rest, inaccesibile clientului și jurnalelor;
- rotație, expirare, revocare și ștergere verificabilă;
- separare strictă pe spațiu de lucru și cont conectat;
- RLS pentru metadatele conexiunii și acces server-side pentru secrete;
- protecție CSRF/state și redirect URI allowlist;
- audit pentru conectare, schimbare scope, utilizare și deconectare;
- inventar de subprocessors și fluxuri de date;
- teste pentru acces cross-tenant și permisiuni revocate;
- threat model și revizuire juridică înainte de producție.

Tokenurile OAuth și stocarea lor sunt cerințe viitoare. Nu sunt implementate de acest sprint.

### GDPR și încredere

- Documentează scopul, baza legală și rolurile operator/persoană împuternicită pentru fiecare flux.
- Oferă transparență despre AI, datele folosite și limitele recomandării.
- Cere consimțământ când este necesar și păstrează dovada lui.
- Pentru înregistrare sau transcriere, informează apelantul înainte de captură și oferă alternativă umană.
- Minimizează datele și definește retenția; ștergerea și exportul trebuie proiectate înainte de producție.
- Restricționează accesul după rol și jurnalizează accesul sensibil.
- Evaluează furnizorii și subprocessors, locația prelucrării și transferurile internaționale.
- Definește limitele AI și escaladarea umană.
- Recepționerul nu oferă consultanță medicală, juridică sau financiară.
- Pentru clinici și programări medicale, evită colectarea motivului medical dacă nu este necesar și tratează datele privind sănătatea ca domeniu special, cu revizuire juridică și DPIA unde este cazul.
- Pentru România și UE, validează GDPR, ePrivacy, regulile privind comunicațiile, înregistrarea apelurilor, AI Act și cerințele sectoriale cu specialiști înainte de lansare.

ReveNew nu afirmă că această activitate finalizează conformitatea și nu pretinde certificări SOC 2, ISO 27001 sau GDPR.

## Lacune de model de date — numai pentru faze viitoare

Nu este necesară nicio schimbare de schemă pentru fundația v1. Înainte de integrări vor trebui proiectate și revizuite:

- conexiune de integrare per spațiu de lucru, provider, scope și stare;
- referință la secret/token într-un sistem securizat, nu token brut în tabele expuse;
- cerere de execuție a capabilității cu fingerprint, risc și stare;
- aprobare consumabilă legată de versiunea exactă a acțiunii;
- jurnal de execuție append-only cu rezultat minim;
- reguli de disponibilitate, servicii, personal și buffer;
- propunere și confirmare de programare;
- consimțământ, disclosure, retenție și handoff;
- legătură la sursă fără copierea integrală a inboxului sau transcriptului.

Orice model nou trebuie să fie aditiv, tenant-scoped și protejat prin RLS. Politicile trebuie să derive identitatea pe server și să blocheze accesul între spații de lucru.

## Matrice de risc

| Capabilitate | Risc | Efect extern | Control minim | Stare recomandată |
| --- | --- | --- | --- | --- |
| Explicare risc comercial | Redus | Nu | Dovezi + audit | Disponibil intern |
| Sugestie acțiune următoare | Redus | Nu | Dovezi + confirmare | Disponibil intern |
| Draft follow-up | Mediu | Nu | Revizuire + aprobare | Disponibil intern |
| Disponibilitate demo | Redus | Nu | Date local-only | Sandbox |
| Propunere programare | Mediu | Nu | Reguli + confirmare | Sandbox |
| Google free/busy | Ridicat | Nu | OAuth minim + audit | Blocat pentru review |
| Creare eveniment | Critic | Da | Aprobare + idempotency | Blocat pentru review |
| Clasificare mesaj importat | Mediu | Nu | Import explicit + minimizare | Sandbox |
| Creare draft Gmail | Ridicat | Da | OAuth + aprobare | Blocat pentru review |
| Trimitere Gmail | Critic | Da | Confirmare finală + audit | Blocat pentru review |
| Recepționer text | Mediu | Nu | Disclosure + handoff | Sandbox |
| Recepționer telefonic | Critic | Da | Legal + securitate + operator uman | Blocat pentru review |

## Ordinea recomandată de implementare

1. Consolidează control plane-ul intern și testele invariantelor.
2. Construiește **Calendar Assistant Sandbox pentru programări**, fără Google și fără efecte externe. **Finalizat în v1.**
3. Adaugă scenarii text deterministe și hardening pentru refuz, fallback și handoff. **Finalizat în v1.**
4. Validează verticala salon cu 3–5 operatori și un protocol local de observație.
5. Adaugă baseline, măsurători de completare și rate de handoff fără a le interpreta ca ROI.
6. Proiectează modelul de integrare și threat model-ul OAuth.
7. Introdu Google Calendar `free/busy` cu scope minim.
8. Permite crearea evenimentului numai după aprobări și audit validate.
9. Construiește Gmail sandbox din mesaje importate manual.
10. Evaluează integrarea Gmail limitată la fire selectate și creare de draft.
11. Abordează vocea reală numai după validarea text, Calendar și conformitate.

## Primul modul AI monetizabil recomandat

**ReveNew Appointment Control Pilot pentru saloane** este următorul modul recomandat. Motorul, fluxul text și evaluarea deterministă sunt implementate; următoarea valoare demonstrabilă este un protocol local, controlat, pentru validarea cu operatori umani.

Motive:

- validează o problemă repetabilă și ușor de demonstrat;
- folosește motorul de programare existent fără a necesita OAuth sau telefonie;
- poate măsura corectitudinea intervalelor, completitudinea datelor și handoff-ul;
- păstrează toate efectele în sandbox;
- creează baza pentru Calendar și recepționer fără a promite integrarea lor.

Oferta inițială trebuie să fie un pilot controlat de configurare și simulare, nu un recepționer telefonic live.

## Ce nu construim încă

- inbox sync complet;
- citirea implicită a tuturor mesajelor;
- trimitere Gmail;
- creare automată de evenimente;
- telefonie reală, Twilio sau OpenAI Realtime voice;
- agenți care modifică oportunități ori contacte fără aprobare;
- campanii autonome;
- memorarea transcripturilor integrale fără scop și retenție;
- recomandări medicale, juridice sau financiare;
- scoring de angajați sau supraveghere;
- orice promisiune de venit ori ROI.

## Prompturi Codex recomandate după acest sprint

### Prompt 1 — următorul pas recomandat

> Lucrează în `C:\Projects\ReveNew`. Construiește un protocol local de validare pentru Appointment Control Pilot, reutilizând evaluatorul determinist existent. Adaugă un checklist de prezentare, scenarii anonime pentru 3–5 evaluatori umani, criterii explicite de continuare, ajustare sau oprire și un rezumat local fără date personale. Măsoară numai completarea, refuzul sigur, corectitudinea propunerii și claritatea handoff-ului. Fără provider AI, Google Calendar, OAuth, API-uri externe, telefonie, email, migrații, persistență sau scoring al angajaților. Nu transforma observațiile în afirmații despre venit, ROI ori booking garantat.

### Prompt 2 — evaluare și threat model OAuth

> Lucrează în `C:\Projects\ReveNew`. Fără implementare și fără schimbări de schemă, creează un threat model și o specificație de securitate pentru viitoarea integrare Google Calendar free/busy. Acoperă OAuth least-privilege, PKCE/state, token encryption, revocare, tenant isolation, RLS, redirect allowlist, audit, data minimization, timezone, double-booking, idempotency și incident response. Propune criterii go/no-go și teste obligatorii.

### Prompt 3 — Gmail sandbox

> Lucrează în `C:\Projects\ReveNew`. Proiectează și implementează numai un Gmail Assistant Sandbox bazat pe mesaje lipite sau importate manual. Fără OAuth, Gmail API, inbox sync sau trimitere. Clasifică mesajul, redactează PII, leagă afirmațiile de dovezi, pregătește un draft și cere aprobare umană. Adaugă protecții pentru prompt injection și teste care demonstrează că nu există efecte externe.
