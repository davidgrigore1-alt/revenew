# ReveNew Growth Engine V1

**Data:** 30 octombrie 2026 · **Stare:** cercetare + drafturi de revizuit. **Fără expediere automată.**

Un motor de prospectare cu trasabilitate și control editorial. Folosește Python 3.10+ și SQLite local, fără servicii externe obligatorii. Nu modifică aplicația ReveNew sau baza de date Supabase din producție.

## Ce funcționează acum

- **16 companii** pornind de la lotul V0. Scorul de potrivire este o ipoteză, nu o predicție a conversiei.
- **7 surse oficiale revizuite pe web** la 2026-10-30 (CIPA AIR, BRIARIS, East European Trade, RARA Logistic, MHS Truck & Bus, Scania România și Orbico Supply). Alte 9 companii necesită revizuire.
- **7 emailuri editoriale individuale**, fără afirmații despre probleme interne ale firmelor, în `data/curated_copy.json` și în `reports/ReveNew_Prospectare_V1.xlsx`.
- **Interfață de cercetare offline** în `reports/Growth_Board_V1.html`, cu filtrare, scoruri, surse și previzualizarea emailurilor.
- **Generare opțională cu OpenAI Responses API**, în format JSON Schema strict, pe baza dovezilor, dacă este configurat `OPENAI_API_KEY`. Nu am executat apeluri OpenAI plătite în pregătirea pachetului.
- **Batch idempotent** care transformă numai conturile cu surse revizuite în drafturi. Nu caută sau colectează automat contacte personale; nu trimite.
- **Permisiuni și aprobări**: consimțământ explicit documentat, dovadă, dată, reviewer, suprimare globală pe adresă, aprobarea copiei, verificarea identității `@revenew.ro` înainte de **crearea unui draft Gmail nesent**.
- **17 teste automate** pentru validare, blocări legale, XSS în dashboard, idempotency, aprobare, suprimare și schimbarea dovezilor.

## Cum începi (Windows)

Extrage arhiva și deschide terminalul în director. Nu este necesară instalarea unor pachete Python.

```powershell
py -3 growth_v1.py init
py -3 growth_v1.py stats
py -3 growth_v1.py batch --limit 10
py -3 growth_v1.py dashboard
py -3 growth_v1.py export
py -3 -m unittest discover -s tests -v
```

Deschide `reports/Growth_Board_V1.html` în browser; sau deschide Excelul `reports/ReveNew_Prospectare_V1.xlsx`.

Pentru procesare manuală periodică există `run_daily_review.ps1` care rulează ingestia, batchul, dashboardul și exportul. Poate fi programat ulterior prin Windows Task Scheduler (nu este instalat automat).

## Cum se adaugă o sursă revizuită

Până când sursa nu este revizuită, motorul blochează generarea emailului. Exemplu (nu folosi ca dovadă reală):

```powershell
py -3 growth_v1.py verify-source exemplu.ro --url https://exemplu.ro/despre --fact "Compania oferă servicii B2B descrise public în pagina oficială." --excerpt "Fragmentul exact de pe site-ul oficial" --reviewer "Operatorul care a verificat"
```

**Important:** nu declara o observație drept verificată decât după deschiderea paginii și controlul manual al datelor. Un scor mare nu înlocuiește dovada.

## Cum se generează un email nou cu OpenAI

`OPENAI_MODEL` este configurabil; modelul ales trebuie să fie disponibil contului și facturării tale OpenAI.

```powershell
$env:OPENAI_API_KEY = "cheie API din contul tău; nu o salva în cod"
py -3 growth_v1.py draft cipa-air.ro --ai --model gpt-6.1-terra
```

Rezultatul intră în `PENDING`, fără permisiune de expediere. Fiecare apel AI presupune cost și trebuie revizuit. Nu încărca în prompt date sensibile sau informații interne neautorizate.

