# Google Workspace read-context connector

## Purpose

This connector adds owner-authorized Gmail and Google Calendar context to the existing Universal Business Context and Ask ReveNew architecture. Reading remains the default connection. Gmail sending is a separate, optional capability used only by the Communication OS after two explicit human confirmations; it is separate from ReveNew authentication.

The control chain remains:

authorized workspace context → controlled retrieval → evidence → grounded answer → missing information → prepared action → human approval

## OAuth architecture

ReveNew uses the Google OAuth 2.0 web-server authorization-code flow.

- OAuth attempts use 256-bit random state.
- PKCE uses a random verifier and S256 challenge.
- State and verifier are stored only in short-lived, HttpOnly, SameSite=Lax cookies.
- The callback compares state in constant time before exchanging the code.
- Redirects after callback are fixed to the local /apps route; arbitrary return URLs are not accepted.
- Token exchange, refresh, Google API calls and revocation run server-side.
- Offline access is requested so manual or future scheduled synchronization can refresh access.
- The Google account may differ from the identity used to authenticate to ReveNew.

Requested scopes:

- openid
- email
- profile
- https://www.googleapis.com/auth/gmail.readonly
- https://www.googleapis.com/auth/calendar.events.readonly

Optional incremental capability, requested only from the explicit Gmail sending activation control:

- https://www.googleapis.com/auth/gmail.send

Gmail compose/modify and all Calendar write scopes remain unrequested. The callback unions scopes only for the same ReveNew tenant, connection owner and Google external account, so upgrading send capability cannot silently replace or broaden another connection.

## Credential security

Only the refresh credential is persisted. It is encrypted before database storage with AES-256-GCM and a fresh 96-bit IV. The envelope version, IV, authentication tag and ciphertext are stored in the database.

The 32-byte base64 encryption key remains in GOOGLE_TOKEN_ENCRYPTION_KEY; it is never stored in the database or returned to the browser. Access tokens remain process-memory values and expire normally.

A refresh credential from an existing connection can only be reused for the exact same tenant, ReveNew owner and Google external account ID.

The connector tables are inaccessible to anon and authenticated through PostgreSQL table grants. Server-side repository calls use the privileged Supabase client and repeat tenant, owner and connection filters on every read and mutation. RLS remains enabled as defense in depth.

## Ownership and retention policy

A Google connection belongs to the ReveNew profile that authorized it.

Raw normalized Gmail and Calendar context is private to that owner, even when other users belong to the same workspace or have management roles. Persisted facts intentionally written into shared ReveNew records continue to follow normal workspace RLS.

Disconnect policy:

1. attempt Google token revocation;
2. clear the encrypted refresh credential and provider cursors locally even if remote revocation is unavailable;
3. mark the connection disconnected;
4. delete the owner's normalized Gmail messages, Calendar events and sync activity for that connection;
5. prevent Ask ReveNew from retrieving disconnected-source context.

No provider payload, message body, token or credential is written to logs.

## Gmail synchronization

Initial synchronization is bounded to the last 90 days, at most five result pages and at most 500 messages. Spam and trash are excluded.

Stored fields:

- provider message and thread IDs;
- timestamp;
- sender name/email;
- To and Cc participants;
- subject;
- normalized plain text and a bounded excerpt;
- inbound/outbound direction;
- useful labels;
- owner, tenant and connection;
- deterministic CRM links when unambiguous;
- provider update and synchronization timestamps.

Multipart messages prefer text/plain. If only HTML exists, scripts, styles, iframes, SVG and markup are removed and text is normalized. Remote resources are never rendered. Attachments and raw transport payloads are not retained.

Subsequent synchronization uses Gmail history IDs. An invalid history cursor (HTTP 404) causes a bounded 90-day recovery sync; previously valid context is not deleted because an incremental request failed.

## Calendar synchronization

Initial synchronization covers approximately 60 days in the past and 120 days in the future, with at most five pages.

Stored fields:

- provider event and calendar IDs;
- title;
- start/end and timezone;
- participants and organizer;
- normalized description;
- status and visibility;
- safe HTTPS conference URL;
- provider create/update timestamps;
- owner, tenant and connection;
- deterministic CRM links when unambiguous.

When Google exposes only limited event data, ReveNew stores an “Eveniment privat” placeholder, the time range and limited visibility; it does not fabricate attendees or descriptions.

Subsequent synchronization uses the Google Calendar sync token. An expired token (HTTP 410) causes a bounded full-window recovery sync.

## Entity linking

Linking is conservative:

- contact: exactly one normalized email match in the current tenant;
- company: the exact matched contact's existing organization;
- opportunity: exactly one existing opportunity-contact relation.

Ambiguous or missing matches remain unlinked. The connector does not create contacts, merge records or use fuzzy name matching.

## Ask ReveNew integration

The existing email_provider and calendar_provider capability checks become available only after the owner has the relevant granted capability and a successful source sync.

The controlled external-context tool supports recent interactions, company briefings, external-activity views, and meetings today/tomorrow/this week. Evidence uses safe internal IDs such as email:<id> and calendar:<id>. Until a safe internal viewer exists, source chips do not pretend to link to provider content.

Email bodies and Calendar descriptions are untrusted business data. They are never promoted to system instructions. Retrieved commands such as “ignore previous instructions”, “export the database” or “send automatically” remain quoted customer content.

Prepared follow-ups may use the last inbound email and next meeting together with the opportunity, owner and next action. Drafts remain private to the connection owner and editable. Sending requires a persisted approved revision, a second final confirmation, the separate gmail.send grant, an atomic draft claim and a stable content fingerprint. The exact approved version is sent once through Gmail server-side, audited without body or token data, and normalized locally as an outbound interaction. Sequences may prepare drafts but never send autonomously.

## Google Cloud Console configuration

1. Create or select a Google Cloud project.
2. Enable Gmail API.
3. Enable Google Calendar API.
4. Configure the OAuth consent screen:
   - product name and support contact;
   - authorized domains for production;
   - the readonly scopes listed above;
   - the optional gmail.send scope when production sending is enabled;
   - test users while the app is in testing status.
5. Create an OAuth client ID of type Web application.
6. Add the exact callback URL used by the deployment as an authorized redirect URI, for example:
   - local: http://localhost:3000/api/integrations/google/callback
   - production: https://your-domain.example/api/integrations/google/callback
7. Configure the deployment environment:
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - GOOGLE_OAUTH_REDIRECT_URI
   - GOOGLE_TOKEN_ENCRYPTION_KEY

GOOGLE_OAUTH_REDIRECT_URI must exactly match the authorized Google redirect URI. Generate the encryption key from 32 cryptographically random bytes and store only its base64 representation in the deployment secret manager. Never commit any of these values.

For external/public OAuth consent, complete Google's verification process when Google requires it for the requested sensitive/restricted scopes. Gmail send must be declared on the consent screen before users can activate it.

## Current limitations

- synchronization is manual via “Sincronizează acum” because the repository has no established background scheduler;
- Gmail sending is limited to individually reviewed drafts and requires an explicit optional permission; bulk/autonomous sending is not implemented;
- Calendar creation or modification is not implemented;
- attachments are not ingested;
- only the primary Calendar is synchronized;
- no Microsoft 365, Outlook, Slack, call or note connector exists in this pass;
- no detailed internal email/event viewer exists yet;
- previously synchronized private context is deleted on disconnect.
