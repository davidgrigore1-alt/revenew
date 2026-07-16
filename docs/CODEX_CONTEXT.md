# ReveNew — context permanent pentru Codex

Acest document este sursa concisă de context pentru sesiunile Codex. Verifică întotdeauna și codul, istoricul Git și documentația direct relevantă înainte de modificări.

## Produs

ReveNew este o platformă B2B de recuperare comercială, cu interfață în primul rând în limba română.

Fluxul principal este:

date comerciale → semnal recuperabil → analiză AI sau deterministă → revizuire umană → CRM/oportunitate/acțiune/draft → follow-up aprobat → rezultat comercial urmărit

ReveNew nu este un produs de colectare a creanțelor și nu promite venit garantat.

## Stack curent

- Next.js 14 App Router și TypeScript
- Supabase/PostgreSQL, Supabase Auth și Row Level Security
- interfață Romanian-first
- analiză compatibilă OpenAI, cu fallback determinist
- GitHub ca sursă de adevăr
- GitHub Actions și validări locale ca porți de siguranță

## Identitate și arhitectură multi-tenant

Lanțul de proprietate existent trebuie păstrat:

`auth.users.id` → `profiles.user_id` → `profiles.id` → `businesses.owner_profile_id`

Apartenența la workspace este impusă prin `business_members` și helper-ele de autorizare existente. Nu introduce niciodată `businesses.owner_id`. Fiecare înregistrare de business trebuie să rămână izolată prin tenant.

## Capabilități implementate

- autentificare și onboarding
- companii și contacte CRM
- oportunități și pipeline
- acțiuni/task-uri și documente de oportunitate
- rapoarte și dashboard
- Inbox Comercial
- Recoverable Revenue Engine V1
- ingestie CSV idempotentă
- detectarea oportunităților inactive
- AI Recovery Analyst V1, inclusiv fallback determinist
- aprobare explicită a semnalelor și conversie tranzacțională
- AI Follow-up Studio
- revizuire și aprobare de drafturi
- porți de siguranță și validare CI

## Cerințe de securitate

Aceste cerințe sunt nenegociabile:

- securitate și confidențialitate by design; privilegiu minim
- izolare strictă între workspaces și identitate de workspace derivată pe server
- nu se acceptă din client `business_id`, roluri, proprietari, permisiuni sau stări de aprobare ca autoritate
- RLS pentru datele tenantului; fără service-role key în browser
- fără secrete în loguri și fără lookup sau mutații între workspaces
- fără acțiuni comerciale externe automate; aprobarea umană explicită este obligatorie
- auditabilitate și date minime trimise furnizorilor AI
- validare strictă a răspunsului furnizorului și fallback determinist sigur
- numai migrări aditive; fără operații distructive pe baza remote
- aplicarea migrărilor remote necesită aprobarea explicită a utilizatorului

## Reguli de dezvoltare

- inspectează numai fișierele direct relevante și reutilizează arhitectura existentă
- evită logica de business duplicată, dependențele inutile, fișierele gigant și abstracțiile speculative
- nu modifica migrări istorice
- nu face deploy, commit sau push fără instrucțiune explicită
- nu rula `npm audit fix --force` și nu expune conținutul fișierelor `.env`
- folosește copy profesional în română
- separă valoarea estimată de venitul câștigat confirmat
- nu afirma că un email a fost trimis decât dacă un furnizor real a confirmat livrarea

## Reguli de mediu

- `.env.local` conține de regulă configurația remote de dezvoltare
- `.env.development.local` suprascrie `.env.local`
- URL-urile Supabase locale precum `127.0.0.1` necesită Docker; Supabase remote nu necesită Docker
- fișierele runtime `.env` nu se comit
- diagnostichează asset-urile Next.js stale înainte de a șterge `.next`
- validarea în browser folosește în mod normal portul `3001`

## Comenzi de validare

- `npm run validate:quick`
- `npm run validate`
- `npm run typecheck`
- `npm run lint`
- `npm run validate:migrations`
- `npm run validate:security`
- `npm run build`
- `git diff --check`

## Starea curentă a produsului

Sistemul poate importa sau detecta semnale comerciale, le poate analiza și prioritiza, poate genera recomandări structurate, poate converti semnale aprobate în obiecte CRM, poate crea și revizui drafturi de follow-up, poate aproba drafturile pentru utilizare și urmărește separat valoarea estimată și valoarea confirmată.

HUMAN-APPROVED EMAIL SENDING V1 este implementat. Configurația implicită este `disabled`; modul `test` persistă și auditează fluxul fără livrare externă, iar modul `live` poate apela furnizorul numai după aprobare, verificarea versiunii și confirmare umană finală explicită.

## Următoarea fază activă

Validarea operațională continuă a fluxului de trimitere și orice extindere ulterioară a livrării live trebuie să păstreze aprobarea umană, idempotency, auditul și separarea strictă dintre test, livrare reală și venit confirmat.
