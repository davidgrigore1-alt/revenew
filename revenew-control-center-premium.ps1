param(
  [string]$Repo = "C:\Projects\ReveNew"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $Repo ".manual-ui-backups\control-center-premium-$Timestamp"

function Read-Utf8([string]$Path) {
  return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-Utf8NoBom([string]$Path, [string]$Text) {
  [System.IO.File]::WriteAllText($Path, $Text, $Utf8NoBom)
}

function Backup-File([string]$RelativePath) {
  $Source = Join-Path $Repo $RelativePath
  if (-not (Test-Path -LiteralPath $Source)) {
    throw "Lipsește fișierul: $Source"
  }
  $Destination = Join-Path $BackupRoot $RelativePath
  $DestinationDir = Split-Path -Parent $Destination
  New-Item -ItemType Directory -Force -Path $DestinationDir | Out-Null
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

function Replace-ExactOnce(
  [string]$RelativePath,
  [string]$Old,
  [string]$New,
  [string]$Label
) {
  $Path = Join-Path $Repo $RelativePath
  $Content = Read-Utf8 $Path
  $UsesCrLf = $Content.Contains("`r`n")
  $Normalized = $Content.Replace("`r`n", "`n")
  $OldN = $Old.Replace("`r`n", "`n")
  $NewN = $New.Replace("`r`n", "`n")

  $First = $Normalized.IndexOf($OldN, [System.StringComparison]::Ordinal)
  if ($First -lt 0) {
    throw "Nu am găsit blocul pentru: $Label`nFișier: $RelativePath`nNicio modificare ulterioară nu este sigură. Backup-ul rămâne în $BackupRoot"
  }

  $Second = $Normalized.IndexOf($OldN, $First + $OldN.Length, [System.StringComparison]::Ordinal)
  if ($Second -ge 0) {
    throw "Blocul pentru '$Label' apare de mai multe ori. Oprire pentru siguranță."
  }

  $Updated = $Normalized.Substring(0, $First) + $NewN + $Normalized.Substring($First + $OldN.Length)
  if ($UsesCrLf) {
    $Updated = $Updated.Replace("`n", "`r`n")
  }
  Write-Utf8NoBom $Path $Updated
  Write-Host "OK  $Label" -ForegroundColor Green
}

$Execution = "src\components\dashboard\ExecutionControlCenter.tsx"
$Page = "src\app\(protected)\dashboard\page.tsx"
$Css = "src\app\globals.css"

New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
Backup-File $Execution
Backup-File $Page
Backup-File $Css

Write-Host "Backup creat: $BackupRoot" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# 1) EXECUTION CONTROL CENTER — executive scanability, bigger workbench,
#    concise hierarchy. No business semantics are changed.
# -----------------------------------------------------------------------------

Replace-ExactOnce $Execution @'
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[rgb(var(--primary)/0.26)] bg-[rgb(var(--primary)/0.07)] px-2.5 py-1 text-xs font-semibold tabular-nums">
            {formatProductCurrency(item.value, item.currency)}
          </span>

          <span className="text-xs text-[rgb(var(--text-muted))]">
            estimat
          </span>

          <span
            aria-hidden="true"
            className="h-1 w-1 rounded-full bg-[rgb(var(--border-strong))]"
          />

          <span className="text-xs text-[rgb(var(--text-secondary))]">
            {presentOpportunityState(item.status).label}
          </span>
        </div>
'@ @'
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[rgb(var(--primary)/0.26)] bg-[rgb(var(--primary)/0.07)] px-2.5 py-1 text-xs font-semibold tabular-nums">
            {formatProductCurrency(item.value, item.currency)}
          </span>

          <span className="text-xs text-[rgb(var(--text-muted))]">
            estimat
          </span>

          <span
            aria-hidden="true"
            className="h-1 w-1 rounded-full bg-[rgb(var(--border-strong))]"
          />

          <span className="text-xs text-[rgb(var(--text-secondary))]">
            {presentOpportunityState(item.status).label}
          </span>
        </div>

        <dl className="control-center-case-facts mt-4 grid grid-cols-2 overflow-hidden rounded-[0.72rem] border border-[rgb(var(--border-subtle))] sm:grid-cols-4">
          <div className="min-w-0 border-b border-r border-[rgb(var(--border-subtle))] px-3 py-2.5 sm:border-b-0">
            <dt className="text-micro font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
              Stare
            </dt>
            <dd
              className={cn(
                "mt-1 truncate text-xs font-semibold",
                item.overdue
                  ? "text-[rgb(var(--warning-text))]"
                  : "text-[rgb(var(--foreground))]",
              )}
            >
              {item.overdue ? "Termen depășit" : "În termen"}
            </dd>
          </div>

          <div className="min-w-0 border-b border-[rgb(var(--border-subtle))] px-3 py-2.5 sm:border-b-0 sm:border-r">
            <dt className="text-micro font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
              Responsabil
            </dt>
            <dd className="mt-1 truncate text-xs font-semibold">
              {item.owner.name}
            </dd>
          </div>

          <div className="min-w-0 border-r border-[rgb(var(--border-subtle))] px-3 py-2.5">
            <dt className="text-micro font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
              Scadență
            </dt>
            <dd className="mt-1 truncate text-xs font-semibold tabular-nums">
              {item.deadline ? formatProductDate(item.deadline) : "Neconfirmată"}
            </dd>
          </div>

          <div className="min-w-0 px-3 py-2.5">
            <dt className="text-micro font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
              Dovezi
            </dt>
            <dd className="mt-1 text-xs font-semibold tabular-nums">
              {item.evidence.length}
            </dd>
          </div>
        </dl>
'@ "Selected case: executive facts strip"

Replace-ExactOnce $Execution '          {item.reasons.slice(0, 4).map((reason) => (' '          {item.reasons.slice(0, 3).map((reason) => (' "Selected case: concise why-now reasons"

Replace-ExactOnce $Execution @'
      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-b border-[rgb(var(--border))] py-5">
        <div className="min-w-0">
          <dt className={muted}>
            Responsabil comercial
          </dt>

          <dd className="mt-1 break-words text-xs font-medium">
            {item.owner.name}
          </dd>
        </div>

        <div className="min-w-0">
          <dt className={muted}>
            Termen comercial
          </dt>

          <dd className="mt-1 text-xs">
            {item.deadline
              ? formatProductDate(item.deadline)
              : "Neconfirmat"}
          </dd>
        </div>

        <div className="min-w-0">
          <dt className={muted}>
            Ultima activitate
          </dt>

          <dd className="mt-1 text-xs">
            {item.lastActivityAt
              ? formatProductDate(item.lastActivityAt)
              : "Neconfirmată"}
          </dd>
        </div>

        {item.nextMeetingAt ? (
          <div className="min-w-0">
            <dt className={muted}>
              Următoarea întâlnire
            </dt>

            <dd className="mt-1 text-xs">
              {formatProductDateTime(item.nextMeetingAt)}
            </dd>
          </div>
        ) : null}
      </dl>
'@ @'
      <dl className="control-center-secondary-facts grid grid-cols-1 gap-3 border-b border-[rgb(var(--border))] py-5 sm:grid-cols-2">
        <div className="min-w-0 rounded-[0.65rem] border border-[rgb(var(--border-subtle))] bg-[rgb(var(--surface-subtle)/0.58)] px-3 py-2.5">
          <dt className={muted}>
            Ultima activitate
          </dt>

          <dd className="mt-1 text-xs font-medium">
            {item.lastActivityAt
              ? formatProductDate(item.lastActivityAt)
              : "Neconfirmată"}
          </dd>
        </div>

        <div className="min-w-0 rounded-[0.65rem] border border-[rgb(var(--border-subtle))] bg-[rgb(var(--surface-subtle)/0.58)] px-3 py-2.5">
          <dt className={muted}>
            Următoarea întâlnire
          </dt>

          <dd className="mt-1 text-xs font-medium">
            {item.nextMeetingAt
              ? formatProductDateTime(item.nextMeetingAt)
              : "Neconfirmată"}
          </dd>
        </div>
      </dl>
'@ "Selected case: remove duplicate facts"

Replace-ExactOnce $Execution @'
                          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-metadata text-[rgb(var(--text-muted))]">
                            <span>{item.owner.name}</span>

                            {item.overdue ? (
                              <span className="font-medium text-[rgb(var(--warning-text))]">
                                {item.overdueDays
                                  ? `Restant · ${item.overdueDays}${
                                      item.overdueDays === 1
                                        ? " zi"
                                        : " zile"
                                    }`
                                  : "Termen depășit"}
                              </span>
                            ) : null}

                            <CaseReadiness
                              owner={Boolean(item.owner.id)}
                              action={Boolean(item.nextAction)}
                              dated={Boolean(
                                item.nextAction?.dueAt,
                              )}
                              overdue={item.overdue}
                              evidence={item.evidence.length}
                            />
                          </span>
'@ @'
                          <span className="mt-2 flex flex-wrap items-center gap-1.5 text-metadata text-[rgb(var(--text-muted))]">
                            <span
                              className={cn(
                                "control-center-meta-chip",
                                !item.owner.id && "control-center-meta-chip-muted",
                              )}
                            >
                              {item.owner.name}
                            </span>

                            {item.overdue ? (
                              <span className="control-center-meta-chip control-center-meta-chip-warning">
                                {item.overdueDays
                                  ? `Restant · ${item.overdueDays}${
                                      item.overdueDays === 1
                                        ? " zi"
                                        : " zile"
                                    }`
                                  : "Termen depășit"}
                              </span>
                            ) : null}

                            <span className="control-center-evidence-chip">
                              {item.evidence.length}{" "}
                              {item.evidence.length === 1 ? "dovadă" : "dovezi"}
                            </span>

                            <CaseReadiness
                              owner={Boolean(item.owner.id)}
                              action={Boolean(item.nextAction)}
                              dated={Boolean(
                                item.nextAction?.dueAt,
                              )}
                              overdue={item.overdue}
                              evidence={item.evidence.length}
                            />
                          </span>
'@ "Queue rows: scan-friendly metadata chips"

Replace-ExactOnce $Execution 'className="control-center-case-list min-w-0 lg:max-h-[min(660px,64vh)] lg:overflow-y-auto lg:overscroll-contain"' 'className="control-center-case-list min-w-0 lg:max-h-[min(760px,72vh)] lg:overflow-y-auto lg:overscroll-contain"' "Queue: increase useful viewport height"
Replace-ExactOnce $Execution 'className="control-center-case-inspector min-w-0 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))] lg:max-h-[min(660px,64vh)] lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-t-0"' 'className="control-center-case-inspector min-w-0 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))] lg:max-h-[min(760px,72vh)] lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-t-0"' "Inspector: increase useful viewport height"

# -----------------------------------------------------------------------------
# 2) DASHBOARD PAGE — standardized disclosures, connected context, useful lower
#    panels. The source data and business logic remain unchanged.
# -----------------------------------------------------------------------------

Replace-ExactOnce $Page @'
      <div className="app-page mx-auto w-full max-w-[var(--workspace-axis)] px-[var(--page-gutter)] pb-24 lg:pb-12">
'@ @'
      <div className="control-center-canvas app-page mx-auto w-full max-w-[var(--workspace-axis)] px-[var(--page-gutter)] pb-24 lg:pb-12">
'@ "Dashboard: activate scoped Control Center canvas"

Replace-ExactOnce $Page @'
        {interventionBrief ? (
          <details className="mt-5 border-b border-[rgb(var(--border))] pb-4">
            <summary className="focus-ring cursor-pointer text-sm font-semibold">
              Pregătire și aprobare intervenții
            </summary>

            <div className="pt-4">
              <CommercialInterventions
                brief={interventionBrief}
              />
            </div>
          </details>
        ) : null}
'@ @'
        {interventionBrief ? (
          <details className="control-center-disclosure group mt-5">
            <summary className="control-center-disclosure-summary focus-ring">
              <span className="min-w-0">
                <span className="block text-sm font-semibold tracking-[-0.01em]">
                  Pregătire și aprobare intervenții
                </span>
                <span className="mt-0.5 block text-xs text-[rgb(var(--text-muted))]">
                  Revizuiește lucrul pregătit înainte de orice aplicare internă.
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-2.5">
                <span className="hidden text-xs font-medium text-[rgb(var(--text-muted))] sm:inline group-open:hidden">
                  Deschide
                </span>
                <span className="hidden text-xs font-medium text-[rgb(var(--text-muted))] sm:group-open:inline">
                  Închide
                </span>
                <span className="control-center-disclosure-chevron" aria-hidden="true" />
              </span>
            </summary>

            <div className="control-center-disclosure-content">
              <CommercialInterventions brief={interventionBrief} />
            </div>
          </details>
        ) : null}
'@ "Disclosure: intervention preparation"

Replace-ExactOnce $Page @'
        {interventionBrief ? (
          <details className="group mt-6 border-y border-[rgb(var(--border))] py-4">
            <summary className="focus-ring flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 marker:hidden">
              <span>
                <span className="block text-sm font-semibold">
                  Continuă analiza cu ReveNew
                </span>

                <span className="mt-1 block text-xs text-[rgb(var(--text-muted))]">
                  Întreabă ce s-a schimbat, de ce contează
                  sau pregătește următorul pas.
                </span>
              </span>

              <span className="rounded-control border border-[rgb(var(--primary-border))] px-3 py-2 text-xs font-semibold text-[rgb(var(--primary))] group-open:hidden">
                Întreabă ReveNew →
              </span>

              <span className="hidden text-xs text-[rgb(var(--text-muted))] group-open:block">
                Închide analiza
              </span>
            </summary>

            <HomeAskSurface
              greeting={morningBrief.salutation}
            />
          </details>
        ) : (
          <HomeAskSurface
            greeting={morningBrief.salutation}
          />
        )}
'@ @'
        {interventionBrief ? (
          <details className="control-center-disclosure group mt-3">
            <summary className="control-center-disclosure-summary focus-ring">
              <span className="min-w-0">
                <span className="block text-sm font-semibold tracking-[-0.01em]">
                  Continuă analiza cu ReveNew
                </span>

                <span className="mt-0.5 block text-xs text-[rgb(var(--text-muted))]">
                  Verifică schimbările, blocajele și următorul pas sigur pe baza contextului autorizat.
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-2.5">
                <span className="hidden text-xs font-semibold text-[rgb(var(--primary))] sm:inline group-open:hidden">
                  Deschide analiza
                </span>
                <span className="hidden text-xs font-semibold text-[rgb(var(--primary))] sm:group-open:inline">
                  Închide analiza
                </span>
                <span className="control-center-disclosure-chevron" aria-hidden="true" />
              </span>
            </summary>

            <div className="control-center-disclosure-content control-center-ask-surface">
              <HomeAskSurface greeting={morningBrief.salutation} />
            </div>
          </details>
        ) : (
          <div className="control-center-ask-surface mt-3">
            <HomeAskSurface greeting={morningBrief.salutation} />
          </div>
        )}
'@ "Disclosure: commercial analyst"

Replace-ExactOnce $Page @'
        <div className="mt-8 grid gap-8 border-t border-[rgb(var(--border-subtle))] pt-5">
          <details>
            <summary className="focus-ring cursor-pointer text-sm font-semibold text-[rgb(var(--text-muted))]">
              Alte semnale și decizii comerciale
            </summary>

            <div className="mt-4">
              <WorkspaceDecisionQueue
                queue={visibleDecisionQueue}
              />
            </div>
          </details>
'@ @'
        <div className="mt-3 grid gap-3">
          <details className="control-center-disclosure group">
            <summary className="control-center-disclosure-summary focus-ring">
              <span className="min-w-0">
                <span className="block text-sm font-semibold tracking-[-0.01em]">
                  Alte semnale și decizii comerciale
                </span>
                <span className="mt-0.5 block text-xs text-[rgb(var(--text-muted))]">
                  Situații secundare care merită inspectate după prioritățile de mai sus.
                </span>
              </span>

              <span className="flex shrink-0 items-center gap-2.5">
                <span className="hidden text-xs font-medium text-[rgb(var(--text-muted))] sm:inline group-open:hidden">
                  Vezi semnalele
                </span>
                <span className="hidden text-xs font-medium text-[rgb(var(--text-muted))] sm:group-open:inline">
                  Ascunde
                </span>
                <span className="control-center-disclosure-chevron" aria-hidden="true" />
              </span>
            </summary>

            <div className="control-center-disclosure-content">
              <WorkspaceDecisionQueue queue={visibleDecisionQueue} />
            </div>
          </details>
'@ "Disclosure: secondary commercial signals"

Replace-ExactOnce $Page @'
          <div className="border-y border-[rgb(var(--border))]">
  <section
    aria-labelledby="implementation-status-title"
    className="w-full py-5"
  >
'@ @'
          <section
            aria-labelledby="implementation-status-title"
            className="control-center-sources-band w-full py-5"
          >
'@ "Connected context: premium container"

Replace-ExactOnce $Page '    <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">' '    <ul className="control-center-source-grid mt-4 grid gap-2.5 sm:grid-cols-3">' "Connected context: full-width source grid"

Replace-ExactOnce $Page @'
            "group relative overflow-hidden rounded-xl border p-3.5 transition-colors",
'@ @'
            "control-center-source-card group relative overflow-hidden rounded-xl border p-3.5 transition-colors",
'@ "Connected context: source cards"

Replace-ExactOnce $Page @'
  </section>
</div>
        </div>
'@ @'
          </section>
        </div>
'@ "Connected context: close premium container"

Replace-ExactOnce $Page @'
        <div className="mt-8 grid w-full gap-8 border-t border-[rgb(var(--border-subtle))] pt-5 md:grid-cols-2">
          <section aria-labelledby="home-today-title">
'@ @'
        <div className="control-center-lower-grid mt-5 grid w-full gap-3 md:grid-cols-2">
          <section className="control-center-lower-panel" aria-labelledby="home-today-title">
'@ "Lower dashboard: today panel"

Replace-ExactOnce $Page '          <section aria-labelledby="home-recent-title">' '          <section className="control-center-lower-panel" aria-labelledby="home-recent-title">' "Lower dashboard: recent activity panel"

Replace-ExactOnce $Page @'
            ) : (
              <p className="mt-3 border-t border-[rgb(var(--border))] py-4 text-sm text-[rgb(var(--text-muted))]">
                Nicio schimbare comercială semnificativă în
                ultimele 24 de ore.
              </p>
            )}
'@ @'
            ) : (
              <div className="mt-3 border-t border-[rgb(var(--border))] py-4">
                <p className="text-sm font-medium text-[rgb(var(--foreground))]">
                  Nicio schimbare comercială semnificativă în ultimele 24 de ore.
                </p>
                <p className="mt-1.5 max-w-xl text-xs leading-5 text-[rgb(var(--text-muted))]">
                  ReveNew continuă să păstreze vizibil contextul disponibil din sursele autorizate.
                </p>
                <Link
                  href="/opportunities"
                  className="focus-ring mt-3 inline-flex rounded text-xs font-medium text-[rgb(var(--interaction))] hover:underline"
                >
                  Vezi oportunitățile monitorizate →
                </Link>
              </div>
            )}
