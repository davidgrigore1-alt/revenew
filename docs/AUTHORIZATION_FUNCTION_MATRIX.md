# ReveNew Authorization Function Matrix

This matrix covers browser-triggered mutations, provider-backed routes and sensitive reads.

| Function / Path | Required Permission | Business Check | Provider Quota | Mutates Data | Handles PII | Unauthorized Behavior |
| --- | --- | --- | --- | --- | --- | --- |
| `saveOnboarding` | Authenticated setup only | Creates owned business with `owner_profile_id`; inserts deterministic owner membership | No | Yes | Business/profile contact data | Returns safe error; no platform role assignment |
| `createCommercialSignal` | `signals.create` | Current business resolved in data layer | No | Yes | Commercial request/contact data | `AuthorizationError` |
| `updateCommercialSignal` | `signals.update` | Signal loaded by current business in data layer | No | Yes | Commercial request/contact data | `AuthorizationError` or not found |
| `ignoreCommercialSignal` | `signals.archive` | Signal scoped to current business | No | Yes | Commercial request metadata | `AuthorizationError` or not found |
| `archiveCommercialSignal` | `signals.archive` | Signal scoped to current business | No | Yes | Commercial request metadata | `AuthorizationError` or not found |
| `convertSignalToOpportunity` | `signals.convert` | Signal scoped to current business; opportunity inserted with current business id | No | Yes | Signal and opportunity content | `AuthorizationError` or not found |
| `addCommercialSignalEvent` | `signals.update` | Signal scoped to current business | No | Yes | Event notes | `AuthorizationError` or not found |
| `saveAnalyzedOpportunity` | `opportunities.create` | Inserts opportunity for current business | No direct provider call | Yes | Opportunity/contact content | Safe error or redirect |
| `POST /api/ai/analyze-opportunity` | `opportunities.analyze` | Uses current business from paid-access context | Yes | No persistent business mutation | Submitted commercial source text | JSON 403/429/503/502 |
| `POST /api/ai/generate-document` | `documents.generate` | Loads opportunity via `getOpportunityForCurrentBusiness()` | Yes | No persistent mutation | Opportunity/contact/document content | JSON 403/404/429/503/502 |
| `persistGeneratedDocument` | `documents.generate` | Opportunity loaded via current business; insert uses current business id | No direct provider call | Yes | Generated document content | Safe error |
| `updateGeneratedDocument` | `documents.update` | Updates by document id and opportunity id; opportunity access should remain scoped by caller flow | No | Yes | Document content | Safe error |
| `persistOpportunityStatus` | `opportunities.update` | Updates opportunity id; should be paired with current-business object verification | No | Yes | Opportunity status | Safe error |
| `persistFollowUp` | `actions.create` | Opportunity loaded via current business; action inserted with current business id | No direct provider call | Yes | Follow-up text | Safe error |
| `updateOpportunityAction` | `actions.complete` or `actions.update` | Updates action by id and opportunity id; should be paired with current-business object verification | No | Yes | Action metadata | Safe error |
| `getOpportunitiesForCurrentBusiness` | `opportunities.read` by route/page context | Queries current business id | No | No | Opportunity/contact summaries | Server error if business missing |
| `getOpportunityForCurrentBusiness` | `opportunities.read` by route/API context | Queries `id` and current `business_id` | No | No | Full opportunity, documents, actions, events | Returns null/not found |
| Admin usage read | `platform.admin.access` | Internal platform route only | No | No | Usage metadata, no prompts/secrets | Forbidden state |
| Billing view | `billing.read` intended | Current business context | No | No | Subscription/access metadata | Redirect to access/login/onboarding |
| Usage snapshot | `usage.read` by page context | Explicit business id from current business | No | No | Usage counters | Unavailable snapshot on missing infra |

## Object-Level Authorization Notes

- Opportunity details and document generation use `getOpportunityForCurrentBusiness()`, which scopes object loading by current `business_id`.
- Commercial inbox data functions are expected to scope signal operations by current business before mutation.
- Some legacy action helpers update by submitted object ids plus opportunity ids; future hardening should load the parent object first and explicitly compare `business_id` before update.
- Provider-backed functions require both business permissions and active access/quota checks. Viewer roles do not include `opportunities.analyze` or `documents.generate`.

## Role Mutation Surface

No website function, API route or Server Action assigns platform roles. Onboarding assigns deterministic business ownership only by setting `businesses.owner_profile_id` and owner membership for the creating profile.
