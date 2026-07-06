# Security Review: M

## Scope

Read-only repository-wide scan of the checked-out Next.js/Supabase codebase.

- Scan mode: repository
- Target kind: git_worktree
- Target ID: target_sha256_2b120dc9729425c76f828d988bf6982c4c8fefc7484c370b512184ff538445a2
- Revision: e346108c27dffee5e6f3a6de89f6f9af09b3fb1d
- Snapshot digest: codex-security-snapshot/v1:sha256:256dd0624a9ef26a9700b68c352c99ae3d2077843a85422fb2038f30e9b66426
- Inventory strategy: repository
- Included paths: .
- Excluded paths: none
- Runtime or test status: No application server or live Supabase instance was started.
- Scan context: Generated threat model during phase 1; no application files were modified.

Limitations and exclusions:
- Live Supabase grants and RPC execution were not tested.
- Spreadsheet-client formula execution was not dynamically reproduced.
- Generated .next artifacts were treated as derived output.

### Scan Summary

| Field | Value |
| --- | --- |
| Reportable findings | 4 |
| Severity mix | high: 2, medium: 2 |
| Confidence mix | high: 3, medium: 1 |
| Coverage | complete |
| Validation mode | Static validation with worker-assisted file review. |

Canonical artifacts: `scan-manifest.json`, `findings.json`, and `coverage.json`. This report is a deterministic projection of those files.

## Threat Model

ReveNew is a Next.js/Supabase B2B opportunity-management app whose key boundaries are auth, tenant isolation, platform-admin privileges, service-role database access, usage metering, OpenAI calls, and admin exports.

### Assets

- Auth sessions and profiles
- Business-scoped opportunities and documents
- Platform roles and audit logs
- Service-role and OpenAI secrets
- Usage and provider-cost records

### Trust Boundaries

- Unauthenticated to authenticated routes
- Tenant to tenant
- Business user to platform admin
- Browser to server-only service role
- Tenant content to admin exports

### Attacker Capabilities

- Send authenticated requests
- Control business names, AI inputs, and request headers
- Call exposed Supabase tables/RPCs if grants allow

### Security Objectives

- Preserve tenant isolation
- Keep privileged database mutations server-only
- Meter provider-backed work accurately
- Prevent tenant content execution in admin contexts

### Assumptions

- Supabase RLS is a primary isolation layer
- Repository migrations represent intended production policy

## Findings

