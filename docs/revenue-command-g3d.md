# ReveNew — Brief executiv (G3D)

Vederea `/dashboard?view=executive` păstrează Acum și adaugă o orientare compactă, maximum opt decizii curente, schimbări materiale, progres și impact G3C. Vederea G3E folosește aceeași proiecție.

## Contracte

- Stare curentă: `buildOpportunityCommercialState`; istoricul nu înlocuiește owner/acțiune/aprobare curentă.
- Istoric material: evenimente comerciale explicit recunoscute, decizii de aprobare, lucru pregătit și evenimente G3C; fără emailuri sau CRUD generic.
- Perioada Astăzi/7/30 afectează schimbările și impactul, nu eligibilitatea blocajelor curente.
- Prioritatea este deterministă; valoarea departajează numai în aceeași monedă.
- Impactul este agregat exclusiv prin G3C; activitatea nu este venit.
- Checkpoint personal append-only, actor/business/scope server-side, tichet semnat, cutoff al încărcării și request ID pentru retry.
- Nicio acțiune comercială sau externă la marcarea brief-ului ca revizuit.
- RLS, scope owned, permisiuni distincte și batch-uri limitate; fără text de documente, LLM sau Google la încărcare.
- Surse incomplete și limitele portofoliului sunt explicite; checkpoint-ul nu este disponibil fără sursele necesare și schema configurată.

## Starea livrării

G3D fusese întrerupt înainte de integrarea Ask și validarea completă. G3E a completat integrarea Ask necesară și a corectat tipurile evenimentelor de aprobare, deduplicarea, departajarea termenelor, scope-ul impactului și proiecția rezultatului încă neverificat.

Migrația G3D `20260828131036_executive_review_checkpoints.sql` exista deja la începutul G3E. Nu a fost aplicată sau modificată în G3E. Nu se pretinde validare PostgreSQL a checkpoint-ului. Review-ul SQL, RLS, concurența/idempotency și aplicarea rămân manuale, conform cerințelor G3E.

Validarea comună finală: 112 teste, 111 reușite, unul PostgreSQL G3C omis; typecheck, lint și security trecute. Fără Browser QA, build, demo, commit, push sau deploy.

Arhitectura, limitele exacte, accesibilitatea, inventarul fișierelor și checklist-ul manual sunt documentate în [G3E](commercial-decision-room-g3e.md). Nu există o evaluare documentară nouă la page load; contradicțiile se investighează explicit prin G3B.