## Aprobarea unui draft (DOAR după acord real)

Exemplu cu valori **fictive**, exclusiv pentru a explica mecanismul. Nu rula pentru persoane reale fără dovada autentificabilă a consimțământului.

```powershell
py -3 growth_v1.py consent cipa-air.ro --email persoana@exemplu.ro --proof-id internal:crm:ID_DOVADA --evidence "Acord expres pentru mesaje ReveNew înregistrat la data și ora specificată; dovadă stocată și verificată în CRM" --reviewer "Operator" --at "2026-10-30T09:00:00+02:00"
py -3 growth_v1.py approve cipa-air.ro --recipient persoana@exemplu.ro --reviewer "Operator"
```

**Opțiune exclusiv pentru crearea draftului nesent în Gmail:** după configurarea unui cont profesional real, OAuth2 cu `gmail.compose`, `GMAIL_ACCESS_TOKEN` și `GMAIL_SENDER_EMAIL` egal cu identitatea autentificată `@revenew.ro`:

```powershell
py -3 growth_v1.py gmail-draft cipa-air.ro
```

Codul **nu include un endpoint de expediere**. În această versiune nu se garantează identitatea unui alias Gmail; este cerută o căsuță `@revenew.ro` autentificată direct. Dacă tokenul nu corespunde căsuței, comanda este blocată.

Refuz/dezabonare:

```powershell
py -3 growth_v1.py suppress persoana@exemplu.ro --reason "Solicitare de încetare contactare"
```

Aceasta blochează automat aprobările ulterioare pentru adresă. `private/growth_v1.sqlite3` este local și conține potențial date personale; **nu îl urca în GitHub și nu îl partaja public**.

## Reguli obligatorii

1. În România, Legea nr. 506/2004, art. 12, impune ca regulă generală acord expres prealabil pentru comunicări comerciale prin email inclusiv către persoane juridice. Excepția pentru clienții existenți este limitată; acest MVP alege doar opt-in explicit. Sursa: https://legislatie.just.ro/Public/DetaliiDocument/257056
2. O adresă de contact găsită pe site nu este consimțământ.
3. Google cere SPF/DKIM/DMARC și măsuri suplimentare pentru expeditorii de volum. Nu optimizăm pentru volum în detrimentul reputației. https://support.google.com/mail/answer/81126
4. MX-urile `revenew.ro` sunt configurate pentru ImprovMX în auditul anterior. Nu modifica DNS ori identitatea expeditorului fără migrare și testare. **Această versiune nu a modificat DNS.**
5. Nicio companie din acest lot nu a fost contactată și nu a fost atribuit un acord de marketing.
6. Copiile sunt exemple editoriale, nu confirmă nevoia de cumpărare sau interesul companiei. Prima conversație sau un pilot trebuie să le verifice.

## Componente și limitări

```
Growth_Board_V1.html          Interfață offline de cercetare, nu aplicație cloud
ReveNew_Prospectare_V1.xlsx   Dashboard, companii, 7 drafturi, protocol
Prospects_V1.csv             Export public fără emailuri personale
private/growth_v1.sqlite3     Date locale; NU se include în release-ul public cu contacte
```

**Nu sunt încă făcute:** integrare n8n activă, import regulat din furnizori B2B, enrichment cu surse comerciale autorizate, Google Workspace pe `@revenew.ro`, sincronizarea inboxului, flux de captare opt-in în website, raportarea răspunsurilor, integrarea produsului ReveNew în QA/Production. Acestea sunt etape separate, nu presupunem că au fost finalizate.

## Ce vrem să demonstrăm comercial

Prima lună: cel puțin 20 de companii cercetate corect, 5–10 demonstrații personalizate construite, primele conversații autorizate și 3–5 piloți invitați. Sunt **ținte**, nu promisiuni. Măsurăm răspunsuri relevante, întâlniri, activări pilot și clienți, nu doar mesaje expediate.