| Finding | Severity | Confidence |
| --- | --- | --- |
| [Usage metering security-definer RPCs are exposed without trusted caller checks](#finding-1) | high | high |
| [Business-members RLS allows authenticated users to self-join tenants](#finding-2) | high | high |
| [Reusable idempotency keys let repeated AI calls avoid additional usage settlement](#finding-3) | medium | high |
| [Admin usage CSV export does not neutralize spreadsheet formula cells](#finding-4) | medium | medium |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct evidence supports the finding with no material unresolved blocker. |
| medium | Evidence supports a plausible issue, but material runtime or reachability proof remains. |
| low | Evidence is incomplete and the item is retained only for explicit follow-up. |

<a id="finding-1"></a>

### [1] Usage metering security-definer RPCs are exposed without trusted caller checks

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | Validated by static source and migration trace; live runtime proof was not attempted. |
| Category | Authorization bypass / exposed privileged RPC |
| CWE | CWE-266, CWE-284 |
| Affected lines | supabase/migrations/202606240001_usage_metering.sql:86-99 |

#### Summary

The usage metering migration defines `security definer` RPCs that mutate usage counters/events with caller-supplied identifiers, but no migration revokes default function execute privileges or checks caller membership/service-role intent.

#### Validation

The usage metering migration defines `security definer` RPCs that mutate usage counters/events with caller-supplied identifiers, but no migration revokes default function execute privileges or checks caller membership/service-role intent.

Validation method: static source and migration trace

#### Dataflow

See affected locations for source, control, and sink.

#### Reachability

Reachability is based on repository source and migration evidence.

#### Severity

**High** — The usage metering migration defines `security definer` RPCs that mutate usage counters/events with caller-supplied identifiers, but no migration revokes default function execute privileges or checks caller membership/service-role intent.

Live deployment privilege checks could raise or lower this severity.

#### Remediation

Revoke execute from public/anon/authenticated on usage RPCs, grant only trusted server role, and add function privilege regression checks.

<a id="finding-2"></a>

### [2] Business-members RLS allows authenticated users to self-join tenants

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | Validated by static source and migration trace; live runtime proof was not attempted. |
| Category | Authorization bypass / tenant isolation |
| CWE | CWE-284, CWE-639 |
| Affected lines | supabase/migrations/202606100007_stabilize_supabase_rls.sql:170-175 |

#### Summary

The `business_members` insert/update RLS policy accepts `profile_id = current_profile_id()` for any target business, and downstream `can_access_business()` plus opportunity policies trust that membership row, creating a cross-tenant access path if authenticated table writes are exposed.

#### Validation

The `business_members` insert/update RLS policy accepts `profile_id = current_profile_id()` for any target business, and downstream `can_access_business()` plus opportunity policies trust that membership row, creating a cross-tenant access path if authenticated table writes are exposed.

Validation method: static source and migration trace

#### Dataflow

See affected locations for source, control, and sink.

#### Reachability

Reachability is based on repository source and migration evidence.

#### Severity

**High** — The `business_members` insert/update RLS policy accepts `profile_id = current_profile_id()` for any target business, and downstream `can_access_business()` plus opportunity policies trust that membership row, creating a cross-tenant access path if authenticated table writes are exposed.

Live deployment privilege checks could raise or lower this severity.

#### Remediation

Require owner/admin/invitation authorization for membership insert/update; add authenticated RLS regression tests that self-join attempts fail.

<a id="finding-3"></a>

### [3] Reusable idempotency keys let repeated AI calls avoid additional usage settlement

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Validated by static source and migration trace; live runtime proof was not attempted. |
| Category | Billing / quota bypass |
| CWE | CWE-770, CWE-840 |
| Affected lines | src/app/api/ai/analyze-opportunity/route.ts:58 |

#### Summary

AI routes accept caller-controlled idempotency keys, `reserve_revenew_usage` returns an existing event for repeated keys, and settlement returns early for already-settled events while fresh OpenAI calls still run.

#### Validation

AI routes accept caller-controlled idempotency keys, `reserve_revenew_usage` returns an existing event for repeated keys, and settlement returns early for already-settled events while fresh OpenAI calls still run.

Validation method: static source and migration trace

#### Dataflow

See affected locations for source, control, and sink.

#### Reachability

Reachability is based on repository source and migration evidence.

#### Severity

**Medium** — AI routes accept caller-controlled idempotency keys, `reserve_revenew_usage` returns an existing event for repeated keys, and settlement returns early for already-settled events while fresh OpenAI calls still run.

Live deployment privilege checks could raise or lower this severity.

#### Remediation

Bind idempotency keys to request digest and unsettled status, or return cached results instead of issuing fresh provider calls.

<a id="finding-4"></a>

### [4] Admin usage CSV export does not neutralize spreadsheet formula cells

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | medium |
| Confidence rationale | Validated by static source and migration trace; live runtime proof was not attempted. |
| Category | CSV formula injection |
| CWE | CWE-1236 |
| Affected lines | src/app/(protected)/admin/usage/export/route.ts:6-8 |

#### Summary

Tenant-controlled business names flow into the admin usage CSV export. The CSV helper quotes cells but does not neutralize leading spreadsheet formula characters, enabling formula execution when an admin opens the file in an evaluating spreadsheet client.

#### Validation

Tenant-controlled business names flow into the admin usage CSV export. The CSV helper quotes cells but does not neutralize leading spreadsheet formula characters, enabling formula execution when an admin opens the file in an evaluating spreadsheet client.

Validation method: static source and migration trace

#### Dataflow

See affected locations for source, control, and sink.

#### Reachability

Reachability is based on repository source and migration evidence.

#### Severity

**Medium** — Tenant-controlled business names flow into the admin usage CSV export. The CSV helper quotes cells but does not neutralize leading spreadsheet formula characters, enabling formula execution when an admin opens the file in an evaluating spreadsheet client.

Live deployment privilege checks could raise or lower this severity.

#### Remediation

Neutralize formula-like prefixes before CSV quoting for all user-controlled export fields, with tests for =, +, -, @, tab, CR, and LF.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Business membership RLS | Authorization | Reported | Promoted to CS-SQL-001. |
| Usage metering RPCs | Privileged RPC | Reported | Promoted to CS-SQL-002. |
| AI usage metering | Quota accounting | Reported | Promoted to CAND-AI-USAGE-001. |
| Admin CSV export | CSV export | Reported | Promoted to CAND-CSV-001. |
| Auth, redirects, platform roles | Authn/authz | No issue found | No reportable issue found. |
| Server actions and tenant helpers | BOLA | No issue found | Current business/profile are rederived server-side. |
| Generated Next.js build output | Generated artifacts | Not applicable | Derived from source, not authoritative. |

## Open Questions And Follow Up

- Confirm live Supabase table grants and function execute privileges for the SQL findings.
  - Follow-up prompt: Verify authenticated grants on public.business_members and EXECUTE grants on reserve_revenew_usage, settle_revenew_usage, and release_revenew_usage for revision e346108c.
