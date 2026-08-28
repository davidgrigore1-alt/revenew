# ReveNew — G3C PRIME
Implementat local. Acceptanța vizuală rămâne manuală; nu s-a făcut commit, push sau deploy.

## 1. Fișiere schimbate
Toate căile sunt relative la `C:/Projects/ReveNew`. Modificările locale anterioare sunt păstrate.
- `src/lib/commercial-truth.ts`
- `src/lib/commercial-truth-server.ts`
- `src/lib/ai/commercial-truth-answer.ts`
- `src/components/intelligence/CopilotConversation.tsx`
- `src/components/apps/DriveWorkspace.tsx`
- `src/app/(protected)/documents/page.tsx`
- `src/app/(protected)/dashboard/page.tsx`
- `src/app/(protected)/opportunities/[id]/page.tsx`
- `src/app/(protected)/recoverable/page.tsx`
- `src/components/dashboard/ExecutionControlCenter.tsx`
- `src/lib/revenue-workspace/actions.ts`
- `src/lib/revenue-impact.ts` — nou
- `src/lib/revenue-impact-server.ts` — nou
- `src/lib/revenue-impact-actions.ts` — nou
- `src/components/recovery/ImpactControls.tsx` — nou
- `src/components/recovery/ImpactSurface.tsx` — nou
- `src/components/recovery/ImpactSurface.module.css` — nou
- `supabase/migrations/20260828110003_verified_commercial_impact.sql` — nou
- `scripts/validation/migration-integrity-baseline.json` — numai hash-ul migrării G3C adăugat
- `scripts/demo/fixtures.mjs` — estimarea viitoare nu mai este multiplicată cu 0,7
- `tests/commercial-truth-g3b.test.mjs`
- `tests/revenue-impact-g3c.test.mjs` — nou
- `docs/commercial-impact-g3c.md` — acest raport

Jurnal local suplimentar de validare: `.revenew-backups/g3c-targeted-validation.log` (nu este cod de produs).

## 2. Migrare
`20260828110003_verified_commercial_impact.sql`: două tabele, un RPC server și o funcție de imutabilitate. Migrarea a fost testată într-o bază PostgreSQL temporară separată, apoi aplicată exclusiv în Supabase local. Versiunea locală a fost înregistrată prin CLI și verificată read-only: migrare înregistrată, RLS activ pe ambele tabele, EXECUTE RPC refuzat pentru authenticated. Tabelele noi au 0 cazuri / 0 evenimente. Numărul oportunităților, evenimentelor, surselor și segmentelor existente este neschimbat. Nicio migrare anterioară nu a fost modificată.

## 3. Închiderea G3B
Cauza Atlas a fost verificată prin citiri locale limitate: compania este Atlas Fleet Services SRL, documentul sincronizat include câmpul explicit „Client: Vector Industrial”, iar oportunitatea era pe poziția 10 în ordinea de recență. Selecția veche evalua numai primele opt.
Întrebările despre documente/contradicții prioritizează acum oportunitățile cu documente sincronizate, după verificarea vizibilității prin RLS. Limita de opt evaluări rămâne explicită. Ask citează ambele surse și spune că nu poate determina automat înregistrarea corectă. Nu modifică CRM sau asocierile.
Estimarea CRM este afișată fără intervalul artificial. Drive apare în Context conectat, cu numărul documentelor din contextul evaluat. „Analizează”, căutare unificată, singular/plural corect și geometrie comună pentru comenzile Drive.

## 4. Model de impact
`commercial_impact_cases` păstrează identitatea stabilă business/oportunitate, compania disponibilă și instantaneul riscului. `commercial_impact_events` păstrează afirmațiile și referințele lor. Rezultatul comercial rămâne în oportunitatea existentă; nu există un motor paralel de rezultate.

## 5. Stări
Detectat → revizuit → pregătit → intervenție confirmată → rezultat observat → protejat / venit recuperat verificat. Invalidare și respingere explicite. Nu sunt impuse legături inexistente. Un document pregătit sau un plan `prepare_email` nu devine execuție.

