# Checklist de pregătire — demo complet ReveNew

Folosește acest checklist înaintea fiecărei demonstrații ghidate. Mediul autorizat este exclusiv demo-ul local fictiv **Meridian Commercial Operations**.

## Pornire în Windows Command Prompt

Deschide Windows Command Prompt și rulează:

```cmd
cd /d C:\Projects\ReveNew
docker --version
npx supabase --version
npx supabase start
npm run demo:buyer-ready
npm run demo:dev -- --port 3001
```

Scriptul `demo:buyer-ready` solicită parola contului demo local. Folosește parola temporară furnizată separat, nu o spune în prezentare, nu o include în documente și nu o salva în repository.

Deschide traseul:

```cmd
start "" "http://localhost:3001/dashboard"
```

## Autentificare și identitate

- Cont local: `irina.petrescu@revenew-demo.invalid`.
- Parola rămâne secretă și locală; acest document nu o conține.
- Autentificarea reală trebuie păstrată; nu folosi bypass-uri.
- Spațiul de lucru trebuie să fie `Meridian Commercial Operations`.
- Operatorul vizibil trebuie să fie `Irina Petrescu`.
- Nu continua dacă apare un email personal, o identitate privată sau un spațiu de lucru diferit.

## Verificare tehnică înainte de apel

La 1366×768 verifică:

- `/dashboard`
- `/ai`
- `/recoverable`
- `/opportunities/de300006-0000-4000-8000-000000000006`
- `/today`
- `/approvals`
- `/reports/revenue-recovery-audit`
- `/reports/enterprise-pilot-pack`
- `/reports/pilot-proof-of-value`
- `/demo/appointment-control`

La 390×844 verifică aceleași rute pentru:

- lipsa overflow-ului orizontal;
- titlu și scop lizibile;
- CTA principal accesibil;
- meniul mobil funcțional;
- carduri și valori financiare fără tăiere;
- formulare secundare închise implicit;
- butoane de print fără deteriorarea paginii.

## Ce trebuie să fie vizibil

- un risc comercial clar în primul ecran al Dashboard-ului;
- o recomandare explicabilă în `/ai`;
- sursa, dovada și controlul „Vezi de ce”;
- o acțiune sigură și o destinație precisă;
- valoare estimată etichetată ca neconfirmată;
- monede separate;
- responsabil, contact și stare pe Opportunity Detail;
- „De ce este prioritară”;
- activitatea atribuită în `/today`;
- ce se schimbă după aprobare în `/approvals`;
- controlul uman și absența trimiterii automate;
- titlu, dată, spațiu de lucru și expunere deduplicată în Audit;
- domeniu, participanți și criterii în Pilot Pack;
- linie de bază curentă și recomandare `continuă / ajustează / oprește` în Proof-of-Value;
- etichetele de sandbox și limitele integrărilor în Appointment Control.

## Ce nu trebuie să apară

- 404, HTML neformatat sau erori tehnice brute;
- identificatori interni fără utilitate;
- `testdavid`, `davidtest`, `TEST DATA`, `E2E` sau email personal;
- termeni tehnici precum `tenant`, `queue ID`, `provider` ori identificatori de fixture;
- „workspace”, „pending”, „ownership” sau statusuri englezești în copy românesc;
- ROI promis, venit garantat sau recuperare automată;
- valoare estimată prezentată drept venit confirmat;
- afirmația că un mesaj a fost trimis automat;
- afirmația că Gmail, Google Calendar sau telefonia live sunt conectate;
- o programare reală sau o confirmare trimisă din sandbox;
- certificări sau controale enterprise care nu au fost validate.

## Testul traseului narativ

Înainte de apel, repetă fără explicații laterale:

1. Dashboard — risc, explicație și prima acțiune sigură.
2. Oportunitate — fapte, cronologie, document și control.
3. Company 360 — memoria relației Meridian Logistics.
4. Ask ReveNew și Descoperiri — căutarea Vector și semnalul Atlas.
5. Inbox Comercial — sursă, lipsuri și revizuire umană.
6. Aprobări — decizia umană pentru cazul Vector.
7. Audit — livrabil executiv și valori deduplicate.
8. Pilot Pack — validare pe 14 zile și trecere către Proof-of-Value.

