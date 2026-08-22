# Primul audit comercial ReveNew

Acest ghid transformă discuția de demonstrație într-un audit comercial controlat. Scopul este identificarea oportunităților blocate, a follow-up-urilor întârziate, a responsabilităților neclare și a informațiilor lipsă pe baza unui eșantion limitat și verificabil.

Auditul nu promite venit recuperat, ROI sau rezultate comerciale garantate. Valorile estimate rămân separate de venitul confirmat, iar nicio comunicare externă nu este trimisă automat.

## Eșantionul inițial

Pentru primul audit, un eșantion controlat este suficient. Clientul poate anonimiza numele companiilor, numele contactelor și adresele de email, dacă este necesar.

Solicită **20–50 de cereri sau oportunități comerciale recente**. Nu este necesară o exportare completă a CRM-ului.

### Date recomandate

| Câmp | Utilitate | Obligatoriu pentru eșantion |
| --- | --- | --- |
| Titlu oportunitate sau cerere | Identifică bucla comercială | Da |
| Companie sau ID anonimizat | Grupează riscul comercial | Da |
| Data cererii | Stabilește vechimea cazului | Da |
| Rezumatul cererii | Explică ce trebuie decis | Da |
| Status curent | Arată unde este blocat cazul | Da |
| Responsabil | Evidențiază lipsa responsabilității | Dacă este cunoscut |
| Ultima acțiune și data ei | Evidențiază follow-up-ul întârziat | Dacă sunt cunoscute |
| Următoarea acțiune și termenul | Arată dacă există un pas sigur | Dacă sunt cunoscute |
| Valoare estimată și monedă | Estimează expunerea fără a confirma venit | Dacă sunt cunoscute |
| Contact sau decident | Evidențiază lipsurile de relație | Dacă este cunoscut |
| Aprobare, propunere și rezultat | Arată buclele încă nerezolvate | Dacă sunt relevante |

Monedele se păstrează separat. Nu cumula RON, EUR sau alte monede într-un singur total.

## Date care nu sunt necesare

Pentru primul audit:

- nu este necesar acces complet la inbox;
- nu este necesar acces complet la calendar;
- nu se solicită parole, tokenuri sau acces la conturi;
- nu sunt necesare contracte confidențiale, decât dacă există un motiv explicit, aprobat de client;
- nu sunt necesare date personale fără legătură cu execuția comercială;
- nu sunt necesare integrări Gmail, Calendar sau alte conectări live.

Clientul transmite fișierul prin canalul securizat aprobat de organizația sa. ReveNew nu furnizează în această etapă un canal extern de transfer și nu preia date automat din alte servicii.

## Anonimizare

Înainte de transfer, clientul poate:

1. înlocui compania cu `Compania A`, `Compania B` sau un ID intern;
2. înlocui persoana cu un rol, de exemplu `Decident financiar A`;
3. înlocui emailul cu o adresă rezervată precum `contact-a@example.invalid` sau îl poate elimina;
4. elimina telefoane, semnături, conversații irelevante și date sensibile;
5. păstra numai informația necesară pentru risc, dovadă, responsabil și următoarea acțiune.

Păstrează o referință internă controlată numai dacă este necesară pentru reconcilierea ulterioară. ReveNew nu are nevoie de identitatea reală pentru a evidenția o buclă comercială.

## Șablonul de lucru

Folosește [revenew-client-audit-template.csv](samples/revenew-client-audit-template.csv). Rândurile incluse sunt fictive și pot fi șterse înainte ca șablonul să fie trimis clientului.

Șablonul are două categorii de coloane:

- câmpuri comerciale de bază: titlu, companie, contact, email, sursă, rezumat, valoare estimată, monedă, status, responsabil, ultima interacțiune și termen;
- context operațional pentru audit: rolul contactului, data cererii, ultima acțiune, următoarea acțiune declarată, stările de aprobare/propunere/rezultat și notele operatorului.

