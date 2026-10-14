# ReveNew

**Un proiect personal de software pentru echipele care vând B2B.**

**[revenew.ro](https://revenew.ro/)** · **[Codul sursă](https://github.com/davidgrigore1-alt/revenew)** · **[Demo local](docs/local-demo.md)** · **[Documentație tehnică](docs/AUTHORIZATION_ARCHITECTURE.md)**

Sunt David Grigore, student la Informatică la FMI, Universitatea din București. ReveNew este proiectul la care lucrez în prezent și în care am investit cel mai mult timp. L-am început dintr-o întrebare destul de simplă: **cum își dă seama o firmă că pierde o oportunitate comercială înainte să fie prea târziu?**

Nu am vrut să construiesc încă un dashboard cu grafice. Am vrut un produs în care cineva poate vedea ce s-a întâmplat, de unde vine informația, cine trebuie să intervină și care este pasul următor.

## Ce problemă rezolvă

Într-o echipă comercială, o ofertă poate rămâne fără răspuns, un termen poate fi depășit sau o oportunitate poate ajunge să nu mai aibă un responsabil clar. Datele există adesea, dar sunt împrăștiate între persoane, documente și sisteme.

ReveNew organizează aceste situații într-un proces verificabil:

**Semnal → Revizuire → Oportunitate → Dovezi → Acțiune propusă → Aprobare → Rezultat înregistrat**

Este important că pașii nu sunt automat echivalenți. De exemplu, o recomandare generată de AI nu înseamnă că s-a trimis un mesaj, iar o sumă potențială nu înseamnă că firma a încasat banii.

## Ce am construit până acum

| Parte a produsului | Ce face concret |
| --- | --- |
| **Control Center** | Arată ce necesită atenție, motivul și următorul pas. |
| **Opportunities & Pipeline** | Urmărește oportunitățile, etapa lor, responsabilul și istoricul. |
| **Recovery Queue** | Scoate la suprafață situații comerciale expuse prin întârzieri sau informații lipsă. |
| **Commercial Inbox** | Permite revizuirea semnalelor noi înainte să intre în fluxul comercial. |
| **Company 360** | Reunește contextul unei companii, contactele, activitățile și dovezile relevante. |
| **Ask ReveNew** | Ajută la analiza informațiilor autorizate, cu surse și limite explicite. |
| **Aprobări și documente** | Separă pregătirea unei acțiuni de aprobarea și eventuala ei executare. |
| **Rapoarte** | Distinge între valori estimate, valori expuse și rezultate confirmate. |

Nu toate integrările sunt disponibile implicit în orice mediu. Funcțiile implementate, cele condiționate de configurare și cele care **nu** sunt active sunt documentate în [matricea de capabilități](docs/product-truth-matrix.md).

## Un exemplu din demo

Am pregătit un mediu de test cu firme și evenimente fictive, tocmai pentru a demonstra produsul fără date de la clienți.

În cazul **Vector Industrial**, o oportunitate de mentenanță de **76.000 RON** are un termen depășit și responsabil neconfirmat. În demo se poate urmări:

1. de ce apare cazul ca prioritate;
2. care este dovada și ce informație lipsește;
3. ce acțiune poate fi pregătită;
4. de ce aprobarea umană rămâne necesară;
5. cum apare cazul în audit.

Cifra este o **valoare fictivă din demo**, nu venit recuperat și nici rezultat comercial real. [Scenariul complet](docs/local-demo.md).

## Partea tehnică

**Stack:** Next.js 15, React 19, TypeScript, PostgreSQL, Supabase (Auth și Row Level Security), Node.js, OpenAI SDK.

Cele mai importante probleme tehnice nu au fost doar cele de interfață:

- **Izolarea datelor:** fiecare companie trebuie să vadă doar datele pentru care are drepturi. Folosesc verificări de permisiuni pe server și politici RLS în baza de date.
- **Roluri diferite:** un utilizator care administrează compania sa nu trebuie să devină automat administrator al întregii platforme.
- **Control asupra AI:** răspunsurile și propunerile trebuie limitate la datele autorizate, iar acțiunile externe necesită permisiuni și confirmare explicită.
- **Trasabilitate:** o decizie trebuie să poată fi legată de dovezile și evenimentele din care provine.
- **Testare:** proiectul include teste și verificări pentru acces, migrații, securitate și comportamentul aplicației.

Dacă vrei să intri mai adânc în implementare, aici sunt părțile relevante: [arhitectura de autorizare](docs/AUTHORIZATION_ARCHITECTURE.md), [arhitectura informațională](docs/product-information-architecture.md), [testele](tests/), [migrațiile SQL](supabase/migrations/) și [regulile de validare](docs/engineering-operating-system.md).

## Cum se poate verifica proiectul

Site-ul public este la [revenew.ro](https://revenew.ro/). Pentru o demonstrație completă, fără servicii externe și fără date reale, am documentat [configurarea locală](docs/local-demo.md). Comenzile principale, după instalarea dependențelor și pornirea Supabase local, sunt:

~~~bash
npm run demo:buyer-ready
npm run demo:dev -- --port 3001
~~~

Pentru verificarea codului:

~~~bash
npm run typecheck
npm run lint
npm run validate:security
npm test
~~~

Aceste comenzi sunt disponibile în repository; **nu susțin că sunt toate verificate pe fiecare calculator fără configurarea necesară**.

## Cum lucrez și ce urmează

Eu stabilesc direcția produsului, arhitectura pe care vreau să o obțin, prioritățile și criteriile de acceptare. Folosesc documentație, instrumente AI pentru dezvoltare, teste și multă iterație. Când o funcție arată bine, dar nu este sigură ori corectă, nu o consider terminată.

În continuare lucrez la experiența de utilizare, integrarea controlată cu instrumentele folosite de echipele comerciale și validarea produsului cu firme reale. ReveNew este un produs **în dezvoltare**, nu un business cu rezultate financiare garantate.

---

**Autor și coordonare produs:** Grigore David Alexandru · [GitHub](https://github.com/davidgrigore1-alt) · [LinkedIn](https://www.linkedin.com/in/david-alexandru-grigore-927645319/)