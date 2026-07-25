# Demo local ReveNew

Acest flux pregătește un mediu local, repetabil și strict fictiv pentru o demonstrație comercială. Nu modifică `.env.local`, nu folosește date găzduite și refuză orice API sau bază Supabase care nu indică exclusiv loopback (`localhost`, `127.0.0.1` sau `::1`).

## Pregătire

1. Pornește Docker și stiva locală: `npx supabase start`.
2. Setează numai în terminal o parolă pentru `REVENEW_DEMO_PASSWORD`; nu o salva în repository.
3. Rulează `npm run demo:buyer-ready`.
4. Pornește aplicația: `npm run demo:dev` sau `npm run demo:dev -- --port 3001`.
5. Autentifică-te cu `irina.petrescu@revenew-demo.invalid` și parola aleasă.
6. Dacă apare pagina Access, selectează explicit un plan Preview. Nu este creată o subscripție fictivă.

Poți rula separat `npm run demo:seed` și `npm run demo:verify`. Launcher-ul folosește numai valorile stivei locale, dezactivează emailul extern și AI-ul și nu modifică billing-ul. Seed-ul verifică RLS înainte de granturile locale read-only; politicile și migrațiile de producție rămân neschimbate.

Contul local primește rolul minim existent `platform_operator` numai pentru a accesa traseul intern `/demo`. Rolul este creat exclusiv în baza locală; nu este modificată logica de autorizare și nu se acordă acces de administrator platformă.

## Scenariul

Workspace: **Meridian Commercial Operations**. Identitatea operatorului și toate companiile, contactele, adresele și evenimentele sunt fictive.

Povestea principală urmărește proiectul de mentenanță al Vector Industrial: valoare estimată de 76.000 RON, termen depășit, responsabil neatribuit și aprobare umană necesară. Alte cazuri arată follow-up restant, date de contact incomplete, document pregătit dar netrimis și o oportunitate de 12.000 EUR păstrată separat de valorile RON. Valorile estimate nu sunt venit confirmat.

## Traseu de prezentare

1. `/dashboard` — riscul principal, dovada și prima acțiune sigură.
2. `/demo` — firul narativ de cinci minute.
3. `/opportunities/de300006-0000-4000-8000-000000000006` — oportunitatea principală.
4. `/reports` — pipeline estimat, expunere estimată și venit confirmat.
5. `/reports/revenue-recovery-audit` — auditul verificabil.
6. `/reports/enterprise-pilot-pack` — validarea controlată pe 14 zile.

În prezentare: explică riscul, deschide dovada, arată responsabilul lipsă și acțiunea sigură, apoi încheie cu auditul și pilotul. ReveNew pregătește decizia; oamenii autorizați verifică, aprobă și execută.

Nu afirma venit garantat, recuperare automată, ROI promis sau trimitere automată. Nicio comunicare externă nu este trimisă automat.

## Buyer Demo Checklist

- confirmă workspace-ul `Meridian Commercial Operations`;
- confirmă că nu apar `testdavid`, `davidtest`, `TEST DATA`, `E2E` sau email personal;
- deschide Dashboard, Demo, oportunitatea principală, Audit și Pilot Pack;
- verifică primul CTA, dovada, aprobarea umană și separarea estimat/confirmat;
- verifică butoanele de print și absența overflow-ului;
- încheie cu propunerea de pilot, fără promisiune financiară.

## Resetare și siguranță

- `npm run demo:reset` elimină numai workspace-ul local cu identificatorul demo fix; contul Auth local este păstrat.
- `npm run demo:reset -- --full` resetează toate datele locale și este intenționat distructiv numai pentru stiva locală.
- Scripturile se opresc înainte de scriere dacă stiva nu este locală, nu afișează chei și nu persistă parola.
- `npm run demo:verify` verifică identitatea, domeniile rezervate, monedele separate, dovezile, aprobarea, documentele netrimise și izolarea RLS.
