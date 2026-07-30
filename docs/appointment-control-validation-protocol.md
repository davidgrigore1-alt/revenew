# Protocol de validare — Appointment Control Pilot v1

## Scop

Acest protocol ajută fondatorul să testeze cu 3–5 evaluatori dacă demonstrația Appointment Control este clară, credibilă și suficient de utilă pentru un pilot controlat.

Ipoteza testată este:

> ReveNew poate colecta intenția de programare, poate propune intervale valide și poate pregăti o solicitare pentru revizuire umană.

Validarea nu testează venit, ROI, telefonie reală, integrare Calendar sau booking live. Ruta este un sandbox local, nu creează o programare reală, nu trimite confirmări și păstrează aprobarea umană obligatorie.

## Cine ar trebui să evalueze

Alege 3–5 persoane care cunosc direct programările într-o afacere de servicii:

- proprietar sau administrator de salon;
- manager operațional;
- recepționer sau persoană care gestionează programări;
- proprietar al unei afaceri comparabile: wellness, servicii profesionale, reparații sau training;
- consultant care a implementat procese de programare pentru astfel de afaceri.

Păstrează, dacă este posibil, cel puțin două roluri diferite în grup.

## Cine nu ar trebui folosit ca unic semnal

- persoane fără contact cu programările sau serviciile;
- prieteni care vor doar să încurajeze fondatorul;
- potențiali clienți cărora li s-a promis deja funcționalitate live;
- minori sau persoane care ar trebui să introducă date reale pentru a participa;
- angajați evaluați de managerul lor prin acest test.

Protocolul evaluează produsul, nu performanța angajaților.

## Pregătire

### Checklist tehnic

În Windows Command Prompt:

```cmd
cd /d C:\Projects\ReveNew
npx supabase start
npm run demo:buyer-ready
npm run demo:dev -- --port 3001
start "" "http://localhost:3001/demo/appointment-control"
```

Înainte de sesiune confirmă:

- ruta `/demo/appointment-control` se deschide autentificat;
- workspace-ul este fictiv;
- apar etichetele „Sandbox local”, „Neconectat”, „Nu este creată” și „Obligatorie”;
- fixture-ul este **Atelier Bellezza Demo**;
- nu există date reale despre clienți;
- fluxul standard ajunge la „În așteptarea aprobării”;
- ai deschis [formularul de feedback](appointment-control-feedback-template.md) pentru notițe.

### Reguli pentru sesiune

- Nu cere evaluatorului numele, emailul, telefonul, parolele sau acces la calendar.
- Nu introduce clienți, programări ori disponibilități reale.
- Nu corecta imediat o neînțelegere; noteaz-o mai întâi.
- Nu transforma reacțiile într-un pitch defensiv.
- Nu evalua viteza sau performanța unui angajat.

## Structura sesiunii de 15 minute

### 0:00–2:00 — Context și disclosure

Fondator:

> Testăm o simulare locală, pe date fictive. ReveNew nu răspunde la apeluri reale, nu este conectat la Google Calendar și nu creează sau confirmă programări. Vreau să observ dacă fluxul și controlul uman sunt clare, nu să vă conving că există deja o integrare live.

Întreabă evaluatorul ce rol are în procesul de programare, fără a cere numele companiei.

### 2:00–7:00 — Flux ghidat

Rulează Scenariul A, apoi arată pe scurt Scenariul B sau C. Nu explica fiecare element înainte ca evaluatorul să îl observe.

### 7:00–10:00 — Caz dificil și control

Arată schimbarea preferinței sau lipsa unui interval. Selectează o propunere și oprește-te la handoff.

### 10:00–12:00 — Verificarea înțelegerii

Întreabă:

> Ce credeți că s-a întâmplat după selectarea intervalului?

Nu sugera răspunsul. Notează dacă evaluatorul spune spontan că:

- nu s-a creat o programare reală;
- nu s-a trimis confirmare;
- operatorul trebuie să aprobe.

### 12:00–15:00 — Feedback și decizie de pilot

Folosește întrebările de mai jos. Încheie fără promisiuni de roadmap sau rezultat financiar.

## Scenarii pentru evaluatori

### Scenariul A — Cerere normală

Cerere:

> „Doresc un tuns mâine după-amiază.”

Fondatorul:

- selectează „Tuns damă”;
- folosește data demonstrativă disponibilă;
- alege intervalul de după-amiază sau flexibil;
- continuă fără preferință de persoană;
- generează propunerile.