## 6. Taxonomie
Valoarea detectată din banda principală este instantaneul cozii de risc autorizate, acum; nu un total istoric pentru interval. Intervențiile și verificările financiare sunt înregistrate în intervalul ales.
Estimările, valoarea aferentă intervențiilor, valoarea protejată și rezultatul efectiv sunt distincte. Monedele se însumează separat, în unități monetare minore întregi. Categoriile nu se adună. Valoarea efectivă zero este posibilă doar ca rezultat explicit verificat, nu înlocuiește lipsa dovezilor.

## 7. Atribuire
Protejarea cere intervenție confirmată, rezolvarea observată a cel puțin unui blocaj inițial și confirmarea unui responsabil autorizat.
Recuperarea cere rezultat CRM câștigat, sumă efectivă, monedă, actor/data rezultatului, dovezi, ordine temporală validă și confirmare explicită cu explicație. Nu se acceptă un rezultat istoric datat înaintea cazului/intervenției.
Formularea rămâne „rezultat observat după intervenție”, fără cauzalitate automată sau afirmații contabile despre încasări.

## 8. Deduplicare
Un singur caz per business/oportunitate și un singur rezultat canonic `opportunity:won`, conform contractului existent care permite un rezultat per oportunitate.
Identificator de cerere unic, revizii unice, referințe de intervenție unice și lock tranzacțional per oportunitate. Mai multe intervenții nu multiplică valoarea. O nouă verificare după corecție aparține aceluiași caz.

## 9. Audit
UPDATE/DELETE sunt respinse pentru ambele tabele, inclusiv prin trigger. Revocarea drepturilor directe completează protecția. Corecția înseamnă invalidare motivată, apoi o nouă afirmație cu `supersedes_id`; suma veche rămâne în istoric. FK-urile restrictive împiedică ștergerea implicită a istoricului odată cu oportunitatea/firma.

## 10. Proveniență
EvidenceReference / EvidenceList, metadate minime și referințe către CRM, document pregătit sau eveniment confirmat. Planurile existente păstrează identificatorul, aprobatorul, rezultatul și rularea/workflow-ul atunci când acestea există și sunt autorizate. Nu se copiază propuneri, corpuri Gmail, Calendar sau documente externe în ledger.
Legăturile deschid contextul canonic; istoricul impactului păstrează identificatorii exacți pentru audit.

## 11. Verificare umană
Formular explicit în panoul dovezii. Actorul și business-ul sunt derivate server-side; permisiunea `revenue.confirm` și rolul/membership-ul activ sunt verificate din nou în tranzacție. Sumele nu sunt primite din formular. Pregătirea și execuția folosesc înregistrările existente, fără acțiuni externe noi.

## 12. Recuperare venituri
Ruta existentă `/recoverable`, titlul „Impact comercial”, bandă orizontală, interval compact, listă densă și panou contextual. Coada și pregătirea asistată existente sunt păstrate. Urmărirea începe explicit dintr-un risc actual; nu există backfill de recuperări presupuse.

## 13. Dovadă executivă
Aceeași rută, `proof=1`, cu valori separate pe monedă, explicații, legături către cazuri și CSS de imprimare. Fără motor PDF, raport BI sau raport ROI inventat. „Încă neverificat” când dovezile lipsesc. Imprimarea nu a putut fi verificată vizual.

## 14. Integrare
Legături compacte „Impact urmărit · Vezi impactul/dovada” numai pentru cazuri existente, în Control Center și Contextul oportunității. O singură citire limitată cu RLS; fără reevaluare Commercial Truth pentru aceste legături.

## 15. Design
Geometrie comună de 32 px, comenzi neutre și CTA champagne, căutare unificată, separatoare și divulgarea progresivă a dovezilor. Simbolurile MIME locale existente sunt reutilizate. Nu există active oficiale Docs/Sheets în repo: nu au fost inventate logouri sau adăugate hotlink-uri.

## 16. Securitate
RLS explicit pentru citiri; browserul nu poate scrie sau executa RPC-ul. RPC-ul este SECURITY INVOKER și accesibil doar serverului privilegiat; verifică business-ul, membership-ul, ownership-ul și permisiunile de verificare. Istoricul se formează din surse validate, nu din instrucțiuni documentare.
OAuth, drive.file, tokenul GIS, limitele de ingestie, corpul conectorilor și G2 nu au fost modificate.
Contractul RLS consultat: [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security). Schimbarea de schemă folosește și regulile Supabase pentru lock-uri tranzacționale și granturi explicite.

