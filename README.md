# ReveNew

Pentru contextul permanent de produs, arhitectură, securitate și faza activă, citește mai întâi [docs/CODEX_CONTEXT.md](docs/CODEX_CONTEXT.md).

ReveNew este un MVP Next.js pentru oportunități B2B: autentificare, onboarding de business, oportunități, acțiuni, documente generate mock, lead-uri, outreach și rapoarte.

## Siguranța dezvoltării

Înainte de commit rulează `npm run validate:quick`; înainte de merge sau push rulează `npm run validate`. Pașii pentru migrații, două calculatoare, Docker și recuperarea asset-urilor sunt în [ghidul de siguranță](docs/development-safety.md).

## Rulare locală

```powershell
cd "C:\Users\David\OneDrive\Documents\M"
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" install
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev
```

Aplicația pornește pe `http://localhost:3000`.

## Variabile de mediu

Copiază `.env.example` în `.env.local` și completează:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
RESEND_API_KEY=
EMAIL_SENDING_MODE=disabled
EMAIL_FROM_ADDRESS=
```

`OPENAI_API_KEY` activează analiza și generarea cu OpenAI. Trimiterea rămâne sigură implicit prin `EMAIL_SENDING_MODE=disabled`; `test` verifică numai fluxul intern, iar `live` necesită atât `RESEND_API_KEY`, cât și `EMAIL_FROM_ADDRESS`. Cheile sunt citite exclusiv pe server.

## Supabase setup

1. Creează un proiect nou în Supabase.
2. Copiază Project URL în `NEXT_PUBLIC_SUPABASE_URL`.
3. Copiază anon public key în `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copiază service role key în `SUPABASE_SERVICE_ROLE_KEY`.
5. Rulează migrările SQL din `supabase/migrations` în Supabase SQL Editor sau prin Supabase CLI.

Ordinea migrărilor:

```text
202606100001_initial_moneyhunter_schema.sql
202606100002_phase4_rls_and_workflow.sql
202606100003_fix_auth_profile_business_rls.sql
202606100007_stabilize_supabase_rls.sql
```

`202606100007_stabilize_supabase_rls.sql` este migratia finala de stabilizare pentru RLS. Este idempotenta, nu sterge tabele si nu sterge date. Activeaza politicile pentru `profiles`, `businesses`, `business_members`, `business_services`, `business_targets`, `opportunities`, `opportunity_actions`, `opportunity_documents` si `opportunity_events`.

## How to verify Supabase connection

Schema relationship used by the app:

- `profiles.user_id` stores `auth.users.id`
- `profiles.id` is the application profile id
- `businesses.owner_profile_id` references `profiles.id`
- `business_members.profile_id` references `profiles.id`

After a successful signup:

1. Supabase Auth should show a user in Authentication.
2. Table Editor should show a row in `profiles`.
3. `profiles.user_id` should equal the Auth user id.

After successful onboarding:

1. `businesses` should contain the new business.
2. `businesses.owner_profile_id` should equal `profiles.id`, not the Auth user id unless those happen to be the same.
3. `business_members.profile_id` should equal `profiles.id`.
4. `business_services` and `business_targets` should contain rows for the new business id.
5. `/settings` should show `Business source: Supabase`.

Table Editor should contain rows in:

- `profiles`
- `businesses`
- `business_members`
- `business_services`
- `business_targets`

To verify ownership and membership in SQL Editor:

```sql
select
  b.name as business_name,
  b.owner_profile_id,
  p.id as profile_id,
  p.email,
  bm.role as member_role
from public.businesses b
left join public.profiles p on p.id = b.owner_profile_id
left join public.business_members bm on bm.business_id = b.id
order by b.created_at desc;
```

Pentru oportunitati reale:

1. Intra in `/opportunities/analyze`.
2. Completeaza formularul si apasa `Analizeaza oportunitatea`.
3. Apasa `Salvează oportunitate`.
4. Aplicatia creeaza un rand real in `opportunities` cu `business_id` egal cu businessul activ si redirectioneaza catre detaliul oportunitatii.
5. `/opportunities` si `/dashboard` citesc oportunitatile reale cand Supabase este conectat.

Development diagnostics:

- `/debug/supabase` shows env/session/profile/business/table select status.
- `/debug/repair-profile` creates a missing profile for the logged-in auth user and returns the profile id.

## Demo mode

Dacă variabilele Supabase lipsesc, aplicația rămâne funcțională în demo mode:

- folosește Auto Management SRL ca business mock
- folosește oportunități, lead-uri, outreach și rapoarte mock
- login/signup redirecționează local fără Supabase
- generarea documentelor rămâne locală și mock

Mesajul afișat: `Mod demo activ - date simulate, fara scriere in baza de date.`

## Ce funcționează cu Supabase

- signup cu Supabase Auth
- login cu Supabase Auth
- creare profil în `profiles`
- protecție pentru rutele dashboard
- onboarding persistent:
  - `businesses`
  - `business_members`
  - `business_services`
  - `business_targets`
- încărcarea businessului curent în dashboard/settings
- oportunități persistente în `opportunities`
- analiza manuală salvează oportunitatea
- detaliul oportunității citește:
  - acțiuni
  - documente
  - evenimente
- butoanele din detaliu pot salva:
  - documente generate mock
  - follow-up action
  - status contacted/won/lost/ignored
- rapoartele se pot calcula din oportunitățile reale

## Ce este încă mock

- OpenAI analyzer
- generarea reală cu model AI
- Resend/email sending
- payments/subscriptions
- crearea completă de lead-uri
- administrare platformă completă

## Verificare

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run lint
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run build
```

## Phase 5: OpenAI setup

Adauga in `.env.local`:

```env
OPENAI_API_KEY=
OPENAI_MODEL=
```

`OPENAI_MODEL` este optional. Daca lipseste, aplicatia foloseste modelul implicit din cod. Dupa modificarea variabilelor de mediu, reporneste serverul de development.

Cum testezi analiza AI:

1. Configureaza Supabase si finalizeaza onboarding.
2. Adauga `OPENAI_API_KEY` in `.env.local`.
3. Reporneste serverul.
4. Mergi la `/opportunities/analyze`.
5. Completeaza oportunitatea si apasa `Analizeaza cu AI`.
6. Salvează preview-ul. Se creeaza rand in `opportunities` si eveniment in `opportunity_events`.

Cum testezi generarea de documente:

1. Deschide detaliul unei oportunitati.
2. Apasa `Genereaza email outreach`, `Genereaza script apel`, `Genereaza draft oferta` sau `Genereaza checklist`.
3. Documentele se salveaza in `opportunity_documents`.
4. `Programează follow-up` scrie in `opportunity_actions`.
5. Schimbarile de status scriu in `opportunities` si `opportunity_events`.

Fallback fara OpenAI:

- Daca `OPENAI_API_KEY` lipseste, analiza si documentele sunt generate local.
- Daca Supabase este conectat, datele reale continua sa fie salvate.
- Daca Supabase lipseste, aplicatia ramane in demo mode si nu scrie in baza de date.