Evaluatorul ar trebui să observe serviciul, durata, bufferul, persoana și faptul că propunerile nu sunt confirmate.

Succes: evaluatorul poate explica de ce intervalele par valide și că încă nu există booking.

Confuzie: crede că prima opțiune a fost rezervată automat sau nu înțelege de unde provin orele.

### Scenariul B — Preferință pentru o persoană

Cerere:

> „O prefer pe Maria, dacă este disponibilă.”

Fondatorul selectează un serviciu compatibil cu Maria și apoi persoana preferată.

Evaluatorul ar trebui să observe că preferința este verificată împreună cu eligibilitatea pentru serviciu.

Succes: înțelege diferența dintre preferință și confirmare.

Confuzie: consideră că persoana a fost asignată definitiv sau că orice persoană poate presta orice serviciu.

### Scenariul C — Preferință indisponibilă, alternativă acceptată

Cerere:

> „O prefer pe Ana, dar pot accepta pe altcineva dacă Ana nu este disponibilă.”

Fondatorul explică rezultatul determinist de fallback sau folosește scenariul local de evaluare relevant. Nu pretinde că indisponibilitatea provine dintr-un calendar real.

Evaluatorul ar trebui să observe că alternativa este calificată și că motivul fallback-ului este explicat.

Succes: alternativa pare prudentă și evaluatorul ar accepta ca operatorul să o revizuiască.

Confuzie: crede că ReveNew a consultat Google Calendar sau că alternativa a fost confirmată automat.

### Scenariul D — Niciun interval disponibil

Cerere:

> „Am nevoie de vopsit păr într-o perioadă complet ocupată.”

Fondatorul prezintă scenariul determinist „fără intervale” din evaluarea locală și explicația de indisponibilitate.

Evaluatorul ar trebui să observe că ReveNew nu inventează o oră și cere ajustarea datei, intervalului sau preferinței.

Succes: refuzul este perceput drept sigur și util.

Confuzie: evaluatorul se așteaptă ca sistemul să forțeze o rezervare sau nu înțelege următorul pas.

### Scenariul E — Înțelegerea limitei de siguranță

Fondatorul finalizează fluxul până la „În așteptarea aprobării”, apoi întreabă:

> „Ce credeți că s-a întâmplat acum și ce ar trebui să urmeze?”

Evaluatorul ar trebui să spună că există numai o propunere pentru operator, fără programare sau confirmare reală.

Succes: menționează spontan controlul uman și lipsa efectului extern.

Confuzie: spune că programarea este confirmată, că un client a fost notificat sau că există un eveniment în Calendar.

## Checklist de observație

Pentru fiecare evaluator marchează fără nume:

- [ ] A observat eticheta de sandbox înainte să fie întrebat.
- [ ] A înțeles că datele sunt fictive și locale.
- [ ] A înțeles că Google Calendar nu este conectat.
- [ ] A înțeles că nu s-a creat o programare reală.
- [ ] A înțeles că nu s-a trimis confirmare.
- [ ] A înțeles că aprobarea umană este obligatorie.
- [ ] A considerat intervalele explicabile și credibile.
- [ ] A înțeles schimbarea preferinței.
- [ ] A înțeles următorul pas din handoff.
- [ ] A formulat o utilizare concretă într-o afacere de servicii.

Notează separat prima confuzie observată și momentul în care a apărut.

## Întrebări după demonstrație

1. Într-o propoziție, ce face acest flux?
2. Ce credeți că s-a întâmplat după selectarea intervalului?
3. Ce v-a făcut să aveți sau să nu aveți încredere în propuneri?
4. Cât de clare sunt intervalele propuse, de la 1 la 5?
5. Cât de clar este rezumatul pentru operator, de la 1 la 5?
6. Cât de util ar fi acest flux pentru o afacere de servicii, de la 1 la 5?
7. Care a fost cea mai mare confuzie?
8. Care a fost partea cea mai utilă?
9. Ce ar trebui să existe înaintea unui pilot real?
10. Ați testa această direcție într-o afacere reală: da, poate sau nu? De ce?

## Rubrică

### Înțelegerea siguranței — trei criterii binare

Câte un punct dacă evaluatorul înțelege fără corectare că:

1. este sandbox local;
2. nu există o programare reală;
3. este necesară aprobarea umană.

