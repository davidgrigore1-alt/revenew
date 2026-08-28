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

### OpenAI / local Ollama
- Mechanism: shared bounded provider abstraction
- Environment variables: provider-specific server-only configuration
- Client-facing features: source-bound summaries, explanations and editable drafting assistance
- Billing unit: provider tokens for OpenAI; local compute for Ollama
- Fallback: deterministic output when a generative provider is unavailable
- Retry: no automatic retry for user-visible commercial actions
- Auth: authenticated workspace access is required
- Business authorization: context is resolved server-side and bounded before generation

### Gmail and Google Calendar
- OAuth variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`
- Credential encryption: refresh credentials are encrypted at rest with a server-only environment key
- Default scopes: identity, Gmail read-only and Calendar read-only
- Optional scope: `gmail.send`, requested separately from the read connection
- Send path: persisted owner-private draft → approval → final confirmation → atomic claim → Gmail server-side send
- Retry: no automatic retry after an uncertain provider result
- Billing unit: Google Workspace API quota; no ReveNew email markup
- Privacy: raw mailbox/calendar context remains private to the connection owner

## Configured but Unused

### Resend
- Environment variable: `RESEND_API_KEY`
- Status: legacy placeholder; the confirmed product send path uses Gmail OAuth, not Resend

## Planned / Not Implemented

Web research, OCR pages, WhatsApp delivery, voice minutes, external CRM synchronization, payment provider checkout and webhooks.

## Implemented Controls

- AI routes do not trust client-supplied business or record payloads.
- Provider calls require authenticated workspace access.
- Input shape, content type and sizes are validated.
- AI calls use timeouts and bounded output.
- Gmail send permission is incremental and optional.
- Email send requires an approved content fingerprint and a second explicit confirmation.
- Provider tokens and message bodies are excluded from logs and user-visible JSON.
- Sequences prepare work only; they never send autonomously.

## Remaining Production Requirements

- Configure production provider credentials without committing secret values.
- Monitor Google quota, revoked grants, uncertain provider responses and deferred audit/context writes.
- Keep Gmail send permission optional until the controlled flow has production operational evidence.
- Add payment provider and webhook verification before paid access launch.