'@ "Recent activity: useful empty state"

# -----------------------------------------------------------------------------
# 3) CSS — optical centering, light-only premium depth, scanability.
#    Dark palette is intentionally not redefined here.
# -----------------------------------------------------------------------------

Replace-ExactOnce $Css @'
.control-center-disclosure-chevron::before {
  content: "";
  display: block;
  width: .4rem;
  height: .4rem;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);
  transform-origin: 50% 50%;
  transition: transform var(--motion-content) var(--ease-standard);
}
'@ @'
.control-center-disclosure-chevron::before {
  content: "";
  display: block;
  width: .4rem;
  height: .4rem;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: translateY(-.095rem) rotate(45deg);
  transform-origin: 50% 50%;
  transition: transform var(--motion-content) var(--ease-standard);
}
'@ "Chevron: optical vertical centering"

Replace-ExactOnce $Css @'
.control-center-disclosure[open]
  > .control-center-disclosure-summary
  .control-center-disclosure-chevron::before {
  transform: rotate(225deg);
}
'@ @'
.control-center-disclosure[open]
  > .control-center-disclosure-summary
  .control-center-disclosure-chevron::before {
  transform: translateY(.095rem) rotate(225deg);
}
'@ "Chevron: centered open state"

Replace-ExactOnce $Css @'
.control-center-ask-surface { padding: .125rem; }
.control-center-ask-surface .product-work-surface { box-shadow: none; }
'@ @'
.control-center-ask-surface {
  width: min(100%, 74rem);
  margin-inline: auto;
  padding: .25rem 0 .125rem;
}

