REVENew — CLIENT PRESENTATION EXPERIENCE A2
Guided Product Experience + Contextual Help + UI State System + Visual Hardening

You are working on ReveNew, a serious B2B commercial execution / revenue intelligence product.

This is one of the most important product-quality passes before ReveNew becomes suitable for controlled client presentations.

The objective is NOT to add visual decoration.

The objective is to make ReveNew:

- immediately understandable to a first-time business user
- calm and premium
- easier to learn without becoming simplistic
- powerful without looking overloaded
- coherent across every major interaction state
- visually mature enough for a real client presentation
- significantly harder to misuse
- free from obvious visual inconsistencies and presentation defects

A user should be able to open ReveNew for the first time and understand:

1. what ReveNew does
2. where to start
3. what matters right now
4. what each major page is for
5. what action they should take next
6. where to get help
7. what happened when an action succeeds or fails

WITHOUT removing any of the product's capabilities.

==================================================
CORE PRODUCT PRINCIPLE
==================================================

ReveNew must become:

SIMPLE TO UNDERSTAND
WITHOUT BECOMING SIMPLE IN CAPABILITY

Minimalism means reducing cognitive competition.

It does NOT mean:
- deleting features
- hiding core functionality
- making every screen empty
- removing useful information
- turning the application into a generic minimal SaaS template

Use progressive disclosure:

PRIMARY INFORMATION
visible immediately

SECONDARY INFORMATION
visible but quieter

ADVANCED INFORMATION
available contextually when needed

All existing capabilities remain accessible.

==================================================
RESEARCH-GROUNDED UX PRINCIPLES
==================================================

Use these principles throughout the pass:

1. Empty states must not be dead ends.

For a legitimate empty state:
- explain what belongs here
- explain why it matters when necessary
- expose ONE primary next action
- optionally expose ONE secondary help action

Do not show 5 equally important actions.

2. Onboarding must supplement the product, not compensate for confusing UI.

The interface must make sense even if the user skips onboarding.

3. Onboarding should be optional, resumable, and non-blocking.

Avoid:
- mandatory tours
- full-screen walkthroughs on every login
- giant welcome modals
- intrusive overlays
- repetitive tooltip tours

4. Completion must be grounded in real application state.

Never display fake checklist progress.

5. Help must be consistently available.

A user should not need to remember different help locations on different pages.

6. Advanced functionality stays available but should not visually compete with the primary task.

7. Empty, loading, success, error, filtered-empty, permission-limited, and disconnected states are DIFFERENT states.

Do not render all of them as the same generic message.

8. Accessibility is product quality.

Interactive controls should:
- have visible keyboard focus
- not hide focused elements under sticky UI
- generally provide >=24x24 CSS px pointer targets or sufficient spacing
- remain usable through keyboard navigation
- use correct semantic elements

==================================================
STRICT SCOPE / SAFETY
==================================================

DO NOT:

- deploy
- commit
- push
- run demo:reset
- reset Supabase
- modify Supabase migrations
- modify database schema
- create new database tables
- modify RLS
- modify authentication architecture
- modify billing behavior
- modify Google OAuth architecture
- modify AI provider/orchestration architecture
- modify revenue calculations
- modify reporting math
- change opportunity domain semantics
- delete routes
- delete features
- remove user capabilities
- install a third-party onboarding/tour library
- install a design framework
- run npm install
- introduce large gradients
- introduce glow
- introduce glassmorphism
- introduce decorative illustrations
- introduce confetti
- introduce giant empty-state artwork
- introduce generic “AI magic” visual language
- make elements dramatically larger
- use CSS zoom hacks
- add dozens of tooltips

Do not touch the existing demo data.

Preserve populated demo behavior.

==================================================
PHASE 0 — REPOSITORY RECONNAISSANCE
==================================================

BEFORE MAKING CHANGES:

Inspect the current implementation carefully.

At minimum inspect:

src/components/dashboard/AppShell.tsx
src/components/dashboard/ShellNavigation.tsx
src/components/dashboard/PageHeader.tsx
src/components/dashboard/PageShell.tsx

