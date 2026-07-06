# ReveNew Usage and Cost Architecture

Usage metering tracks provider-backed operations without storing prompts, API keys, tokens or raw provider responses.

## Metering Flow

1. Server route authenticates and resolves current business.
2. Server authorization verifies the required permission.
3. Usage reservation uses a stable idempotency key.
4. Provider call runs server-side.
5. Provider usage is measured from the provider response.
6. Central cost calculator estimates cost.
7. Usage is settled or released.
8. Admin reads sanitized aggregates.

Browser clients do not submit provider cost, model pricing, token counts, business ownership or usage status.

## Event Model

Current migration `202606240001_usage_metering.sql` creates `usage_events` with:

- `business_id`
- `profile_id`
- `feature_id`
- `plan_id`
- `idempotency_key`
- `status`
- `units`
- `provider`
- `model`
- `prompt_tokens`
- `completion_tokens`
- `total_tokens`
- `estimated_cost_micros`
- `error_reason`
- `period_start`
- `period_end`
- timestamps

The schema supports provider cost visibility but does not yet include latency, cached input tokens, pricing version or metadata.

## Counters and Overrides

`usage_counters` stores period aggregates per business and feature. `usage_overrides` stores internal override records. Normal client users should not mutate internal provider cost or override data.

## Feature Registry

Feature keys are centralized in `src/lib/usage/feature-registry.ts` and `src/lib/usage/usage-types.ts`. Stable keys include `opportunity_analysis`, `document_outreach_email`, `document_offer_draft`, `document_call_script` and related document-generation features.

## Plan Registry

Plan limits and internal provider-cost budgets live in `src/lib/usage/plan-catalog.ts`. Known plan ids include `audit`, `managed`, `growth` and `custom`.

## Provider Pricing

Provider pricing is server-side in `src/lib/usage/pricing-registry.ts`. Pricing includes provider, model, version and micros-per-token rates. Update pricing through code review when provider prices change.

## Cost Calculation

Cost calculation is centralized in `src/lib/usage/cost-calculator.ts`.

Current formula for OpenAI:

`prompt_tokens × inputMicrosPerToken + completion_tokens × outputMicrosPerToken`

The result is rounded and stored as micros to avoid persisted floating-point totals.

## Idempotency and Quota

`reserveUsage()` uses an idempotency key and database uniqueness on `(business_id, feature_id, idempotency_key)` to prevent double metering. Quota enforcement depends on `REVENEW_USAGE_MODE` and the usage tables/functions being applied.

## Privacy

Usage events store operational metadata only. Do not store prompts, customer-message bodies, secrets, API keys, access tokens or raw provider responses.

## RLS and Admin Aggregation

Usage table creation remains in `202606240001_usage_metering.sql`. Platform-admin usage policies are separated into `202606240003_usage_metering_platform_role_policies.sql`, which depends on both usage tables and platform-role functions.

Admin aggregation uses server-only loaders and handles missing usage infrastructure as unavailable.

## Retention

No automatic retention policy is currently implemented. Add retention through a reviewed additive migration once reporting requirements are stable.