.control-center-ask-surface .product-work-surface {
  box-shadow: none;
}

:root:not(.dark) .control-center-ask-surface .product-work-surface {
  border-color: rgb(219 223 229);
  background: rgb(255 255 255);
}
'@ "Commercial analyst: focused working width"

Replace-ExactOnce $Css @'
.control-center-source-grid {
  max-width: 68rem;
}
'@ @'
.control-center-source-grid {
  width: 100%;
  max-width: none;
}
'@ "Connected context: use full width"

Replace-ExactOnce $Css @'
.control-center-source-card {
  min-height: 7.5rem;
  background: rgb(var(--surface-raised));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / .35);
}
'@ @'
.control-center-source-card {
  min-height: 7.35rem;
  background: rgb(var(--surface-raised));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / .35);
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard),
    transform var(--motion-fast) var(--ease-standard);
}

:root:not(.dark) .control-center-source-card {
  border-color: rgb(204 225 216);
  background: rgb(255 255 255);
  box-shadow: 0 1px 2px rgb(20 25 34 / .02);
}

:root:not(.dark) .control-center-source-card:hover {
  border-color: rgb(163 207 188);
  transform: translateY(-1px);
}
'@ "Connected context: premium source cards"

$PremiumCss = @'

/* === Control Center premium manual pass =====================================
   Light mode gains clearer depth and executive scanability.
   Dark mode keeps its established palette; only shared geometry/spacing applies.
============================================================================ */

