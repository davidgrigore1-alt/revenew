# Demo local ReveNew

Acest flux pregătește un workspace local, repetabil și strict fictiv pentru verificarea produsului. Nu modifică `.env.local`, nu contactează servicii externe și refuză să ruleze dacă API-ul sau baza Supabase nu indică exclusiv loopback (`localhost`, `127.0.0.1` sau `::1`).

## Pregătire

1. Pornește Docker și stiva locală cu `npx supabase start`.
2. Configurează parola contului demo doar în sesiunea terminalului, prin variabila `REVENEW_DEMO_PASSWORD`. Nu o salva în repository.
3. Rulează `npm run demo:seed`.
4. Rulează `npm run demo:verify`.
5. Pornește aplicația cu `npm run demo:dev` sau, pentru alt port, `npm run demo:dev -- --port 3001`.

Launcher-ul injectează în proces doar valorile returnate de stiva locală Supabase, folosește modul local `preview` deja implementat de produs și dezactivează explicit emailul extern și AI-ul. Planul se alege explicit în pagina Access; nu este creată o subscripție activă fictivă. Fișierul `.env.local` rămâne neatins.

Deoarece configurația locală folosește `auto_expose_new_tables=false`, seed-ul acordă local rolului `authenticated` numai privilegiul `SELECT` pe tabelele necesare verificării UI. Înainte de grant verifică faptul că fiecare tabel are RLS activ. Rolurile `anon` și `service_role` nu primesc privilegii suplimentare, politicile RLS nu sunt modificate, iar granturile nu sunt persistate în migrațiile de producție. Operațiile de scriere din UI rămân intenționat în afara acestui demo read-only.

## Conținut

- un workspace marcat `[DEMO]`;
- opt companii fictive și opt contacte pe domeniul rezervat `.test`, inclusiv o companie cu două contacte;
- unsprezece oportunități în RON, inclusiv stări active, risc, rezultat câștigat și rezultat pierdut;
- acțiuni restante, scadente astăzi și viitoare;
- evenimente auditabile și documente locale care necesită control uman;
- activare locală prin fluxul Preview existent, fără a modifica billing-ul sau tabelul de subscripții.

Datele nu declanșează emailuri, webhook-uri, apeluri AI sau acțiuni comerciale externe.

## Resetare

- `npm run demo:reset` elimină numai workspace-ul demo și datele sale dependente. Contul Auth local este păstrat.
- `npm run demo:reset -- --full` execută resetarea completă a bazei locale prin Supabase CLI. Această variantă este distructivă pentru toate datele locale.

După oricare resetare, `npm run demo:seed` reconstruiește scenariul în mod determinist. Datele calendaristice sunt recalibrate relativ la ziua rulării pentru ca acțiunile restante și cele scadente să rămână relevante.

## Siguranță și depanare

- Dacă stiva nu rulează sau indică o gazdă non-locală, comenzile se opresc înainte de orice scriere.
- Scripturile nu afișează chei Supabase și nu persistă parola demo.
- `npm run demo:verify` verifică structura fixture-urilor, rezultatele financiare, relațiile, coada de lucru și izolarea RLS cu un tenant temporar eliminat după test.
- Pentru a inspecta emailuri exclusiv locale, folosește Mailpit-ul pornit de Supabase. Demo-ul nu trimite mesaje automat.
