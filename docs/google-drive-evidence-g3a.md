# ReveNew — G3A: surse comerciale Google Drive

## Implementare și graniță de autorizare

Drive este o capabilitate a conexiunii Google Workspace existente. Se solicită incremental numai `drive.file`, după confirmarea explicației de acces; Gmail/Calendar nu sunt solicitate din nou în lista de scope-uri Drive. State, PKCE și legarea de profil, firmă și conexiune sunt verificate la callback. Un alt cont Google este refuzat. Refuzul consimțământului nu modifică conexiunea existentă.

### Modelul tokenului Picker — corecție G3A.1

Credențialele Google persistente rămân pe server și pot reprezenta granturi combinate Gmail/Calendar/Drive. Ingestia și sincronizarea manuală folosesc în continuare refresh tokenul criptat, fără a refuza coexistența scope-urilor. Dacă Google raportează explicit lipsa scope-ului Drive, accesul Drive este invalidat ca înainte.

Google Picker folosește un token separat, de scurtă durată, obținut în browser prin `google.accounts.oauth2.initTokenClient`, cu `scope=drive.file` și `include_granted_scopes=false` explicit. `login_hint` folosește emailul contului Google conectat, fără un nou model de identitate. [Contractul GIS oficial](https://developers.google.com/identity/oauth2/web/reference/js-reference#TokenClientConfig).

POST `picker_config` livrează numai client ID public, număr proiect, cheie browser restrânsă, connection ID și login hint, după verificarea actorului și conexiunii. Răspunsul este `no-store` și nu face refresh. Vechea acțiune `picker`, care livra un token server, este retrasă.

SDK-urile și configurația publică pot fi pregătite la deschiderea suprafeței Drive; cererea GIS pentru token pornește numai la click pe selecție. Tokenul GIS este verificat strict pentru `drive.file` înainte de utilizarea în Picker și rămâne numai în memoria interacțiunii active. Referințele sunt curățate la succes/anulare/eroare/abort; Picker este distrus. Nu se revocă granturile Google la închiderea Picker și nu se persistă tokenul în storage, cookie, URL, state de aplicație, audit sau loguri.

Login hint minimizează alegerea unui alt cont; nu reprezintă o verificare criptografică a contului ales în browser. După selecție, serverul verifică din nou fișierul prin credențialul persistent al conexiunii administrate. Un fișier inaccesibil acelei conexiuni este refuzat indiferent de rezultatul Picker.

## Configurare manuală

Pe lângă variabilele OAuth existente:

- `GOOGLE_PICKER_APP_ID`: numărul proiectului Google Cloud asociat aplicației OAuth.
- `GOOGLE_PICKER_BROWSER_KEY`: cheie browser restrânsă la Google Picker API și la referrer-ele HTTPS exacte ReveNew; configurați separat originile locale aprobate.
- Activați Google Picker API și Drive API în proiectul corect. Păstrați redirect URI existent și configurați originile JavaScript autorizate pentru același `GOOGLE_CLIENT_ID`, necesare GIS.
- Aplicați migrația G3A prin procesul normal de rollout înainte de utilizare. Nu a fost aplicată bazei aplicației în acest pass.

Cheia browser, client ID și numărul proiectului sunt configurație publică, pregătită în suprafața Drive autorizată; acest pas nu livrează și nu obține tokenuri. Codul nu poate verifica restricțiile configurate în consola Google. Lipsa lor blochează Picker; nu se creează automat alte credențiale/proiecte.

## Flux și persistență

Picker oficial, listă, multiselect, filtre MIME, fără dosare sau căutare proprie în Drive → revizuire unică → context ales explicit → confirmare → metadate și conținut verificate din nou pe server.

`opportunity_documents` rămâne modelul de materiale redactate/trimise. Extensia pentru surse externe folosește:

- `external_document_sources`: identitate unică `(connection_id, provider_file_id)`, context Opportunity, versiune, hash, stare, autor.
- `external_document_segments`: ordinal, text neîncrezut, hash, locație demonstrabilă. Identificatorii segmentelor rămân stabili când conținutul nu se schimbă.
- `external_document_audit`: numai identități, tip de eveniment și timp; fără corp de document, payload Google sau câmp JSON liber.

Salvarea, înlocuirea segmentelor și auditul sunt atomice. Revizia verificată la commit împiedică suprascrierea unei eliminări sau revocări de către o ingestie veche. Un conflict concurent cere repetarea operațiunii; nu promitem că fiecare request reușește.

Serverul verifică profilul conexiunii, firma, scope-ul, oportunitatea, accesibilitatea ID-ului, MIME și canDownload. URL-ul de acces este construit pe domeniul fix Google Drive; nu se descarcă URL-uri furnizate de browser. Citirile și mutațiile sunt limitate la firmă; doar proprietarul conexiunii poate folosi credentialul. Membrii firmei cu permisiune de citire documente pot vedea dovezile confirmate, conform modelului existent de documente comerciale. Nu există confidențialitate nouă la nivel de record.

## Formate și limite

| Format | Conținut disponibil | Proveniență |
| --- | --- | --- |
| Google Docs | export text/plain | linii din export; fără pagini/secțiuni inventate |
| Google Sheets | prima foaie exportată CSV | rânduri CSV; nu workbook complet, formulele nu se evaluează |
| Text simplu | UTF-8 | linii din textul normalizat |
| PDF | doar metadate | fără text sau pagini pretinse |
| Alte formate | stare neacceptată, numai metadate dacă ajung la server | fără extracție |

Limite centralizate: 10 fișiere/lot, concurență 2, download 5 MiB, export 1 MiB, 200.000 caractere, 128 segmente × maximum 8.000 caractere, Sheets 1 foaie/500 rânduri/40 coloane/10.000 celule, timeout Google 15 secunde per request. Fișierele care depășesc limita nu sunt trunchiate și prezentate drept complete. Eșecurile sunt izolate pe fișier. Listele de gestionare afișează maximum 100 surse; din Apps sunt oferite primele 100 oportunități. Orice altă oportunitate poate porni selecția din propriul tab Documente.

## Sincronizare și eliminare

Fără polling, worker, Changes API sau scheduler. Sincronizarea manuală verifică metadatele. Versiunea și modifiedTime neschimbate evită reexportul; schimbarea conținutului înlocuiește segmentele. Metadatele sunt recitite după export pentru a refuza o versiune schimbată în timpul descărcării.

Eliminarea păstrează numai un tombstone minim cu identitatea providerului și auditul, șterge segmentele, numele, hash-ul, resource key și relația comercială. Nu se face DELETE în Google Drive. Reselectarea explicită poate reactiva aceeași identitate. Pierderea accesului observată prin verificare/sincronizare curăță conținutul și dezactivează dovada. Fără polling, revocarea externă nu poate fi detectată instantaneu. Deconectarea Google curăță conținutul Drive prin trigger.

## Integrare produs și G3B

Tab compact Documente în Opportunity și gestionare în capabilitatea Google Workspace. Company linking este amânat. Sursele și locațiile folosesc EvidenceReference/EvidenceList. Control Center rămâne la patru dovezi implicite, cu „Vezi toate dovezile”; aceeași resursă nu este duplicată în activitate. Nu s-au adăugat KPI-uri, panouri sau scroll intern suplimentar.

Textul importat este exclusiv date neîncrezute și este afișat ca text, fără interpretarea marcajelor, fără HTML executabil. Nu se apelează LLM, workflow sau tool din text. Fără embeddings, căutare semantică, rezumate sau G3B. Citările viitoare trebuie să păstreze documentul și segmentul; după schimbarea versiunii, un segment vechi nu trebuie reinterpretat ca o locație nouă.

## Privilegii revizuite

Migrația acordă SELECT/INSERT/UPDATE/DELETE exclusiv backend-ului pentru cele trei tabele noi și EXECUTE pentru funcția tranzacțională. Anon/authenticated/public nu primesc acces Data API. Funcțiile sunt SECURITY INVOKER, search_path fix; RLS este activă ca apărare suplimentară. Testul PostgreSQL acordă SELECT numai în baza temporară pentru a verifica separat politicile RLS, apoi șterge acea bază.

## QA manual necesar

Verificați contul/proiectul Google reale: grant/refuz, token cu scope exact, aceeași identitate în Picker, Docs/Sheets/PDF/text și Shared Drive selectat explicit, export fără permisiune, rename/resync/revoke/remove. Verificați desktop/mobil, tastatură și dialoguri. Unica inițializare Browser a eșuat în sandbox; nu există verificare vizuală sau OAuth live declarată.

Nu s-au instalat dependențe. Fără commit, push, deploy, build de producție sau suită completă.

## Fișiere schimbate în G3A

- `src/lib/google-workspace/oauth.ts`
- `src/app/api/integrations/google/connect/route.ts`
- `src/app/api/integrations/google/callback/route.ts`
- `src/lib/google-workspace/types.ts`
- `src/lib/google-workspace/repository.ts`
- `supabase/migrations/20260828011406_scoped_google_drive_evidence.sql`
- `src/lib/google-workspace/drive-core.ts`
- `src/lib/google-workspace/drive-provider.ts`
- `src/lib/google-workspace/drive.ts`
- `src/app/api/integrations/google/drive/route.ts`
- `src/components/apps/drive-picker.ts`
- `src/components/apps/DriveWorkspace.tsx`
- `src/lib/google-workspace/drive-types.ts`
- `src/lib/evidence-reference.ts`
- `src/components/ui/IntegrationBrandIcon.tsx`
- `src/components/evidence/EvidenceList.tsx`
- `src/lib/integrations/presentation.ts`
- `src/components/apps/GoogleCapabilities.tsx`
- `src/app/(protected)/opportunities/[id]/page.tsx`
- `src/app/(protected)/opportunities/[id]/sources/[sourceId]/page.tsx`
- `src/lib/execution-control-center.ts`
- `src/app/(protected)/dashboard/page.tsx`
- `tests/applications-provider-model.test.mjs`
- `tests/google-drive-evidence-g3a.test.mjs`
- `src/components/apps/GoogleWorkspaceCard.tsx`
- `src/components/apps/IntegrationDetailDrawer.tsx`
- `env.example`
- `docs/google-drive-evidence-g3a.md`
- `scripts/validation/migration-integrity-baseline.json`

## Rezultate locale

69/69 teste țintite, inclusiv PostgreSQL real în container temporar fără rețea; zero teste sărite. Typecheck, lint, validate:migrations și validate:security au trecut. Migrația a fost testată numai în baza temporară. Verificarea globală git diff --check indică o linie goală la EOF în src/lib/ai/copilot-orchestrator.ts, fișier nemodificat în G3A. Browser a eșuat la unica inițializare; fără QA vizual sau OAuth live.

## Verificare G3A.1 — alinierea tokenului Picker

Au fost schimbate numai:

- `src/lib/google-workspace/drive.ts`
- `src/lib/google-workspace/oauth.ts`
- `src/app/api/integrations/google/drive/route.ts`
- `src/components/apps/drive-picker.ts`
- `src/components/apps/DriveWorkspace.tsx`
- `tests/google-drive-evidence-g3a.test.mjs`
- `docs/google-drive-evidence-g3a.md`
- `env.example`

62 teste Google/Picker trecute, fără eșecuri; un test PostgreSQL exclus intenționat deoarece migrația nu s-a schimbat. Typecheck, lint, validate:security și diff-ul fișierelor G3A.1 au trecut. Nu s-au reluat validarea migrațiilor, testul bazei de date, build-ul de producție sau Browser. QA live rămâne necesar pentru originile JavaScript GIS, popup, login hint cu mai multe conturi, scope-ul tokenului și sincronizarea persistentă după închiderea Picker.

Fără modificări la migrație, limite, extracție, revizuire, persistență, dovezi sau G2. Fără commit, push sau deploy.
