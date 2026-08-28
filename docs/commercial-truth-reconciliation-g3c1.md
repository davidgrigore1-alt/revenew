# ReveNew — G3C.1: reconcilierea situației comerciale

## Rezultat și cauze

Proiecția aprobării nu transporta identitatea responsabilului, iar recomandarea interpreta absența numelui drept lipsă de atribuire. Antetul oportunității reutiliza observația istorică a semnalului. Amânarea actualiza lista locală, fără invalidarea suprafețelor dependente. Truth selecta separat primul pas viitor, în timp ce celelalte suprafețe foloseau prima acțiune incompletă.

Nu s-a modificat schema, migrarea G3C, RLS, autorizarea Google, ingestia sau mecanismul verificării impactului. Nu s-au modificat date comerciale, instantanee sau evenimente istorice.

## Contractul curent

- `buildOpportunityCommercialState` rămâne resolverul semantic comun: responsabil, acțiune incompletă prioritară, termen curent, restanță, aprobare, blocaje, momentul evaluării.
- Truth folosește aceeași acțiune curentă. Lipsa unui pas viitor dintr-o ofertă rămâne o verificare distinctă. Câmpurile CRM citite acum nu devin istorice doar fiindcă înregistrarea este veche.
- `getCurrentCommercialStateForOpportunity` verifică permisiunea și businessul derivat pe server. Întrebările simple Ask nu încarcă textul documentelor, fragmente Drive sau context Google.
- Numele indisponibil al unui responsabil atribuit nu înseamnă responsabil neatribuit.
- `resolvedSinceDetection` prezintă doar schimbări documentate în activitatea existentă și încă valabile acum. Nu verifică venit și nu modifică Impact Before.
- `revalidateCommercialState` invalidează oportunitatea, lista, Control Center, Recovery, Pipeline, Activitatea mea, Ask și aprobările după mutațiile auditate. Componentele existente primesc datele prin refresh; amânarea adoptă termenul întors de server.
- Răspunsurile Ask deja afișate rămân instantanee datate. O nouă întrebare recitește starea curentă.
- Snapshoturile Impact rămân separate de coada operațională. Aprobarea rămasă poate înlocui motivul rezolvat; o altă acțiune restantă rămâne vizibilă.

## Verificarea locală Vector (numai citire)

Responsabil: Irina Petrescu. Acțiune: „Escaladează lipsa deciziei”, 31 august 2026, 15:02 Europe/Bucharest. Aprobare: `ready_for_review`. Impact Before: `ownerId=null`, `missingOwner=true`, `overdue=true`, `missingNext=true`. O intervenție confirmată. Datele nu au fost rescrise.

## UI

Bandă compactă pentru valoare, responsabil, termen și blocaj. Recomandarea separă situația actuală, schimbările documentate, ce rămâne și acțiunea sigură. Sumarul duplicat al istoricului este ascuns pe pagina oportunității. Dovezile reutilizează EvidenceList și iconurile locale. Controalele secundare au bordură neutră mai vizibilă; Button small și toolbar păstrează geometria de 32 px. Identificatorii Impact rămân sub „Detalii tehnice”; numele sunt rezolvate prin RPC-ul existent, limitat la business.

## Fișiere modificate (34)

### Stare, citire și recomandări

- src/lib/opportunity-commercial-state.ts
- src/lib/opportunity-attention.ts
- src/lib/workspace-decision-queue.ts
- src/lib/operational-intelligence.ts
- src/lib/revenue-recovery-queue.ts
- src/lib/commercial-truth.ts
- src/lib/commercial-truth-server.ts
- src/lib/opportunity-intelligence-timeline.ts
- src/lib/revenue-impact-server.ts
- src/lib/supabase/data.ts
- src/lib/types.ts

### Mutații și Ask

- src/lib/commercial-state-invalidation.ts — nou
- src/lib/actions.ts
- src/lib/revenue-workspace/actions.ts
- src/lib/crm/contact-actions.ts
- src/lib/commercial-inbox.ts
- src/lib/ai/action-planner.ts
- src/lib/ai/commercial-truth-answer.ts
- src/lib/ai/copilot-orchestrator.ts
- src/lib/ai/copilot-tools.ts

### Prezentare

- src/app/(protected)/opportunities/[id]/page.tsx
- src/app/(protected)/recoverable/page.tsx
- src/components/intelligence/RecommendationExplanationCard.tsx
- src/components/intelligence/CopilotConversation.tsx
- src/components/commercial-truth/CommercialTruthSnapshot.tsx
- src/components/opportunities/OpportunityControlCenter.tsx
- src/components/opportunities/OpportunityIntelligenceTimeline.tsx
- src/components/opportunities/OpportunityWorkflow.tsx
- src/components/recovery/ImpactSurface.tsx
- src/components/ui/Button.tsx
- src/components/ui/ActionToolbar.tsx

### Teste și raport

- tests/commercial-truth-g3b.test.mjs — 10 regresii G3C.1 și adaptarea fixturelor
- tests/operational-intelligence-center.test.mjs — atribuire explicită în fixture
- docs/commercial-truth-reconciliation-g3c1.md — acest raport

Copiile de siguranță și logul de validare sunt locale, în `.revenew-backups`.

## Validare

```powershell
node --test --test-reporter=tap tests/commercial-truth-g3b.test.mjs tests/workspace-decision-queue.test.mjs tests/operational-intelligence-center.test.mjs tests/recoverable-revenue-engine.test.mjs tests/opportunity-intelligence-timeline-v1.test.mjs tests/revenue-impact-g3c.test.mjs tests/opportunity-workflow-integrity-pass.test.mjs tests/real-ai-copilot-v1.test.mjs tests/google-drive-evidence-g3a.test.mjs tests/execution-control-center.test.mjs
```

144 teste: 142 trecute, 0 eșuate, 2 omise intenționat (Postgres G3A/G3C; schema nu s-a schimbat). Typecheck și lint: trecute. Validarea de securitate: trecută. Migrarea/Postgres, suita completă și buildul de producție nu au fost rulate.

`git diff --check` raportează numai linia goală preexistentă la finalul `src/lib/ai/copilot-orchestrator.ts:917`; nu a fost curățată schimbarea anterioară.

## QA vizual și limite

O singură inițializare Browser a fost încercată; a eșuat la pornirea sandboxului Windows. Nu s-a reluat și nu se declară QA vizual reușit.

Rămâne verificarea manuală la 1920×1080 și 1440×900: secvența Vector, starea curentă versus Before, recomandarea de aprobare, concordanța Control Center/Recovery/Ask, alinierea butoanelor, iconurile și istoricul extins. Testele nu înlocuiesc acest control vizual.

Numele membrilor indisponibili în directorul autorizat sunt marcate ca indisponibile, fără inventarea identității. Etichetele „rezolvat” necesită metadate existente; vechile amânări fără termen în metadata nu sunt completate retroactiv. Prospețimea este la citire și după mutațiile utilizatorului, fără polling sau colaborare în timp real între sesiuni.

Nu s-au introdus execuție externă automată, G3D, infrastructură de fundal, workflowuri noi, noi conectoare, backfill, ROI sau conversie valutară. Fără commit, push sau deploy.