Scorul este 0–3. Un scor sub 3 indică o problemă de copy, demonstrație sau model mental; nu o problemă a evaluatorului.

### Claritate și utilitate — scară 1–5

- **1:** neclar sau fără valoare observabilă;
- **2:** parțial inteligibil, cu blocaje importante;
- **3:** utilitate posibilă, dar necesită explicații ori ajustări;
- **4:** clar și relevant pentru un pilot limitat;
- **5:** foarte clar, cu un caz concret de testare.

Nu transforma scorurile în estimări de venit sau productivitate.

## Decizia continuă / ajustează / oprește

### Continuă spre proiectarea unui pilot limitat dacă toate sunt adevărate

- cel puțin 3 din 5 evaluatori înțeleg că este sandbox local;
- cel puțin 3 din 5 înțeleg că nu este creată o programare reală;
- cel puțin 3 din 5 înțeleg că aprobarea umană este obligatorie;
- media utilității este de minimum 3,5 din 5;
- cel puțin doi evaluatori spun că ar testa direcția într-o afacere reală.

Acest rezultat validează numai interesul pentru un pilot, nu venit sau product-market fit.

### Ajustează și repetă validarea dacă apare oricare

- ideea este apreciată, dar aprobarea este înțeleasă greșit;
- intervalele sau justificarea lor nu sunt clare;
- handoff-ul este confuz;
- evaluatorii se așteaptă imediat la telefonie sau Calendar;
- limbajul trebuie simplificat;
- semnalul este mai puternic într-o altă verticală de servicii.

Schimbă o singură categorie majoră odată și repetă cu evaluatori noi.

### Oprește sau amână direcția dacă apare un semnal repetat

- evaluatorii nu înțeleg valoarea nici după demonstrație;
- singura valoare acceptată ar necesita acum voce și Calendar live;
- controlul uman este respins ca principiu;
- interesul depinde de booking sau venit garantat;
- demonstrația produce mai multă confuzie decât interes operațional;
- nici doi evaluatori nu ar testa direcția.

„Oprește” poate însemna revenire după dovezi noi, nu eliminarea ireversibilă a cercetării.

## Ce nu afirmăm

- Nu afirmăm că ReveNew răspunde la apeluri reale.
- Nu afirmăm că Google Calendar sau Gmail sunt conectate.
- Nu afirmăm că sistemul creează ori confirmă automat programări.
- Nu afirmăm că sunt trimise emailuri, SMS-uri sau alte confirmări.
- Nu afirmăm că ReveNew înlocuiește recepționerii.
- Nu promitem booking-uri, venit sau ROI.

## Ce nu testăm încă

- calitatea unui apel sau a unei voci AI;
- acuratețea transcrierii ori înțelegerii limbajului liber;
- sincronizarea cu un calendar real;
- livrarea mesajelor;
- persistența și auditul unei programări reale;
- disponibilitatea, securitatea sau conformitatea unei integrări live;
- rezultate financiare.

## Confidențialitate și minimizarea datelor

- Folosește un identificator neutru precum `Evaluator 1`.
- Rolul și industria sunt suficiente; numele companiei este opțional și nerecomandat.
- Nu colecta nume, email, telefon, parole, linkuri Calendar, date de clienți sau capturi din sisteme reale.
- Nu înregistra audio/video implicit. Dacă este necesar ulterior, cere consimțământ separat și definește retenția înainte.
- Păstrează numai răspunsurile necesare deciziei și șterge notițele individuale după agregare.

## Rezumatul constatărilor

După 3–5 sesiuni, pregătește un singur rezumat fără identități:

```text
Număr evaluatori:
Roluri/industrii agregate:
Au înțeles sandbox local: __ / __
Au înțeles că nu există booking real: __ / __
Au înțeles aprobarea umană: __ / __
Media credibilității intervalelor: __ / 5
Media clarității handoff-ului: __ / 5
Media utilității: __ / 5
Ar testa într-o afacere reală — Da: __ / Poate: __ / Nu: __
Cele mai frecvente trei confuzii:
Cele mai frecvente trei cerințe înainte de pilot:
Decizie: CONTINUĂ / AJUSTEAZĂ / OPREȘTE-SAU-AMÂNĂ
Motivul deciziei:
Următoarea verificare sigură:
```

Nu include citate identificabile și nu prezenta rezultatul drept dovadă de venit.
