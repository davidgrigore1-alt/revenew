# Script comercial sigur — Appointment Control

Ruta demonstrativă: `/demo/appointment-control`

Durată recomandată: 5–7 minute în cadrul unei sesiuni de validare de 15 minute.

## Deschidere

> Vă arăt o simulare locală ReveNew care colectează o cerere de programare, verifică reguli fictive de disponibilitate și pregătește o propunere pentru operator. Nu este un recepționer telefonic live.

## Disclosure

> Tot ce vedeți rulează într-un sandbox local, cu date fictive. Google Calendar nu este conectat, nu se creează o programare reală și nu se trimite nicio confirmare. Aprobarea umană rămâne obligatorie.

Nu continua până când evaluatorul confirmă că această limită este clară.

## Ce arătăm mai întâi

Indică cele patru etichete:

- Mod — Sandbox local;
- Google Calendar — Neconectat;
- Programare reală — Nu este creată;
- Aprobare — Obligatorie.

Spune:

> Aceste limite rămân vizibile pe tot parcursul demonstrației.

## Happy path

1. Confirmă disclosure-ul.
2. Selectează un serviciu.
3. Folosește data demonstrativă disponibilă.
4. Selectează intervalul preferat.
5. Alege o persoană sau continuă fără preferință.
6. Nu introduce nume ori date reale despre clienți.
7. Apasă „Propune intervale locale”.

Spune:

> Orele sunt calculate exclusiv din fixture: program, calificare, durată, buffer și indisponibilități locale. Nu provin dintr-un calendar real.

Arată maximum două propuneri; nu citi fiecare rând.

## Schimbarea preferinței

Apasă „Schimbă data sau preferința”, păstrează data demonstrativă și selectează o altă persoană.

> Propunerile vechi sunt eliminate și calculate din nou. Nimic nu a fost rezervat prin schimbarea preferinței.

Arată că noile propuneri respectă alegerea actualizată.

## Pending approval și handoff

Selectează un interval pentru aprobare.

> Se creează numai o solicitare în așteptarea aprobării. Operatorul vede serviciul, intervalul, persoana și informațiile lipsă. Nu există eveniment real și nu a fost trimisă nicio confirmare.

Indică:

- „În așteptarea aprobării”;
- aprobarea obligatorie;
- „Nu a fost trimisă nicio confirmare”;
- „Nu a fost creată nicio programare sau acțiune externă”.

## Cum explicăm viitorul Calendar și voice

> Dacă validarea operațională arată valoare, o etapă viitoare ar putea cerceta citirea limitată `free/busy` din Calendar, cu OAuth, izolare, audit și revizuire de securitate. Telefonia și vocea reală ar veni numai după validarea fluxului text, disclosure, consimțământ, handoff uman și revizuire juridică. Niciuna dintre aceste integrări nu este activă acum.

Nu oferi un termen și nu prezenta această direcție drept angajament contractual.

## Întrebarea de închidere

> Într-o afacere reală de servicii, unde ar ajuta acest flux și ce ar trebui să fie clar sau disponibil înainte să merite un pilot limitat?

Urmează cu:

> Ce credeți că s-a întâmplat după selectarea intervalului?

Răspunsul ar trebui să indice o propunere pentru aprobare, nu un booking confirmat.

## Ce nu spunem

- „ReveNew răspunde deja la apeluri.”
- „ReveNew face booking automat.”
- „Suntem conectați la Google Calendar.”
- „Clientul a primit confirmarea.”
- „AI-ul înlocuiește recepționerul.”
- „Veți obține mai multe programări.”
- „Veți crește venitul.”
- „ROI-ul este garantat.”

## Dacă evaluatorul cere funcții live

Răspuns recomandat:

> Acestea sunt ipoteze pentru etape viitoare, nu capabilități disponibile. În această validare vrem să aflăm mai întâi dacă propunerea, regulile și handoff-ul rezolvă o problemă reală fără a ascunde limitele.

