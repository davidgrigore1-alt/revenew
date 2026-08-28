# Ask ReveNew Safe Action Planner (PASS G1)

Ask ReveNew folosește aceeași arhitectură de context și dovezi, dar poate persista o propunere limitată în `ask_action_plans`. Planul este creat exclusiv pe server, pentru utilizatorul și business-ul curent, și nu acordă browserului acces de scriere directă.

## Flux

1. Intenția este clasificată într-una dintre familiile permise: task, următoarea acțiune, responsabil, notă, draft email sau câmp allowlist al oportunității.
2. Ținta este moștenită numai din contextul exact și autorizat. O țintă lipsă sau ambiguă nu este ghicită.
3. ReveNew stochează propunerea, dovezile compacte, riscul și versiunea țintei.
4. Utilizatorul editează doar câmpurile contractului și aprobă explicit.
5. Serverul revalidează tenantul, permisiunea, ținta, versiunea și responsabilul.
6. O schimbare de stare `prepared → executing` revendică atomic planul. Replay-ul întoarce rezultatul existent sau este blocat.
7. Rezultatul și metadatele sigure sunt scrise în audit. Corpurile de email și notele nu sunt copiate în audit.

## Familii și efecte

- `create_task`: creează un `opportunity_actions` intern.
- `update_next_action`: actualizează acțiunea pending exactă; dacă nu exista la pregătire, creează una nouă după aprobare.
- `assign_owner`: acceptă doar un profil activ din business și cere `opportunities.assign`.
- `add_note`: reutilizează `workspace_notes`.
- `prepare_email`: reutilizează `communication_drafts`, legat de ultima conversație Gmail privată a autorului. Salvează draftul; nu trimite.
- `update_opportunity_field`: permite numai `status`, `recommended_action` și `deadline`, cu valori de status validate.

## Limite intenționate

Nu există SQL generat, mutații arbitrare, execuție autonomă, Gmail send, Calendar write, scope OAuth nou sau acțiuni cross-tenant. Planurile multiple sunt pregătite și aprobate individual în acest pass.