Coloanele operaționale mapate sunt păstrate în dovada textuală a semnalului sub marcajul „de verificat”. Ele nu devin automat responsabil, acțiune, aprobare, trimitere sau rezultat confirmat. Coloanele nemapate nu sunt importate; informația materială trebuie mapată sau inclusă în `request_summary`.

## Fluxul operatorului

Folosește un workspace dedicat și autorizat pentru auditul clientului. Nu importa date reale sau anonimizate ale clientului în workspace-ul demonstrativ `Meridian Commercial Operations`.

1. Creează o copie de lucru a șablonului și verifică anonimizarea.
2. Confirmă că fiecare valoare estimată are monedă și că rezultatele neconfirmate sunt marcate ca atare.
3. Deschide `/inbox/import` și selectează modul CSV.
4. Încarcă fișierul și verifică maparea fiecărei coloane. `opportunity_title` este câmpul obligatoriu. Mapează `responsible_person` numai dacă numele corespunde exact unui membru activ al workspace-ului; pentru nume anonimizate selectează `Nu importa` și păstrează eticheta în context sau în nota operatorului.
5. Rulează previzualizarea. Corectează rândurile invalide și verifică potrivirile probabile sau duplicatele.
6. Confirmă numai rândurile acceptate. Importul creează **semnale pentru revizuire**, nu oportunități sau acțiuni automate.
7. În `/inbox`, verifică dovada și aprobă numai semnalele relevante.
8. Completează responsabilul, următoarea acțiune, termenul și aprobarea în oportunitățile aprobate.
9. Verifică `/reports/revenue-recovery-audit`.
10. Pregătește `/reports/enterprise-pilot-pack` numai după verificarea concluziilor.

## Întrebări pentru client

- Unde se pierd cel mai des cererile: atribuire, follow-up, aprobare sau decizie?
- Ce înseamnă pentru echipă un caz întârziat?
- Cine poate confirma responsabilul și următoarea acțiune?
- Ce sursă poate susține fiecare caz fără a transfera date inutile?
- Ce valoare este estimată și ce venit este confirmat explicit?
- Cine trebuie să revizuiască auditul înainte de propunerea pilot?

## Oferta de audit

Auditul folosește 20–50 de înregistrări pentru a livra:

- oportunități și bucle comerciale blocate;
- follow-up-uri întârziate;
- responsabili și acțiuni lipsă;
- valoare estimată expusă, deduplicată și separată pe monedă;
- dovezi disponibile;
- prime acțiuni sigure pentru revizuire umană.

Auditul nu reprezintă venit confirmat, garanție financiară sau promisiune de ROI.

## Conversia în pilot

După audit, propune un pilot controlat de **14 zile**, cu domeniu limitat:

- validarea clarității comerciale;
- validarea responsabilității și disciplinei de follow-up;
- urmărirea aprobărilor și a acțiunilor următoare;
- un baseline confirmat și imuabil, urmat de o comparație pe aceeași cohortă la încheiere;
- o decizie finală: continuă, ajustează sau oprește.

Pilotul nu garantează recuperarea venitului. Oamenii autorizați păstrează controlul asupra aprobărilor, comunicărilor și confirmării rezultatelor.

## Dovada de valoare la finalul pilotului

Încheie pilotul cu `/reports/pilot-proof-of-value`, nu cu o promisiune financiară. Raportul trebuie să arate ce progres este susținut de înregistrările existente, ce blocaje rămân, ce rezultate au fost declarate de utilizatori și ce dovezi pot fi deschise.

Înainte de activare, clientul verifică lotul, criteriile, politica și limitările, apoi confirmă explicit baseline-ul. Situația finală se îngheață separat, pe aceeași cohortă. Oportunitățile apărute în timpul pilotului sunt raportate distinct și nu modifică artificial comparația. Decizia finală rămâne `continuă / ajustează / oprește`, iar utilizarea lunară este justificată numai dacă echipa obține vizibilitate operațională recurentă.
