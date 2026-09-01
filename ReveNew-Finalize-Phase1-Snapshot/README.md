# ReveNew Finalize - Phase 1 Snapshot

Read-only discovery package for the current ReveNew source.

It finds and captures the exact code behind:
- Brief executiv
- Revizuire comerciala
- Activitatea mea
- the current Control Center visual system
- related tests

It does not modify project source and excludes secret-like files.

Run:

```bat
cd /d C:\Projects\ReveNew
powershell -NoProfile -ExecutionPolicy Bypass -File ".\ReveNew-Finalize-Phase1-Snapshot\tools\snapshot-phase1.ps1"
```

Then upload the generated ZIP from `.finalize-snapshots`.
