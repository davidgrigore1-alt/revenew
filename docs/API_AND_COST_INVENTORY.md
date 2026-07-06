# ReveNew API and Cost Inventory

This document contains provider names and environment variable names only. It must never contain secret values.

## Active Integrations

### Supabase
- Mechanism: `@supabase/ssr`, `@supabase/supabase-js`
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Public variables: URL and anon key only
- Server-only variables: service-role key
- Call sites: auth/profile helpers, business resolution, data loaders, server actions, usage admin helpers
- Status: live infrastructure
- Billing unit: Supabase project usage, not per-ReveNew AI action
- Security notes: service-role usage is isolated in server-only modules

### OpenAI
- Mechanism: `openai` SDK
- Environment variables: `OPENAI_API_KEY`, `OPENAI_MODEL`
- Server-only variables: both
- Call sites: `/api/ai/analyze-opportunity`, `/api/ai/generate-document`
- Client-facing features: advanced opportunity analysis, generated commercial drafts
- Billing unit: provider tokens
- Fallback: local generation when OpenAI is not configured
- Timeout: 20 seconds via abort signal
- Retry: no automatic retry
- Auth: required through workspace access
- Business authorization: current business resolved server-side
- Quota: reservation and settlement through usage layer when migration exists
- Current status: live if key is configured

## Configured but Unused

### Resend
- Environment variable: `RESEND_API_KEY`
- Status: declared placeholder, no confirmed live sending flow
- Future metric: `emails_sent`

## Planned / Not Implemented

Gmail sync, web research, OCR pages, WhatsApp delivery, voice minutes, CRM synchronization, payment provider checkout and webhooks.

## Implemented Changes

- AI routes no longer trust client-supplied business/opportunity objects.
- Provider calls require authenticated workspace access.
- Document generation loads opportunity by ID for the current business.
- Input shape, content type and sizes are validated.
- OpenAI calls use timeouts and bounded output tokens.
- Usage feature IDs, plan limits, pricing and cost calculation are centralized.
- Additive usage migration defines ledger, counters, overrides and reservation RPCs.
- Errors returned to the client are Romanian and provider-safe.

## Remaining Production Requirements

- Apply and verify the usage migration manually.
- Configure production `REVENEW_USAGE_MODE=enforce` only after migration and monitoring are verified.
- Add real payment provider and webhook verification before paid access launch.
- Add email provider integration only when sending is actually implemented.