src/components/guidance/ContextualAssistant.tsx

src/components/onboarding/OnboardingForm.tsx

src/components/dashboard/HomeAskSurface.tsx

src/components/ui/Button.tsx
src/components/ui/Input.tsx
src/components/ui/Select.tsx

src/app/(protected)/dashboard/page.tsx
src/app/(protected)/companies/page.tsx
src/app/(protected)/contacts/page.tsx
src/app/(protected)/opportunities/page.tsx
src/app/(protected)/pipeline/page.tsx
src/app/(protected)/inbox/page.tsx
src/app/(protected)/documents/page.tsx
src/app/(protected)/meetings/page.tsx
src/app/(protected)/sequences/page.tsx
src/app/(protected)/workflows/page.tsx
src/app/(protected)/prepared/page.tsx
src/app/(protected)/apps/page.tsx
src/app/(protected)/settings/page.tsx

Find the existing Help route/component.

Find:
- any empty-state implementations
- loading states
- skeletons
- generic error messages
- page-level helper text
- existing onboarding state
- existing contextual guidance
- any profile preference storage already available
- existing reusable primitives for panels, messages, drawers, menus or popovers

IMPORTANT:

Do not create duplicate component systems if the repository already contains a suitable abstraction.

Prefer:
EXTEND > DUPLICATE

Prefer:
SHARED PRIMITIVE > PAGE-SPECIFIC HACK

Do not immediately edit while exploring.

First understand how ReveNew currently expresses:
- page headers
- actions
- navigation
- permissions
- workspace state
- demo state
- loading
- errors

Then implement the pass.

==================================================
PART 1 — FIRST-TIME EXPERIENCE ARCHITECTURE
==================================================

Build a restrained first-time experience for genuinely new/incomplete workspaces.

DO NOT use a mandatory onboarding modal.

DO NOT block the application.

DO NOT launch a tour automatically.

Instead create a compact, premium:

"Primii pași"

or

"Configurează ReveNew"

experience.

Recommended UX:

A compact setup panel visible only when meaningful setup work remains.

It should be:
- dismissible
- resumable
- visually quiet
- easy to scan
- integrated into the product
- not permanently occupying dashboard space after completion

For populated workspaces / existing demo workspaces:

DO NOT show a giant onboarding panel.

Completed onboarding should disappear from primary workflow and remain accessible through Help if appropriate.

==================================================
PART 2 — REAL SETUP PROGRESS
==================================================

DO NOT create decorative checkboxes.

Checklist completion must be derived from ACTUAL EXISTING DATA whenever possible.

Inspect the existing data model and server functions.

Possible setup milestones:

1. Company profile configured
2. Commercial data exists
3. At least one opportunity exists
4. At least one opportunity has an explicit responsible person / next action / commercial deadline where applicable
5. User has reached the operational workflow

Do NOT blindly use these milestones if they do not map correctly to the current data model.

Derive the best 4–5 milestones from what the application can reliably determine.

IMPORTANT:

If a milestone CANNOT reliably be determined from persisted data:

DO NOT fake its completion.

Do not store a boolean purely to make the checklist look completed.

Either:
- omit the milestone
- make it an optional exploratory action that does not affect completion percentage

For example:

"Încearcă Ask ReveNew"

may be a useful optional CTA.

But unless the product already persists reliable AI-interaction history that can be queried safely, do not pretend it is completed.

==================================================
PART 3 — CHECKLIST UX
==================================================

The checklist should never feel like a tutorial for children.

Target enterprise tone.

Example structure:

Primii pași
3 din 4 finalizați

✓ Configurează compania
✓ Adaugă date comerciale
○ Creează prima oportunitate
○ Definește următoarea acțiune

Each incomplete item:

- concise label
- optionally one short supporting line
- one clear CTA

Do NOT add paragraph-length explanations.

Do NOT place separate card borders around every checklist item.

Use:
- rhythm
- spacing
- restrained dividers
- subtle completion state

Completed states:
- quiet
- visibly complete
- not bright green everywhere

Green may be used for a small semantic confirmation indicator.

