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

## Evaluare deterministă și hardening

`src/lib/text-receptionist-evaluation.ts` rulează local zece scenarii reproductibile:

1. cerere completă;
2. informații obligatorii lipsă;
3. serviciu inexistent;
4. serviciu inactiv;
5. persoană incompatibilă cu serviciul;
6. persoană preferată indisponibilă, cu alternativă calificată;
7. lipsă totală de intervale;
8. schimbarea preferinței înainte de aprobare;
9. creare exclusiv în starea `pending_approval`;
10. handoff obligatoriu către operator.

Fiecare rezultat raportează etapa finală, numărul de intervale, refuzul sigur, existența handoff-ului și invariantul fără efect extern. Evaluarea nu apelează un model, provider, API sau bază de date.

Schimbarea preferinței redeschide data, intervalul și persoana înainte de handoff. Propunerile vechi sunt eliminate și disponibilitatea este calculată din nou. După predarea către operator, modificarea este refuzată și utilizatorul trebuie să pornească o simulare nouă.

## Script scurt pentru prezentare

1. Arată etichetele permanente: sandbox local, Calendar neconectat, nicio programare reală și aprobare obligatorie.
2. Confirmă disclosure-ul și selectează serviciul, data și intervalul.
3. Generează cele 1–3 propuneri locale și explică durata, bufferul și persoana calificată.
4. Opțional, folosește „Schimbă data sau preferința” pentru a demonstra recalcularea fără rezervare.
5. Selectează un interval și arată starea „În așteptarea aprobării”.
6. Arată rezumatul pentru operator și eticheta „Nu a fost trimisă nicio confirmare”.
7. Explică faptul că integrarea Calendar și vocea sunt posibile etape viitoare, nu capabilități curente.

## Ce demonstrează evaluarea

- regulile de program, durată și buffer sunt aplicate reproductibil;
- informațiile obligatorii sunt solicitate înaintea propunerii;
- serviciile și persoanele invalide sunt refuzate explicit;
- fallback-ul folosește numai o persoană calificată;
- lipsa disponibilității nu produce intervale inventate;
- selecția rămâne o propunere pentru aprobare umană;
- handoff-ul precizează informațiile disponibile și lipsurile.

## Ce nu demonstrează

- acuratețea unui model AI sau a înțelegerii limbajului liber;
- disponibilitate dintr-un calendar real;
- răspuns la apeluri, latență voice sau calitatea unei transcrieri;
- creare, persistență ori confirmare reală a unei programări;
- trimitere de email, SMS sau altă comunicare;
- creștere de venit, ROI sau un număr garantat de programări.

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

Protocolul local pentru 3–5 evaluatori este documentat în [Appointment Control Pilot Validation Protocol](appointment-control-validation-protocol.md), împreună cu [formularul minim de feedback](appointment-control-feedback-template.md) și [scriptul comercial sigur](sales/appointment-control-demo-script.md).

După sesiuni, următorul pas este sintetizarea constatărilor anonimizate și aplicarea criteriilor continuă / ajustează / oprește. Nu se recomandă o integrare live înainte ca rezultatul să justifice un pilot limitat.