## 17. Limite de performanță
Maximum 250 cazuri / 2.000 evenimente la încărcarea generală. Dacă limita este depășită, totalurile nu sunt publicate dintr-un istoric incomplet; deschiderea din oportunitate restrânge cazul. Maximum 40 evenimente, 20 documente și 20 planuri în selectorul dovezilor.
Commercial Truth rămâne la opt oportunități, șase documente și limitele G3B existente; noua selecție examinează cel mult 50 metadate Drive înaintea filtrului de vizibilitate.
Nu există worker, scheduler, model call pe pagină sau scanare a documentelor pentru totalurile de impact.

## 18. Teste
Comanda de grup:
```powershell
$env:REVENEW_IMPACT_TEST_CONTAINER='supabase_db_M'
node --test tests/revenue-impact-g3c.test.mjs tests/commercial-truth-g3b.test.mjs tests/recoverable-revenue-engine.test.mjs tests/commercial-response-outcome-loop.test.mjs tests/google-drive-evidence-g3a.test.mjs tests/execution-control-center.test.mjs tests/real-ai-copilot-v1.test.mjs
```
Rezultat: 107 teste, 106 reușite, 0 eșecuri, 1 omis. Testul omis este integrarea PostgreSQL G3A neschimbată; integrarea PostgreSQL G3C a rulat și a trecut. Baza temporară G3C a fost eliminată.
Testele includ Atlas prin server scope → evaluator → Ask, ambele surse, lipsa mutației, taxonomie, monede, idempotență, concurență, RLS, verificare umană, istoricul corecțiilor, planuri/workflow și refuzul de a trata un draft email ca execuție.

## 19. Validări
Typecheck, lint, validate:migrations și validate:security au trecut; verificarea de siguranță finală acoperă 773 fișiere. Integritatea verifică 42 migrări revizuite și scanează 3 migrări noi preexistente. Migrarea G3C a fost înscrisă în baseline numai după revizuirea granturilor și testarea PostgreSQL.
`git diff --check` semnalează numai linia goală finală preexistentă din `src/lib/ai/copilot-orchestrator.ts:917`; fișierul nu a fost modificat în G3C.
Nu s-au rulat build de producție sau suita completă.

## 20. Limitări
Browserul a eșuat la unica inițializare: „trusted Node process exited unexpectedly”; fără reîncercare. Nu există validare vizuală sau live Google în acest pas.
Nu există încă venit verificat sau caz populat în baza locală; aceasta este o absență a verificării, nu o performanță zero. Istoricul pornește la urmărirea explicită și nu reconstruiește retroactiv intervenții înaintea cazului.
Contractul actual permite un singur rezultat canonic per oportunitate; reînnoiri distincte necesită oportunități distincte, până la extinderea explicită a modelului. Ștergerea firmei/oportunității cu istoric necesită o politică de retenție explicită, nu cascade silențioase.
Cazurile inițiale urmăresc lipsa responsabilului, lipsa pasului viitor și restanțele; nu pretind acoperire pentru orice tip de risc.

## 21. Amânat intenționat
Contabilitate, FX, încasări, ratio ROI fără cost real, backfill automat, atribuire AI, acțiuni autonome, planificator, worker, conectori suplimentari, BI/PDF și reproiectarea altor pagini.

## 22. QA manual
- 1920×1080 și 1440×900: banda, tabelul, selecția cazului, drawer Ask și toolbar-urile.
- În workspace, „Ce informații se contrazic?”: Atlas/Vector, două surse, CTA de revizuire, fără corectare automată.
- Context conectat: Drive activ și număr limitat la documentele relevante evaluate.
- Documents: Enter pentru căutare; selecție singular/plural și alinierea Oportunitate/Tip/Elimină.
- Pe o oportunitate de test separată: urmărește riscul, confirmă o intervenție reală, inspectează protejarea, înregistrează rezultatul prin fluxul existent și verifică atribuirea.
- Invalidare, corecție, cerere repetată și a doua intervenție: suma nu se multiplică, istoricul anterior rămâne.
- Utilizator fără drept de verificare și utilizator din alt business: acces respins.
- Monede mixte, interval personalizat, caz în afara intervalului și lipsa dovezilor.
- Dovadă executivă și print preview; revizuire live Google numai cu conexiunea existentă.