Do not use Champagne Gold to mean success.

==================================================
PART 4 — CONTEXTUAL HELP SYSTEM
==================================================

ReveNew already has Help-related UI.

Turn it into a coherent, reusable contextual help architecture.

The user should have ONE predictable global way to find help.

Do not scatter random question-mark buttons through every card.

Preferred architecture:

GLOBAL HELP ENTRY
↓
context for current route
↓
full Help Center when needed

If technically appropriate with the existing AppShell:

The existing global "Ajutor" action may open a lightweight menu/panel that includes:

- Ghid pentru această pagină
- Centru de ajutor

If there is an existing feedback mechanism, it MAY also include:
- Trimite feedback

Only include feedback if there is real existing behavior.

Do not create fake feedback submission.

==================================================
PART 5 — PAGE GUIDE REGISTRY
==================================================

Create a maintainable page-guide configuration instead of hardcoding large help strings across individual pages.

Naming is flexible based on repository architecture.

Possible concept:

src/lib/guidance/page-guides.ts

Each main route may define:

title
purpose
whatYouSee
whatYouDo
nextStep
helpHref / article anchor

For example:

PIPELINE

Purpose:
"Urmărești cum avansează oportunitățile comerciale"

What you see:
"Oportunitățile grupate după etapa curentă"

What you do:
"Verifici responsabilul, termenul și următoarea acțiune"

Next step:
"Actualizează următoarea acțiune sau mută oportunitatea când progresul este confirmat"

COPY RULES:

- Romanian
- plain business language
- short
- no marketing fluff
- no developer terminology
- avoid product jargon when ordinary Romanian works
- do not say RLS, RPC, JSON, service role, database, etc.
- do not over-explain

Page guides should help someone perform work.

They are NOT documentation dumps.

==================================================
PART 6 — HELP CENTER
==================================================

Upgrade the existing Help route into a useful product Help Center.

Do NOT create a marketing landing page inside the product.

The Help Center should feel like part of the application.

Recommended structure:

HEADER

Ajutor
Ghiduri scurte pentru lucrul în ReveNew

Optional compact search/filter if it can be implemented locally and cleanly without extra dependencies.

TOPIC GROUPS:

Start aici

Control Center

Companii și contacte

Oportunități și Pipeline

Inbox și follow-up

Documente și întâlniri

Secvențe și Workflow-uri

Ask ReveNew

Aplicații și integrări

Aprobări și control

Setări și acces

Do not create 40 articles.

Start with concise, high-value guidance.

Every topic should answer:

- Ce este?
- Când îl folosești?
- Care este următoarea acțiune?

Where appropriate:
provide a direct deep-link back into the product.

Example:

"Deschide Pipeline"

Do not use external documentation if existing in-product information is sufficient.

==================================================
PART 7 — EMPTY STATE SYSTEM
==================================================

Audit major protected surfaces for empty states.

At minimum review:

Companies
Contacts
Opportunities
Pipeline
Inbox
Documents
Meetings
Sequences
Workflows
Prepared work
Apps/integrations where relevant

Create or refine a shared EmptyState primitive if one does not already exist.

A good empty state contains:

OPTIONAL small icon

SHORT title

ONE concise explanation

ONE primary action when an action makes sense

OPTIONAL secondary help link

DO NOT show:

- giant illustration
- huge empty card
- marketing headline
- multiple competing buttons
- random decorative gradient

==================================================
PART 8 — DISTINGUISH EMPTY-STATE TYPES
==================================================

Do not treat every absence of content as the same state.

Support these concepts where relevant:

1. FIRST USE

Example:
"Adaugă prima companie"

Explain what appears here once companies exist.

CTA:
"Adaugă companie"

2. FILTERED EMPTY

Example:
"Nicio oportunitate nu corespunde filtrelor"

CTA:
"Resetează filtrele"

Do NOT tell them to create new data if data exists but filters hide it.

3. HEALTHY ZERO STATE

Example:
"Nimic nu necesită atenție acum"

This is NOT an error.

Do not add an unnecessary CTA unless there is a useful next step.

4. CONNECTION REQUIRED