.control-center-case-facts {
  background: rgb(var(--surface-subtle) / .62);
}

.control-center-secondary-facts {
  color: rgb(var(--text-secondary));
}

.control-center-meta-chip,
.control-center-evidence-chip {
  display: inline-flex;
  min-height: 1.45rem;
  align-items: center;
  border-radius: .42rem;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.control-center-meta-chip {
  font-weight: 600;
}

.control-center-evidence-chip {
  color: rgb(var(--text-muted));
}

:root:not(.dark) .control-center-case-facts {
  border-color: rgb(224 227 231);
  background: rgb(248 249 250);
}

:root:not(.dark) .control-center-meta-chip,
:root:not(.dark) .control-center-evidence-chip {
  border: 1px solid rgb(225 228 232);
  background: rgb(250 250 251);
  padding-inline: .42rem;
}

:root:not(.dark) .control-center-meta-chip {
  color: rgb(67 75 87);
}

:root:not(.dark) .control-center-meta-chip-muted {
  border-style: dashed;
  color: rgb(104 112 124);
}

:root:not(.dark) .control-center-meta-chip-warning {
  border-color: rgb(224 190 119 / .72);
  background: rgb(255 249 234);
  color: rgb(145 88 5);
}

:root:not(.dark) .control-center-evidence-chip {
  color: rgb(89 99 113);
}

:root:not(.dark) .control-center-truth-strip .control-center-metric:first-child {
  min-width: 11.25rem;
  border-color: rgb(var(--interaction-border) / .7);
  background: rgb(255 255 255);
}

:root:not(.dark) .control-center-truth-strip .control-center-metric:nth-child(2) {
  border-color: rgb(224 190 119 / .66);
  background: rgb(255 251 243);
}

:root:not(.dark) .control-center-truth-strip .control-center-metric:nth-child(n + 3) {
  background: rgb(255 255 255);
}

:root:not(.dark) .control-center-workbench {
  border-color: rgb(199 204 212);
  box-shadow: 0 8px 24px rgb(20 25 34 / .035), 0 1px 2px rgb(20 25 34 / .03);
}

:root:not(.dark) .control-center-case-selected {
  background: rgb(237 244 252);
  box-shadow:
    inset 3px 0 0 rgb(var(--interaction)),
    inset 0 0 0 1px rgb(var(--interaction-border) / .22);
}

:root:not(.dark) .control-center-next-action {
  border-color: rgb(217 183 94 / .72);
  background: linear-gradient(180deg, rgb(255 251 239), rgb(255 248 229));
  box-shadow:
    inset 3px 0 0 rgb(var(--gold-500) / .9),
    0 4px 14px rgb(108 79 19 / .035);
}

:root:not(.dark) .control-center-sources-band {
  border-color: rgb(222 225 229);
  background: rgb(247 248 249);
  box-shadow: 0 1px 2px rgb(20 25 34 / .018);
}

.control-center-lower-grid {
  align-items: stretch;
}

.control-center-lower-panel {
  min-height: 12.25rem;
}

:root:not(.dark) .control-center-lower-panel {
  border-color: rgb(222 225 229);
  background: rgb(255 255 255);
  box-shadow: 0 1px 2px rgb(20 25 34 / .018);
}

@media (min-width: 1024px) {
  .control-center-case-detail {
    padding-bottom: 1.5rem;
  }
}

@media (max-width: 639px) {
  .control-center-case-facts {
    border-radius: .65rem;
  }

  .control-center-meta-chip,
  .control-center-evidence-chip {
    min-height: 1.35rem;
    font-size: .6875rem;
  }
}
'@

$CssPath = Join-Path $Repo $Css
$CssContent = Read-Utf8 $CssPath
if ($CssContent.Contains("/* === Control Center premium manual pass")) {
  throw "Blocul premium manual există deja în globals.css. Oprire pentru a evita dublarea CSS."
}
$Eol = if ($CssContent.Contains("`r`n")) { "`r`n" } else { "`n" }
Write-Utf8NoBom $CssPath ($CssContent.TrimEnd() + $Eol + $PremiumCss.Replace("`r`n", "`n").Replace("`n", $Eol) + $Eol)
Write-Host "OK  Premium scoped CSS" -ForegroundColor Green

Write-Host "" 
Write-Host "Modificările au fost aplicate. Rulez verificările rapide..." -ForegroundColor Cyan
Push-Location $Repo
try {
  & npm.cmd run typecheck
  if ($LASTEXITCODE -ne 0) { throw "typecheck a eșuat" }

  & npm.cmd run lint
  if ($LASTEXITCODE -ne 0) { throw "lint a eșuat" }

  & git diff --check
  if ($LASTEXITCODE -ne 0) { throw "git diff --check a eșuat" }
}
finally {
  Pop-Location
}

Write-Host "" 
Write-Host "DONE — Control Center premium pass instalat." -ForegroundColor Green
Write-Host "Backup: $BackupRoot" -ForegroundColor DarkGray
Write-Host "Reîncarcă pagina cu Ctrl+Shift+R și verifică light + dark mode." -ForegroundColor Yellow