Ținta este 8–9 minute. `/recoverable`, `/today`, Pipeline și Proof-of-Value rămân verificate, dar nu sunt opriri separate în traseul principal.

## Starea rutelor

| Rută | Statut în demo | Recomandare |
| --- | --- | --- |
| `/dashboard` | Arată cu încredere | Deschidere managerială |
| `/ai` | Arată cu încredere | Deschide o singură explicație „Vezi de ce” |
| `/recoverable` | Arată cu explicație | Maximum 30 de secunde |
| Opportunity Detail | Arată cu încredere | Centrul demonstrației |
| `/today` | Arată cu explicație | Nu modifica acțiunea principală |
| `/approvals` | Arată cu încredere | Nu aproba în traseul principal |
| Revenue Recovery Audit | Arată cu încredere | Livrabilul pentru discovery |
| Enterprise Pilot Pack | Arată cu încredere | Oferta controlată pe 14 zile |
| Pilot Proof-of-Value | Arată cu încredere | Închiderea comercială prudentă |
| `/inbox` | Evită dacă nu este întrebat | Folosește numai pentru întrebări despre intake |
| `/reports` | Evită dacă timpul este scurt | Util pentru explicația detaliată a metricilor |
| `/demo/appointment-control` | Anexă opțională | Numai pentru procese relevante de programare |
| setări, administrare, billing, diagnostic | Evită | În afara traseului de discovery |

## Click-uri sigure

Poți folosi:

- „Vezi de ce”;
- „Deschide dovada”;
- navigarea către oportunitate;
- deschiderea unei singure secțiuni de dovezi;
- legăturile dintre Audit, Pilot Pack și Proof-of-Value;
- butoanele de print numai dacă ai verificat anterior previzualizarea.

Evită în demo-ul principal:

- finalizarea, amânarea sau anularea unei acțiuni;
- aprobarea sau respingerea unui caz;
- pregătirea ori trimiterea unui mesaj;
- marcarea unui rezultat câștigat sau pierdut;
- importul de date;
- orice control care modifică fixture-ul principal.

## Dacă Docker sau Supabase nu pornește

1. Nu ocoli autentificarea și nu schimba aplicația către Supabase găzduit.
2. Verifică Docker:

```cmd
docker --version
docker info
```

3. Dacă Docker Desktop nu rulează, pornește-l manual și așteaptă până când motorul este disponibil.
4. Reia:

```cmd
cd /d C:\Projects\ReveNew
npx supabase start
npm run demo:buyer-ready
```

5. Dacă stiva locală rămâne indisponibilă, oprește demonstrația live. Continuă numai cu discovery verbal și reprogramează demonstrația autentificată; nu folosi date găzduite sau bypass-uri.

## Dacă aplicația nu pornește pe portul 3001

Verifică dacă portul este ocupat:

```cmd
netstat -ano | findstr :3001
```

Oprește numai procesul local pe care îl recunoști sau pornește demo-ul pe un port liber:

```cmd
npm run demo:dev -- --port 3002
start "" "http://localhost:3002/dashboard"
```

Repetă rutele pe noul port înainte de apel.

## Cu cinci minute înainte

- închide paginile personale și notificările;
- păstrează numai taburile traseului demo;
- setează zoom-ul browserului la 100%;
- deschide Dashboard și verifică autentificarea;
- confirmă că serverul local nu afișează erori;
- oprește extensiile sau ferestrele care pot expune date personale;
- păstrează [scriptul complet](full-buyer-demo-script.md) pe al doilea ecran;
- pregătește întrebarea de discovery și CTA-ul pentru auditul de 20–50 de cazuri.

## După demonstrație

- notează întrebările și momentele de confuzie, nu date personale inutile;
- clasifică interesul: audit, pilot, informații suplimentare sau oprire;
- nu declara succesul pe baza politeții interlocutorului;
- dacă fixture-ul a fost modificat local, rulează din nou `npm run demo:buyer-ready` înaintea următoarei demonstrații;
- nu transfera date reale în spațiul demonstrativ.