Example:
"Conectează Google Workspace pentru a vedea mesajele sincronizate"

Only use this where connection truly enables the feature.

5. PERMISSION LIMITED

Explain that access is limited without implying something broke.

6. ERROR

Example:
"Nu am putut încărca oportunitățile"

Provide:
"Încearcă din nou"

if retry behavior exists.

Never show:
"Something went wrong"

inside Romanian product surfaces.

==================================================
PART 9 — LOADING STATES
==================================================

Audit loading behavior on major pages touched in this pass.

Avoid:
- whole-page blank flashes
- indefinite generic spinners
- layout shift
- spinner replacing a large section without context

Prefer skeletons for:
- tables
- repeated rows
- cards whose geometry is known

Prefer inline loading for:
- button actions
- small refresh operations
- synchronization

Loading copy should communicate what is happening when useful.

Examples:

"Se încarcă oportunitățile"

"Se sincronizează mesajele"

Do not invent progress percentages.

==================================================
PART 10 — ACTION FEEDBACK
==================================================

Audit the visual feedback for actions in touched surfaces.

Interactive state model should be coherent:

idle
hover
focus
pressed
loading
success
error
disabled

Important actions should never appear to do nothing after click.

For server actions:

- loading state should be visible
- duplicate submission should be prevented where appropriate
- completion should be communicated
- error should be understandable and actionable

Do not create persistent success banners for trivial interactions.

A brief inline confirmation is preferable for small actions.

==================================================
PART 11 — VISUAL BUG HARDENING
==================================================

Perform a deliberate visual defect sweep across the protected application shell and all surfaces touched by this pass.

Look specifically for:

TEXT
- clipping
- truncation where full value should be visible
- awkward wrapping
- orphan words
- overlapping labels
- mixed Romanian/English UI copy
- duplicated descriptions
- inconsistent capitalization
- unnecessary terminal periods in SHORT PageHeader descriptions

ICONS
- inconsistent icon size
- icons not optically centered
- incorrect baseline
- different stroke weights when avoidable
- decorative icons competing with content

CONTROLS
- same-level buttons with different heights
- mismatched radii
- mismatched padding
- select/input height mismatch
- icon buttons with tiny hit areas
- broken disabled states

LAYOUT
- cards not aligned
- inconsistent page gutters
- uneven vertical rhythm
- tabs misaligned with content
- horizontal overflow
- accidental double borders
- sticky elements covering content
- dropdowns behind other surfaces
- popovers clipped by overflow containers
- drawers with wrong z-index
- unexpected page jump after content loads

TABLES/LISTS
- header and row alignment
- column content collision
- row hover clarity
- selected state
- empty row states
- controls aligned to corresponding rows

THEME
- low contrast in light mode
- low contrast in dark mode
- Champagne Gold disappearing on light backgrounds
- Champagne Gold becoming muddy in dark mode
- semantic success/warning/error colors being confused with brand color

Do not make arbitrary changes.

Fix only defects that can be justified as consistency, clarity, accessibility, or visual correctness.

==================================================
PART 12 — ACCESSIBILITY QUALITY FLOOR
==================================================

Within touched surfaces:

Ensure:

- focus indicator is clearly visible
- keyboard focus is not hidden under sticky UI
- icon-only actions have accessible names
- tooltips appear on hover AND keyboard focus when used
- tooltips are only for nonessential clarification
- primary information is never tooltip-only
- pointer targets generally meet 24x24 CSS px minimum or sufficient spacing
- buttons use button semantics
- links use link semantics
- disabled controls are correctly disabled
- aria-expanded reflects expandable state
- aria-current is correct for navigation where applicable
- dialogs/panels maintain sensible focus behavior

Do not overuse ARIA where native HTML already expresses semantics.

==================================================
PART 13 — TOOLTIP POLICY
==================================================

DO NOT solve discoverability by adding tooltips everywhere.

Tooltips should be used for:

- icon-only controls
- unfamiliar compact controls
- short nonessential clarification

Do NOT use a tooltip to explain:
- a whole workflow
- a page
- a complex feature
- an error
- mandatory instructions

