# Calendar Assistant Sandbox v1

## Scop

Calendar Assistant Sandbox este un motor determinist, local-only, care propune intervale valide pentru o programare. Nu este o integrare Calendar și nu reprezintă un sistem de booking live.

Motorul:

- citește programul salonului și al personalului;
- verifică serviciul, durata și bufferul;
- verifică compatibilitatea persoană–serviciu;
- exclude programările și indisponibilitățile locale;
- propune maximum trei alternative explicabile;
- creează numai o rezervare `pending_approval`.

Nu apelează Google Calendar, Gmail, telefonie sau alte API-uri. Nu trimite confirmări și nu creează evenimente reale.

## Model local

`src/lib/appointment-sandbox.ts` definește:

- profilul salonului;
- servicii și personal;
- program săptămânal în ora locală;
- programări și indisponibilități reprezentate prin instanți ISO;
- cererea de programare;
- intervalul propus;
- rezervarea în așteptarea aprobării.

Conversia dintre ora locală și instanții UTC folosește `Intl.DateTimeFormat` și verifică rezultatul în fusul orar configurat. Intervalele invalide în schimbările de oră sunt refuzate, nu ajustate implicit.

## Fixture fictiv

`src/lib/appointment-sandbox-fixtures.ts` include salonul fictiv **Atelier Bellezza Demo**, cu:

- patru servicii;
- trei persoane;
- program de lucru;
- o programare existentă;
- indisponibilități generale și individuale;
- fusul orar `Europe/Bucharest`.

Fixture-ul nu conține emailuri, numere de telefon sau identități reale.

## Cum sunt propuse intervalele

1. Se validează profilul, data și serviciul.
2. Se intersectează programul salonului cu programul persoanei.
3. Pe prima zi se aplică fereastra preferată, dacă există.
4. Se generează intervale la pasul configurat.
5. Durata și bufferul trebuie să încapă integral în program.
6. Sunt eliminate suprapunerile cu programări și indisponibilități.
7. Persoana preferată este folosită dacă are intervale valide.
8. Alte persoane calificate sunt folosite numai când persoana preferată nu are disponibilitate.
9. Sunt returnate una până la trei alternative distincte, cu explicații.

## Aprobare și audit

`createPendingSandboxBooking` produce exclusiv:

- `status: "pending_approval"`;
- `requiresHumanApproval: true`;
- `externalSideEffect: false`;
- `auditRequired: true`;
- `confirmedAt: null`.

Numărul de telefon nu este copiat în rezumat; motorul păstrează numai faptul că a fost furnizat. Persistența, auditul real și confirmarea rămân în afara acestui sandbox.

## Recepționerul text demonstrativ

`src/lib/text-receptionist-sandbox.ts` adaugă un flux determinist, fără LLM:

1. afișează disclosure-ul de simulare locală;
2. solicită serviciul, data și intervalul preferat;
3. colectează opțional persoana, numele și o notă;
4. folosește motorul local pentru 1–3 propuneri;
5. explică serviciul, durata, bufferul, persoana și regula de disponibilitate;
6. creează numai propunerea `pending_approval`;
7. pregătește un rezumat pentru operator, inclusiv informațiile opționale lipsă.

Pagina protejată `/demo/appointment-control` expune acest flux într-o interfață mică și progresivă. Etichetele precizează permanent că Google Calendar nu este conectat, că nu există o programare reală și că aprobarea este obligatorie.

## Neimplementat intenționat

- Google Calendar și `free/busy`;
- OAuth sau token storage;
- evenimente reale;
- emailuri și SMS-uri;
- telefonie sau voice;
- persistență în baza de date;
- confirmare automată;
- UI public sau un widget pentru client;
- recepționer telefonic real.

## Următorul pas

Următoarea iterație recomandată este un pachet local de evaluare a recepționerului: scenarii pentru informații ambigue, lipsă de disponibilitate, persoană incompatibilă, schimbarea preferinței și handoff obligatoriu. Evaluarea trebuie să măsoare completarea, refuzurile sigure și calitatea rezumatului fără provider AI, persistență sau efecte externe.
