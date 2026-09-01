# ReveNew PatchKit v1.1

Versiune corectată pentru Windows PowerShell 5.1.

## Snapshot Control Center

Din CMD, din repo:

```bat
cd /d C:\Projects\ReveNew
powershell -NoProfile -ExecutionPolicy Bypass -File ".\ReveNew-PatchKit-v1.1\tools\snapshot-control-center.ps1"
```

Scriptul:
- NU copiază `.env*`;
- NU resetează Supabase;
- NU modifică repo-ul;
- copiază doar fișierele relevante pentru Control Center;
- include focused git diff și git status;
- creează un ZIP uploadabil în `snapshots\`.

## Verificare

```bat
powershell -NoProfile -ExecutionPolicy Bypass -File ".\ReveNew-PatchKit-v1.1\tools\verify-current.ps1"
```

Cu build:

```bat
powershell -NoProfile -ExecutionPolicy Bypass -File ".\ReveNew-PatchKit-v1.1\tools\verify-current.ps1" -Build
```

## Siguranță

- fără `git add`
- fără `git commit`
- fără `git push`
- fără `git clean`
- fără `npm audit fix`
- fără resetări Supabase
- fără `.env` sau secrete în snapshot