Those belong in contextual help or visible copy.

==================================================
PART 14 — PROGRESSIVE DISCLOSURE
==================================================

Where a touched page presents many secondary controls:

Preserve them.

But reduce immediate competition.

Possible techniques:

- secondary action menu
- "Mai multe"
- expandable details
- details drawer
- advanced filters panel
- muted tertiary actions

DO NOT move a frequent primary action into an overflow menu.

DO NOT hide core workflow state.

The first view of a page should prioritize the 2–4 things a new user most needs to understand.

Power-user functionality remains reachable.

==================================================
PART 15 — CONTROL CENTER FIRST-TIME CLARITY
==================================================

Do NOT redesign the Control Center charts in this pass.

Do NOT modify calculations.

Do not change financial semantics.

Improve only first-time comprehension around the existing Control Center.

A new user should understand:

- what requires attention
- why it matters
- how many situations are involved
- what to inspect next

If the workspace is genuinely new/incomplete:

the setup guidance may appear in a restrained location.

If the workspace is populated:

the Control Center must remain focused on commercial execution.

Do not let onboarding overwhelm a populated dashboard.

==================================================
PART 16 — ASK REVENew POSITIONING
==================================================

Do not turn Help into another chatbot.

Ask ReveNew and Help have different purposes.

HELP:
"How do I use the product?"

ASK REVENew:
"What does my commercial data mean and what should I do?"

Make this conceptual distinction clear in copy and navigation.

Do not add AI decoration to Help.

==================================================
PART 17 — CLIENT PRESENTATION COPY AUDIT
==================================================

Audit visible copy in touched protected surfaces.

Remove or correct obvious presentation-quality issues such as:

- developer terminology
- debug terminology
- placeholder phrasing
- unclear labels
- unnecessary English
- inconsistent singular/plural
- inconsistent capitalization
- robotic wording
- ambiguous CTA labels such as "Continue" when a specific action can be named

Preferred:

"Deschide oportunitatea"

instead of:

"Continuă"

Preferred:

"Resetează filtrele"

instead of:

"Reset"

Preferred:

"Încearcă din nou"

instead of:

"Retry"

DO NOT rewrite established domain terms that are already clear and correct.

Do not touch legal copy.

==================================================
PART 18 — DO NOT FAKE MATURITY
==================================================

This is critical.

If a feature is not truly implemented:

DO NOT create UI that pretends it works.

If an operation cannot be completed:
- preserve accurate status
- preserve truthful copy
- do not fabricate success
- do not fabricate synced state
- do not fabricate AI completion
- do not fabricate connected provider state

A client-ready product must be credible.

==================================================
PART 19 — NO VISUAL REGRESSIONS
==================================================

The pass must preserve:

- the premium neutral light surface system created in A1
- Champagne Gold roles
- dark mode
- current navigation hierarchy
- current Control Center visualizations
- current opportunity data
- existing route permissions
- existing component geometry where already correct

Do not revert A1 decisions accidentally.

==================================================
PART 20 — RESPONSIVE DESKTOP QUALITY
==================================================

Desktop-first remains the priority.

Verify layouts conceptually at:

1280px
1440px
1920px

Do not perform a full mobile redesign.

However:

do not introduce new desktop implementation that obviously breaks narrower layouts.

Avoid rigid widths unless necessary.

Use minmax/flex/grid appropriately.

==================================================
PART 21 — MOTION
==================================================

Do not add decorative motion.

Where motion improves comprehension:

- panel opening
- expanding help
- checklist progress
- contextual state transition

keep it restrained.

Approximately:
120–200ms for compact UI transitions

Respect:
prefers-reduced-motion

No bouncing.
No glowing.
No floating cards.
No dramatic entrance animation.

==================================================
PART 22 — IMPLEMENTATION QUALITY
==================================================

Avoid large page-specific logic blocks.

Prefer reusable architecture.

Likely reusable concepts may include:

GettingStarted / SetupChecklist
PageGuide
HelpEntry
EmptyState
StateMessage
ActionFeedback

BUT:

Only create them if the current repository does not already provide equivalent components.

Naming should follow existing ReveNew conventions.

Keep server/client boundaries clean.

Do not turn server pages into client components solely for visual convenience.

Do not introduce unnecessary global state.

Do not use `any` to silence TypeScript.

Do not hard-code demo business IDs.

Do not hard-code user IDs.

Do not depend on Irina/MERIDIAN-specific values.

==================================================
PART 23 — TESTABILITY
==================================================

Any logic that decides setup readiness should be testable independently from presentation.

For example:

deriveGettingStartedState(...)

should ideally be a pure/mostly pure function operating on known state.

Add focused tests if introducing nontrivial derivation logic.

Test:

- completely new workspace
- partially configured workspace
- populated workspace
- missing optional feature
- permission-restricted member if applicable

Do not over-test CSS implementation details.

==================================================
PART 24 — VISUAL QA MATRIX
==================================================

After implementation inspect, where tooling permits:

LIGHT THEME
- Control Center
- Companies
- Opportunities
- Pipeline
- Inbox
- Help
- Settings

DARK THEME
- Control Center
- Help
- at least one dense data page

Check:

default
hover
focus
active
empty
loading if reproducible
error if safely reproducible
dropdown/popover
long text
small data count
large data count

If browser automation or a browser is available:

use it.

Do NOT claim visual QA was completed if you cannot actually render the pages.

If visual browser inspection is unavailable:
state that clearly in the final report.

==================================================
PART 25 — DEMO SAFETY
==================================================

DO NOT:

npm run demo:reset

Do not mutate the demo snapshot solely to test empty states.

Do not delete demo records.

Do not create fake client data.

Use code-level state testing for empty states if changing demo data would be destructive.

==================================================
PART 26 — QA COMMANDS
==================================================

Keep QA focused.

Run:

npm run typecheck

Then run focused relevant tests only.

Inspect existing test scripts before deciding exact commands.

Good candidates may include existing tests around:

information architecture
structural UX
presentation hardening
theme/personalization
workspace foundation

If you add a focused test for onboarding/readiness logic, run it.

DO NOT run the entire repository test suite unless a touched shared primitive makes focused coverage insufficient.

DO NOT run production build unless:
- typecheck passes
- focused tests pass
- and you believe build-specific behavior needs validation

Do not consume time running repeated redundant gates.

==================================================
PART 27 — FINAL SELF-REVIEW
==================================================

Before stopping, inspect your own diff.

Ask:

Did I introduce duplicate abstractions?

Did I make Help too prominent?

Did I make onboarding intrusive?

Did I accidentally reduce functionality?

Did I add visual noise while trying to explain the UI?

Did I create multiple equally strong CTAs?

Did I introduce fake progress?

Did I make empty states too verbose?

Did I introduce new inconsistent control sizes?

Did I make the populated demo dashboard look like a setup wizard?

Did I accidentally expose implementation terminology?

Did I preserve both themes?

Did I preserve keyboard/focus behavior?

Fix those issues before reporting completion.

==================================================
PART 28 — FINAL REPORT
==================================================

When finished report EXACTLY:

1. Summary
What changed and why

2. Files changed
Complete list grouped by:
- guidance/onboarding
- help
- UI primitives
- route surfaces
- tests

3. First-time experience
How it behaves for:
- new workspace
- partially configured workspace
- populated workspace

4. Completion logic
Which checklist steps are grounded in what real data

Explicitly identify any step that is optional rather than tracked

5. Contextual Help
How route-specific guidance works

6. Empty states
Which surfaces were standardized

7. Loading/error states
Which inconsistencies were fixed

8. Visual hardening
List the actual visual defects corrected

9. Accessibility
Focus, targets, semantics, keyboard behavior

10. Functionality preservation
Confirm that no product capability or route was removed

11. QA
Commands executed and exact results

12. Visual inspection
Which routes/themes were actually rendered

Do NOT say visual QA passed unless they were actually rendered.

13. Deferred items
Anything deliberately reserved for A3

DO NOT COMMIT.
DO NOT PUSH.
DO NOT DEPLOY.