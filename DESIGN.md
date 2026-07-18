\# DESIGN.md — ReveNew Complete Redesign System



\## 0. Purpose



This document is the design contract for the complete ReveNew redesign.



It must be used by any Codex agent, developer, or designer working on the project. The goal is not to make the product “look nicer.” The goal is to turn ReveNew into a credible, premium, production-grade B2B SaaS for revenue recovery and opportunity management.



ReveNew must look and feel like a serious business product for owners, operators, sales managers, revenue teams, consultants, and finance-adjacent teams that need control over commercial opportunities, follow-up, ownership, risk, and recoverable revenue.



The final product UI and all user-facing copy must be in premium business Romanian. Internal comments, implementation notes, variable names, and this design specification may remain in English.



Use only the name \*\*ReveNew\*\*. The repository may still be named `moneyhunter-ai`, but the product, UI, copy, metadata, and brand references must use \*\*ReveNew\*\* only.



\---



\# 1. Executive Design Vision



\## 1.1 What ReveNew must become visually



ReveNew must become a calm, premium, enterprise-grade revenue control platform.



It should feel like:



\* Attio’s CRM clarity and record density;

\* Linear’s speed, restraint, consistency, and sharp interaction model;

\* Stripe’s commercial polish, typography, credibility, and landing-page structure;

\* Aura’s best finance/revenue/dashboard templates used as visual inspiration, not as components to copy blindly.



The target feeling:



> “This is not a student project. This is a serious revenue operating system built by people who understand money, process, ownership, and commercial discipline.”



The product must communicate:



\* financial credibility;

\* operational control;

\* trust;

\* clarity;

\* calm authority;

\* security;

\* high-value B2B seriousness;

\* human-supervised AI, not autonomous black-box automation.



\## 1.2 Standard to follow



ReveNew must be designed to look credible beside products like Attio, Linear, Stripe, Ramp, Clay, and high-end RevOps tools.



It must not look like:



\* a generic Tailwind admin dashboard;

\* an AI-generated SaaS landing page;

\* a crypto/fintech hype page;

\* a colorful toy CRM;

\* a template with disconnected pages;

\* a dashboard made of random cards and charts.



\## 1.3 Design philosophy



ReveNew is a revenue recovery command center. Every screen must answer at least one business-critical question:



\* What revenue is at risk?

\* What opportunity needs action?

\* Who owns it?

\* What should happen next?

\* What is blocked?

\* What changed recently?

\* What requires human approval?

\* What can management trust?



Decoration is secondary. Clarity, ownership, and action are primary.



\---



\# 2. Brand Positioning Visual



\## 2.1 Brand personality



ReveNew is:



\* premium;

\* serious;

\* precise;

\* operational;

\* financially literate;

\* secure;

\* B2B-first;

\* calm;

\* trustworthy;

\* human-controlled;

\* commercially sharp.



ReveNew is not:



\* playful;

\* loud;

\* neon;

\* futuristic for the sake of looking futuristic;

\* “AI magic” focused;

\* decorative;

\* casual;

\* over-animated;

\* template-like.



\## 2.2 Visual maturity



The product must feel mature. It should use restraint as a sign of confidence.



Avoid trying too hard. A serious B2B buyer does not trust a revenue product that screams with gradients, giant emojis, excessive animations, or generic AI phrases.



Premium means:



\* controlled spacing;

\* strong typography;

\* predictable interaction;

\* elegant tables;

\* consistent density;

\* meaningful contrast;

\* high-quality empty states;

\* clear page hierarchy;

\* subtle motion;

\* restrained color;

\* no visual noise.



\## 2.3 What the brand should transmit



ReveNew should transmit:



\* “You are losing commercial opportunities because your follow-up and ownership are not structured.”

\* “This product gives you control.”

\* “Every opportunity has an owner, next action, value, status, and history.”

\* “AI may assist, but humans remain in control.”

\* “Management can trust the data because actions are visible and auditable.”

\* “This is about recoverable revenue, not generic CRM administration.”



\## 2.4 What the brand must avoid



Avoid:



\* “revolutionary” language;

\* guaranteed results;

\* exaggerated ROI claims;

\* fake enterprise logos;

\* meaningless dashboards;

\* charts without decisions attached;

\* visual clutter;

\* hero sections that look better than the product;

\* generic SaaS purple/blue gradients;

\* playful rounded UI;

\* glassmorphism everywhere;

\* AI startup clichés.



\---



\# 3. Design Principles



\## 3.1 Clarity before decoration



Every UI element must make the product easier to understand or faster to use. If an element only exists because it “looks cool,” remove it.



Bad:



\* large decorative cards with no operational value;

\* giant icons repeated everywhere;

\* abstract dashboard charts without next actions.



Good:



\* compact KPI cards with trend, risk, and explanation;

\* tables that show owner, value, deadline, and next action;

\* clear status pills;

\* concise empty states that tell the user what to do next.



\## 3.2 Action-oriented dashboards



The dashboard is not a statistics wall. It is the user’s daily revenue control center.



It must immediately answer:



\* What should I do today?

\* What is urgent?

\* What revenue is at risk?

\* What opportunities are stale?

\* Who needs to act?

\* What changed since the last visit?



\## 3.3 Financial credibility



Any number shown in the UI must feel reliable and contextual.



Financial UI rules:



\* Always label currency clearly.

\* Use EUR consistently where relevant.

\* Avoid vague numbers without definitions.

\* Distinguish estimated value, potential recovery, recovered value, and active pipeline.

\* Never imply guaranteed recovery.

\* Use “estimated”, “potential”, “at risk”, or “tracked” when the value is not final.



\## 3.4 Operational density



The internal app must be dense enough to be useful.



Do not waste screen space. This is not a consumer app. A B2B operator should be able to scan many opportunities quickly.



Density target:



\* Landing page: spacious and editorial.

\* Dashboard: balanced, with compact cards and clear hierarchy.

\* Tables/CRM: compact, information-rich, readable.

\* Detail pages: structured, with clear panels and sticky next action.



\## 3.5 Human control



AI must never feel like it is acting behind the user’s back.



AI-related UI must show:



\* what was generated;

\* why it was suggested;

\* what data it used, when possible;

\* whether it is draft, ready, approved, sent, or rejected;

\* who approved it;

\* when it changed.



Primary language:



\* “Sugestie”

\* “Draft”

\* “Revizuiește”

\* “Aprobă”

\* “Pregătește”

\* “Trimite”

\* “Marchează rezultat”



Avoid language like:



\* “Autopilot”

\* “Fully automated”

\* “Let AI handle everything”

\* “Guaranteed recovery”



\## 3.6 Auditability



Actions must leave visible traces.



Important business events should be represented in timeline or audit rows:



\* opportunity created;

\* owner changed;

\* status changed;

\* next action updated;

\* document generated;

\* email drafted;

\* email marked sent;

\* outcome recorded;

\* contact assigned;

\* value changed;

\* plan/access changed;

\* workspace settings changed.



Audit UI must be calm and factual, not dramatic.



\## 3.7 Trust by default



The product must feel secure even before the user reads the security section.



Trust cues:



\* restrained UI;

\* clear account/workspace boundaries;

\* no exposed internal debug noise in normal pages;

\* clean settings;

\* professional empty states;

\* explicit human approval for risky actions;

\* privacy/security copy on landing and access pages;

\* visible data ownership model where appropriate.



\## 3.8 Calm premium interface



Premium does not mean dark gradients and heavy shadows. Premium means control.



Use:



\* subtle borders;

\* layered surfaces;

\* crisp type;

\* measured white space;

\* emerald/teal accents;

\* strong alignment;

\* soft elevation;

\* clear states.



Avoid:



\* neon;

\* constant glow;

\* heavy shadows;

\* excessive blur;

\* decorative particles;

\* generic AI gradient blobs.



\---



\# 4. Design System



\## 4.1 Color direction



Primary brand direction:



\* emerald / teal premium;

\* slate / zinc / neutral foundations;

\* calm off-white landing surfaces;

\* deep ink dark app surfaces;

\* subtle blue for information;

\* amber for warnings;

\* red only for critical risk;

\* green for success, active recovery, positive status.



Do not use generic SaaS purple, neon cyan, pink gradients, or crypto-style colors.



\## 4.2 Core palette



Use these as the target semantic system. Exact Tailwind token implementation can be adapted to the existing setup.



\### Neutral / slate



\* `--background`: `#F7F8F6`

\* `--background-soft`: `#F2F4F1`

\* `--surface`: `#FFFFFF`

\* `--surface-subtle`: `#FAFAF8`

\* `--surface-muted`: `#F0F2EF`

\* `--border`: `#DDE3DD`

\* `--border-strong`: `#C8D1C8`

\* `--text`: `#0B0F0D`

\* `--text-secondary`: `#3F4A45`

\* `--text-muted`: `#6B756F`

\* `--text-faint`: `#9AA39D`



\### Dark / ink



\* `--dark-background`: `#070A09`

\* `--dark-background-soft`: `#0B0F0D`

\* `--dark-surface`: `#101513`

\* `--dark-surface-subtle`: `#151B18`

\* `--dark-surface-muted`: `#1B231F`

\* `--dark-border`: `#25302A`

\* `--dark-border-strong`: `#344239`

\* `--dark-text`: `#F4F7F3`

\* `--dark-text-secondary`: `#C9D2CA`

\* `--dark-text-muted`: `#8F9B92`

\* `--dark-text-faint`: `#637067`



\### Brand emerald / teal



\* `--brand-950`: `#042018`

\* `--brand-900`: `#063326`

\* `--brand-800`: `#07513B`

\* `--brand-700`: `#087354`

\* `--brand-600`: `#0A8F69`

\* `--brand-500`: `#12B981`

\* `--brand-400`: `#39D9A2`

\* `--brand-300`: `#7BEAC4`

\* `--brand-100`: `#DDF8ED`

\* `--brand-50`: `#EEFDF7`



\### Accent gold, used sparingly



Gold is allowed only for premium markers, pricing highlights, or high-value revenue callouts. It must not become the main brand color.



\* `--gold-700`: `#8A6424`

\* `--gold-500`: `#C99A3C`

\* `--gold-300`: `#E9C878`

\* `--gold-100`: `#F8EDCE`



\### Semantic colors



Success:



\* background: `#EAF8F0`

\* text: `#0F6B3E`

\* border: `#B9E7CC`



Info:



\* background: `#EEF5FF`

\* text: `#1D5F9F`

\* border: `#C7DDF8`



Warning:



\* background: `#FFF7E5`

\* text: `#8A5A00`

\* border: `#F1D38B`



Danger:



\* background: `#FFF0F0`

\* text: `#A82424`

\* border: `#F0BBBB`



Dark equivalents must be subtle, not saturated.



\## 4.3 Color usage rules



\### Primary CTA



Use emerald/teal. It should feel confident, not flashy.



Example:



\* background: brand 600 or 500;

\* text: white;

\* hover: slightly darker;

\* focus: emerald ring;

\* disabled: neutral muted.



\### Financial values



Use neutral text by default. Use green only for recovered/positive values. Use amber/red only when the value is at risk, overdue, stale, or blocked.



Do not color every number green.



\### Dashboard risk



\* Urgent: red/danger.

\* Attention needed: amber/warning.

\* Healthy/on track: green/success.

\* Informational: blue/info.

\* Unknown/missing data: neutral.



\## 4.4 Typography



Use a modern, business-grade sans-serif.



Preferred stack:



```text

Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif

```



If the project already imports Inter, keep it. Do not introduce decorative fonts.



Typography should be crisp, compact, and highly readable.



\### Type scale



Landing page:



\* Hero eyebrow: 13–14px, uppercase or small caps, medium weight, letter spacing 0.04em.

\* Hero headline: 48–72px desktop, 38–44px tablet, 32–38px mobile, weight 650–750, tight line-height.

\* Hero subheadline: 18–22px desktop, 16–18px mobile, weight 400–450, relaxed but not loose.

\* Section headline: 34–48px desktop, 28–34px mobile.

\* Section body: 16–18px.

\* Fine print: 12–13px.



App:



\* Page title: 24–32px, weight 650–700.

\* Section title: 16–20px, weight 600–650.

\* Card title: 14–16px, weight 600.

\* Body: 14px.

\* Table text: 13–14px.

\* Metadata: 12–13px.

\* Pills/badges: 11–12px, medium weight.

\* Buttons: 13–14px, weight 550–650.



\## 4.5 Spacing



Use a consistent 4px-based scale.



Recommended scale:



\* `1`: 4px

\* `2`: 8px

\* `3`: 12px

\* `4`: 16px

\* `5`: 20px

\* `6`: 24px

\* `8`: 32px

\* `10`: 40px

\* `12`: 48px

\* `16`: 64px

\* `20`: 80px

\* `24`: 96px



Landing pages may use larger vertical sections. Internal app pages must be tighter.



Internal app default page padding:



\* Desktop: 24–32px.

\* Tablet: 20–24px.

\* Mobile: 16px.



Card padding:



\* Compact card: 12–16px.

\* Standard card: 18–24px.

\* Large landing card: 28–36px.



Tables:



\* Row height compact: 44–52px.

\* Row height comfortable: 56–64px.

\* Cell horizontal padding: 12–16px.



\## 4.6 Grid



Use predictable grids.



Landing:



\* Max content width: 1120–1240px.

\* Hero width: max 1200px.

\* Section grids: 12-column desktop, 6-column tablet, 1-column mobile.

\* Use bento layouts only when each block has distinct meaning.



App:



\* App shell: fixed sidebar + flexible content.

\* Dashboard desktop: 12-column grid.

\* Dashboard tablet: 6-column grid.

\* Dashboard mobile: 1-column stack.

\* Detail pages: 12-column grid with main content and right rail.



Recommended dashboard grid:



\* KPI row: 4 cards across desktop.

\* Main column: 8 columns.

\* Side column: 4 columns.

\* Activity feed / next actions: side column.

\* Tables: full-width or 8–12 columns depending on page.



\## 4.7 Radius



Use subtle rounding. ReveNew is not playful.



Recommended:



\* Small controls: 8px.

\* Buttons: 10px.

\* Cards: 14px.

\* Large panels: 16px.

\* Modals/drawers: 18px.

\* Pills: full radius.



Avoid large 24–32px rounding unless used intentionally on landing hero visuals.



\## 4.8 Borders



Prefer borders over heavy shadows.



Borders should be:



\* 1px;

\* subtle;

\* visible enough to structure content;

\* more pronounced in light mode;

\* restrained in dark mode.



Use border contrast to separate surfaces instead of strong drop shadows.



\## 4.9 Shadows



Shadows must be subtle.



Allowed:



\* soft card elevation;

\* modal shadow;

\* dropdown shadow;

\* hover lift only where it improves affordance.



Avoid:



\* heavy black shadows;

\* glowing boxes everywhere;

\* large green glows on normal cards;

\* shadows on every component.



Recommended:



\* card: `0 1px 2px rgba(15, 23, 42, 0.04)`

\* elevated: `0 12px 32px rgba(15, 23, 42, 0.08)`

\* modal: `0 24px 80px rgba(0, 0, 0, 0.22)`

\* dark elevated: `0 24px 80px rgba(0, 0, 0, 0.35)`



\## 4.10 Surfaces



Use layered surfaces.



Light mode:



\* page background: warm off-white;

\* cards: white;

\* muted panels: subtle green/slate tint;

\* borders: neutral/sage border.



Dark mode:



\* page background: deep ink;

\* cards: dark surface;

\* elevated panels: slightly lighter ink;

\* borders: green-slate / neutral;

\* avoid pure black except for deep backdrop.



\## 4.11 Icons



Use clean outline icons. Existing Heroicons are acceptable.



Rules:



\* 16px for inline/table icons;

\* 18–20px for navigation;

\* 20–24px for card headers;

\* no oversized decorative icon boxes unless used on landing feature cards;

\* no random icon colors;

\* icons must reinforce meaning.



Icon usage:



\* revenue/value: chart, currency, banknote, arrow trend;

\* opportunity: target, briefcase, folder;

\* action: check, clock, arrow;

\* blocked/risk: alert triangle;

\* owner/team: user/group;

\* audit: clock/history;

\* security: shield/lock.



\## 4.12 Dividers



Use dividers to create hierarchy in dense pages.



\* Light: subtle neutral border.

\* Dark: subtle slate/ink border.

\* Avoid thick dividers.

\* Use spacing + divider together, not divider alone.



\## 4.13 Focus states



All interactive elements must have keyboard-visible focus states.



Focus style:



\* 2px emerald ring;

\* 2px offset where possible;

\* never remove outline without replacement.



\## 4.14 Hover states



Hover should be subtle and consistent.



Buttons:



\* primary: darker background;

\* secondary: slightly tinted background;

\* ghost: subtle surface fill.



Rows:



\* light mode: soft neutral/brand-tinted hover;

\* dark mode: slightly lighter surface.



Cards:



\* only interactive cards get hover treatment;

\* non-clickable cards must not look clickable.



\## 4.15 Disabled states



Disabled UI must be visibly disabled and not confusing.



Rules:



\* opacity reduction is allowed but not enough alone;

\* cursor should indicate disabled where appropriate;

\* explain why primary action is disabled when business-critical;

\* disabled submit buttons should have helper text if the missing requirement is not obvious.



\## 4.16 Loading states



Use skeletons for layout-preserving loading.



Rules:



\* dashboard cards: skeleton blocks;

\* tables: skeleton rows;

\* detail panels: skeleton sections;

\* buttons: spinner + label change;

\* avoid full-page blank loading when route shell can render.



Loading copy examples:



\* “Se încarcă oportunitățile…”

\* “Pregătim sumarul de control…”

\* “Se verifică accesul workspace-ului…”



\## 4.17 Empty states



Empty states must be useful. No generic “No data”.



Each empty state needs:



\* title;

\* short explanation;

\* next action;

\* optional secondary action;

\* no exaggerated illustration.



Examples:



\* “Nu există încă oportunități urmărite.”

\* “Adaugă prima oportunitate sau importă o listă pentru a începe să vezi valoarea potențial recuperabilă.”

\* Primary CTA: “Adaugă oportunitate”

\* Secondary CTA: “Importă listă”



\## 4.18 Error states



Error states must be calm and specific.



Rules:



\* explain what failed;

\* show recovery path;

\* do not expose internal stack traces;

\* do not show raw Supabase/Postgres errors to normal users;

\* preserve data entered in forms where possible.



Example:



\* “Nu am putut salva modificările.”

\* “Verifică conexiunea și încearcă din nou. Datele introduse au fost păstrate.”



\## 4.19 Success states



Success states should confirm action without being noisy.



Use toast or inline confirmation.



Examples:



\* “Oportunitatea a fost actualizată.”

\* “Next action salvat.”

\* “Draftul a fost pregătit pentru revizuire.”

\* “Contactul principal a fost schimbat.”



\## 4.20 Warning states



Warnings must be business-specific.



Bad:



\* “Warning”



Good:



\* “Această oportunitate nu are owner.”

\* “Follow-up-ul este întârziat cu 3 zile.”

\* “Valoarea estimată lipsește.”

\* “Contactul principal nu este setat.”



\## 4.21 Motion rules



Motion must communicate state, not decorate.



Allowed:



\* 120–180ms hover/focus transitions;

\* 180–240ms drawer/modal entrance;

\* subtle table row hover;

\* subtle chart reveal;

\* toast slide/fade;

\* command palette fade/scale.



Forbidden:



\* continuous animated backgrounds in the app;

\* excessive hero particle effects;

\* spinning decorative icons;

\* looping glows;

\* motion that delays task completion.



Respect reduced motion preferences.



\---



\# 5. Layout Rules



\## 5.1 App shell



The authenticated app must use a stable app shell:



\* left sidebar;

\* topbar or compact page-level header;

\* main content region;

\* optional right rail on detail/dashboard pages;

\* consistent spacing across all internal pages.



Desktop:



\* sidebar width: 240–272px;

\* collapsed sidebar optional: 72px;

\* content fills remaining width;

\* max content width only where useful. Tables and dashboards may use full available width.



Tablet:



\* sidebar can collapse;

\* topbar should include menu trigger;

\* right rail stacks below main content.



Mobile:



\* sidebar becomes drawer;

\* topbar remains sticky;

\* tables become responsive list/table hybrid;

\* primary actions remain accessible.



\## 5.2 Sidebar



Sidebar must feel like Linear/Attio: calm, compact, structured.



Sidebar content:



\* RN monogram + ReveNew wordmark;

\* workspace switcher or current business name;

\* primary nav;

\* secondary/admin nav;

\* bottom account/access area.



Primary nav order:



1\. Dashboard / Control Center

2\. Opportunities

3\. Reports

4\. Settings

5\. Help



If CRM has separate pages, include only if they exist and are useful:



\* Organizations

\* Contacts



Do not add fake nav items.



Sidebar item rules:



\* height: 36–40px;

\* icon: 18–20px;

\* text: 13–14px;

\* active state: brand-tinted surface + emerald left accent or strong text;

\* hover: subtle;

\* no colorful icon rainbow.



\## 5.3 Topbar



Topbar should provide context and actions, not duplicate the sidebar.



Possible topbar elements:



\* current page title or breadcrumb;

\* global search / command;

\* quick create;

\* access/workspace status;

\* user menu.



Keep it compact.



Height:



\* 56–64px desktop;

\* 52–60px mobile.



\## 5.4 Page header



Every page needs a consistent header.



Page header should include:



\* title;

\* one-sentence purpose;

\* primary action;

\* optional secondary action;

\* optional status/context.



Example:



Title: “Control Center”

Subtitle: “Prioritizează oportunitățile care pot recupera venit și urmărește acțiunile urgente.”

Primary CTA: “Adaugă oportunitate”

Secondary CTA: “Importă listă”



\## 5.5 Section header



Section headers must be compact.



Include:



\* section title;

\* optional count;

\* optional action;

\* optional filter.



Example:



“Acțiuni de făcut azi · 7”



\## 5.6 Content width



Landing:



\* content max width: 1120–1240px;

\* text blocks max width: 640–760px;

\* avoid full-width text paragraphs.



App:



\* dashboard/opportunities: use available width;

\* forms/settings: max width 760–920px;

\* details: 12-column layout with main + rail.



\## 5.7 Responsive behavior



\### Mobile



\* Never rely on hover.

\* Primary action should remain visible.

\* Use stacked cards for tables when columns cannot fit.

\* Keep opportunity value/status/next action visible.

\* Sidebar becomes drawer.

\* Avoid horizontal scroll except inside explicit table containers.



\### Tablet



\* Two-column layouts may collapse to one column.

\* KPI cards become 2x2 grid.

\* Detail right rail stacks below main content.



\### Desktop



\* Use density.

\* Keep key actions above the fold.

\* Use side rail for next action, owner, contact, risk, and audit summary.



\## 5.8 Dashboard grid



Dashboard structure:



1\. Executive summary / daily brief

2\. KPI cards

3\. Today’s next actions

4\. Urgent/stale opportunities

5\. Pipeline/attention overview

6\. Activity feed

7\. Optional reports snapshot



Do not put charts first unless they directly explain what to do.



\## 5.9 Table layout



Tables must be first-class components.



Rules:



\* sticky header where useful;

\* clear column labels;

\* visible status, owner, value, next action, deadline;

\* row hover;

\* compact row height;

\* sort and filter controls;

\* search input;

\* empty state;

\* no giant padded rows.



For opportunities table, required columns:



\* Opportunity / company

\* Status

\* Estimated value

\* Owner

\* Next action

\* Deadline

\* Attention/risk

\* Last activity



\## 5.10 CRM detail layout



Opportunity detail must use a structured command-page layout:



Top:



\* title;

\* company/contact;

\* status;

\* estimated value;

\* owner;

\* next action;

\* primary CTA.



Main left:



\* timeline;

\* actions;

\* notes/outcomes;

\* documents;

\* AI draft/suggestions if available.



Right rail:



\* owner;

\* primary contact;

\* organization;

\* value;

\* deadline;

\* status;

\* audit summary;

\* quick metadata.



\## 5.11 Sticky actions



Use sticky actions only when they reduce friction.



Opportunity detail should have a sticky bottom or side action area for:



\* save;

\* mark next action done;

\* add outcome;

\* generate/review draft;

\* mark sent;

\* change status.



Do not make every page sticky.



\## 5.12 Breadcrumbs



Use breadcrumbs only where hierarchy is deep.



Example:



Dashboard / Opportunities / \[Opportunity Name]



Do not overuse breadcrumbs on simple pages.



\---



\# 6. Component Specs



\## 6.1 Button



\### Purpose



Trigger actions clearly and consistently.



\### Variants



Primary:



\* used for main action on a page;

\* emerald/teal background;

\* white text;

\* strong hover/focus.



Secondary:



\* neutral surface;

\* border;

\* strong text;

\* used for alternatives.



Ghost:



\* transparent;

\* subtle hover;

\* used inside tables, cards, headers.



Danger:



\* red only for destructive actions;

\* require confirmation for destructive or security-sensitive actions.



\### Sizes



Small:



\* height 32px;

\* text 13px;

\* padding 10–12px.



Default:



\* height 40px;

\* text 14px;

\* padding 14–16px.



Large:



\* height 48px;

\* text 15px;

\* padding 18–22px.



\### Rules



\* One primary button per section.

\* Do not use primary buttons for every action.

\* Button text must be action-specific.

\* Avoid vague labels like “Submit”.

\* Use Romanian business copy.



Examples:



\* “Adaugă oportunitate”

\* “Salvează modificările”

\* “Revizuiește draftul”

\* “Activează planul”

\* “Exportă raportul”



\### Do not



\* use gradients on normal buttons;

\* use huge rounded pill buttons in the app;

\* use icon-only buttons without accessible labels;

\* hide destructive action consequences.



\## 6.2 Input



\### Purpose



Collect text/data with low friction.



\### Visual rules



\* height: 40–44px;

\* radius: 10px;

\* border: subtle;

\* background: surface;

\* focus: emerald ring;

\* label above input;

\* helper/error text below.



\### Text rules



Labels must be clear.



Examples:



\* “Nume companie”

\* “Valoare estimată”

\* “Telefon”

\* “Email contact”

\* “Următoarea acțiune”



\### Do not



\* rely only on placeholder as label;

\* use vague labels;

\* show raw validation errors.



\## 6.3 Select



\### Purpose



Choose from predefined states or owners.



\### Rules



\* Use for status, priority, owner, currency, category.

\* Use clear labels.

\* Keep option naming consistent.

\* Use searchable select only for large lists.



\### Status options must be business-readable



Examples:



\* “Nouă”

\* “În lucru”

\* “Așteaptă răspuns”

\* “Blocată”

\* “Câștigată”

\* “Pierdută”

\* “Arhivată”



\## 6.4 Textarea



\### Purpose



Capture notes, outcomes, instructions, or context.



\### Rules



\* min height: 96px;

\* max height reasonable;

\* preserve entered content on error;

\* use helper copy for what should be entered.



Example helper:

“Adaugă context util pentru următorul follow-up. Evită date sensibile inutile.”



\## 6.5 Search input



\### Purpose



Find opportunities, contacts, organizations, or records.



\### Rules



\* include search icon;

\* placeholder must say what is searchable;

\* support clear/reset action;

\* debounce if connected to backend;

\* do not block typing.



Example:

“Caută oportunități, companii sau contacte…”



\## 6.6 Badge



\### Purpose



Show category or small metadata.



\### Rules



\* small, compact;

\* text 11–12px;

\* medium weight;

\* neutral by default;

\* semantic color only when meaningful.



Examples:



\* “B2B”

\* “Follow-up”

\* “Audit”

\* “Draft”

\* “Importat”



\## 6.7 Status pill



\### Purpose



Show operational state.



\### Rules



\* always consistent per status;

\* never random colors;

\* must be readable in light and dark mode.



Recommended mapping:



\* New: neutral

\* Active / In progress: blue or emerald

\* Waiting response: amber

\* Blocked: red/amber

\* Won / Recovered: green

\* Lost: neutral/danger muted

\* Draft: neutral

\* Ready: blue

\* Sent: green/blue



\## 6.8 Card



\### Purpose



Group related information.



\### Visual rules



\* radius: 14–16px;

\* border: subtle;

\* background: surface;

\* padding: 16–24px;

\* no heavy shadows;

\* clear header and content.



\### Rules



\* Cards must have a purpose.

\* Avoid identical card layouts for unrelated data.

\* Use hierarchy: label → value → context → action.



\### Do not



\* create massive empty cards;

\* use card grids as page filler;

\* add decorative icons without meaning.



\## 6.9 KPI Card



\### Purpose



Show a key metric with context.



\### Required structure



\* label;

\* main value;

\* trend/status;

\* explanation;

\* optional action.



Example:



Label: “Valoare potențial recuperabilă”

Value: “€42.500”

Context: “12 oportunități active urmărite”

Status: “3 necesită acțiune azi”



\### Rules



\* Use currency labels.

\* Clarify whether value is estimated or recovered.

\* Avoid fake precision.

\* If data missing, show useful empty state.



\## 6.10 Table



\### Purpose



Scan, compare, and act on many records.



\### Rules



\* compact rows;

\* visible row hover;

\* clear sort;

\* filters above table;

\* bulk actions only if implemented safely;

\* row click opens detail page;

\* row actions in rightmost column.



\### Empty table



Must include:



\* what is missing;

\* why it matters;

\* primary action.



\### Do not



\* use huge cards instead of tables for dense opportunity lists;

\* hide important data behind hover;

\* make horizontal scroll the default desktop experience.



\## 6.11 Tabs



\### Purpose



Separate related views within the same context.



\### Rules



\* use for details pages or settings sections;

\* active tab must be clear;

\* avoid too many tabs;

\* keep labels short.



Examples:



\* “Overview”

\* “Acțiuni”

\* “Timeline”

\* “Documente”

\* “Audit”



For Romanian UI, prefer:



\* “Rezumat”

\* “Acțiuni”

\* “Timeline”

\* “Documente”

\* “Audit”



\## 6.12 Modal



\### Purpose



Focused temporary task.



\### Use for



\* confirm destructive action;

\* create small record;

\* update status;

\* add outcome;

\* quick edit.



\### Rules



\* max width: 480–720px depending on task;

\* clear title;

\* clear consequence;

\* primary and secondary action;

\* Escape/cancel support;

\* focus trap;

\* accessible labels.



\### Do not



\* use modal for complex multi-step flows;

\* bury important workflows inside tiny modals.



\## 6.13 Drawer



\### Purpose



Side-panel workflow without losing context.



\### Use for



\* quick opportunity preview;

\* contact details;

\* activity detail;

\* AI draft review;

\* filters.



\### Rules



\* width: 420–560px desktop;

\* full-screen on mobile;

\* clear close action;

\* sticky footer actions if form-based.



\## 6.14 Toast



\### Purpose



Confirm non-blocking action result.



\### Rules



\* top-right or bottom-right desktop;

\* bottom mobile;

\* concise Romanian copy;

\* auto-dismiss after 3–5s;

\* error toasts should not disappear too quickly.



Examples:



\* “Modificările au fost salvate.”

\* “Nu am putut actualiza oportunitatea.”

\* “Draftul a fost pregătit pentru revizuire.”



\## 6.15 Tooltip



\### Purpose



Explain compact UI only when necessary.



\### Rules



\* short;

\* no essential information only in tooltip;

\* accessible;

\* delay slightly;

\* avoid overuse.



\## 6.16 Timeline



\### Purpose



Show chronological history of an opportunity.



\### Required event row structure



\* event type icon;

\* event title;

\* actor;

\* timestamp;

\* short details;

\* optional linked record/document.



Examples:



\* “Next action actualizat”

\* “Email marcat ca trimis”

\* “Contact principal schimbat”

\* “Rezultat comercial adăugat”

\* “Valoare estimată modificată”



\### Rules



\* newest first by default for operational pages;

\* use filters only if timeline grows large;

\* avoid noisy low-value system events.



\## 6.17 Activity feed



\### Purpose



Show recent important work across workspace.



\### Rules



\* compact;

\* scannable;

\* include actor, object, action, time;

\* link to object;

\* prioritize meaningful changes.



\## 6.18 Empty state



\### Purpose



Guide the user when no data exists.



\### Rules



Every empty state must include:



\* title;

\* useful explanation;

\* primary action;

\* optional secondary action.



No generic illustrations unless they are subtle and premium.



\## 6.19 Pricing card



\### Purpose



Present pricing clearly and build trust.



\### Pricing to preserve



1\. Revenue Recovery Audit — 490 EUR, one-time payment.

2\. ReveNew Managed — 690 EUR/month.

3\. Custom Implementation — quote-based.



\### Rules



\* Do not imply guaranteed results.

\* Explain who each plan is for.

\* Include deliverables.

\* Include human control/security notes.

\* CTA must be clear.



\## 6.20 Stepper



\### Purpose



Guide onboarding or multi-step setup.



\### Rules



\* show progress;

\* one decision group per step;

\* clear save/continue action;

\* allow back navigation;

\* avoid long forms.



\## 6.21 Sidebar item



\### Purpose



Navigation.



\### Rules



\* compact;

\* clear active state;

\* no noisy badges unless important;

\* preserve keyboard navigation.



\## 6.22 Page header



\### Purpose



Orient the user.



\### Rules



\* title;

\* subtitle;

\* primary action;

\* optional secondary action;

\* optional metadata/status.



\## 6.23 Alert banner



\### Purpose



Call attention to important state.



\### Use for



\* missing plan/access;

\* incomplete onboarding;

\* missing owner;

\* overdue action;

\* security warning.



\### Rules



\* concise;

\* specific;

\* includes action;

\* avoid red unless critical.



\## 6.24 Command/search pattern



A command/search pattern is useful if the app has enough records.



Recommended global command actions:



\* search opportunities;

\* search contacts;

\* search organizations;

\* create opportunity;

\* go to dashboard;

\* go to reports;

\* go to settings.



Do not implement if it adds risk or complexity before core redesign is stable.



\## 6.25 Opportunity card



\### Purpose



Compactly represent one commercial opportunity.



\### Required content



\* opportunity/company name;

\* status;

\* estimated value;

\* owner;

\* next action;

\* due date/deadline;

\* attention/risk indicator;

\* last activity.



\### Rules



\* Must be actionable.

\* Must not hide next action.

\* Use in dashboard/urgent lists.

\* Table remains preferred for full list.



\## 6.26 Contact card



\### Purpose



Show a contact linked to opportunity or organization.



\### Required content



\* name;

\* role/title if available;

\* company;

\* email/phone if available;

\* primary contact marker;

\* last interaction if available.



\### Rules



\* Clearly mark primary contact.

\* Avoid exposing unnecessary personal data.

\* Keep compact.



\## 6.27 Organization card



\### Purpose



Show the company/account behind opportunities.



\### Required content



\* organization name;

\* industry/category if available;

\* number of active opportunities;

\* estimated value;

\* owner;

\* last activity.



\## 6.28 Report summary card



\### Purpose



Present executive-grade insight.



\### Required content



\* metric;

\* explanation;

\* implication;

\* recommended action.



Bad:

“€42.500”



Good:

“€42.500 valoare potențial recuperabilă, din care €18.000 este blocată în oportunități fără follow-up în ultimele 7 zile.”



\## 6.29 Audit event row



\### Purpose



Display secure operational changes.



\### Required content



\* event label;

\* actor;

\* timestamp;

\* changed object;

\* short before/after where useful.



Rules:



\* never expose secrets;

\* never show raw tokens;

\* keep factual;

\* show only what the user has permission to see.



\---



\# 7. Page-by-Page Redesign Instructions



\## 7.1 Landing Page



\### Goal



The landing page must make ReveNew look like a serious B2B revenue recovery company, not a generic AI SaaS.



It must explain:



\* what problem exists;

\* why businesses lose revenue;

\* how ReveNew creates control;

\* who it is for;

\* what the user receives;

\* why it is safe;

\* how pricing works;

\* what action to take.



\### Required structure



1\. Header

2\. Hero

3\. Problem statement

4\. Trust / fit strip

5\. How it works

6\. Who it is for

7\. What you receive

8\. Human control

9\. Security / privacy

10\. Pricing

11\. FAQ

12\. Final CTA

13\. Footer



\### Header



Header must be clean and premium.



Include:



\* RN monogram + ReveNew;

\* navigation links:



&#x20; \* “Cum funcționează”

&#x20; \* “Pentru cine”

&#x20; \* “Prețuri”

&#x20; \* “Securitate”

\* CTA:



&#x20; \* primary: “Solicită audit”

&#x20; \* secondary: “Intră în cont” if auth exists.



Header behavior:



\* sticky optional;

\* subtle background blur allowed only if refined;

\* no heavy shadow.



\### Hero



Hero must be direct, commercial, and mature.



Recommended headline:



“Recuperează controlul asupra oportunităților comerciale pierdute.”



Alternative:



“Transformă follow-up-ul pierdut în venit urmărit, prioritizat și controlat.”



Subheadline:



“ReveNew ajută echipele B2B să identifice oportunități nevalorificate, să stabilească ownership clar și să urmărească următoarea acțiune până la rezultat.”



Primary CTA:

“Solicită Revenue Recovery Audit”



Secondary CTA:

“Vezi cum funcționează”



Hero visual:



\* use product UI mockup;

\* show Control Center snapshot;

\* show opportunity cards, next actions, estimated value, owner, risk;

\* do not use abstract AI graphics as main visual.



\### Problem statement



Must explain the pain clearly.



Example section title:



“Venitul nu se pierde doar din lipsă de lead-uri. Se pierde din lipsă de urmărire.”



Content pillars:



\* follow-up întârziat;

\* oportunități fără owner;

\* statusuri neclare;

\* valoare estimată necunoscută;

\* lipsă de prioritate;

\* lipsă de auditabilitate;

\* management fără vizibilitate.



\### Trust / fit strip



Use a compact strip showing fit, not fake logos.



Examples:



\* “Pentru echipe comerciale B2B”

\* “Pentru owneri și manageri”

\* “Pentru consultanță și servicii”

\* “Pentru procese cu follow-up repetat”

\* “Pentru control uman și auditabilitate”



\### How it works



Use 3–4 steps.



Recommended:



1\. “Mapezi oportunitățile”



&#x20;  \* Introduci sau imporți oportunități comerciale, contacte și valoare estimată.



2\. “Clarifici ownership-ul”



&#x20;  \* Fiecare oportunitate primește owner, status, deadline și next action.



3\. “Prioritizezi ce contează”



&#x20;  \* ReveNew scoate în față oportunitățile urgente, blocate sau cu valoare ridicată.



4\. “Urmărești până la rezultat”



&#x20;  \* Timeline, documente, acțiuni și rezultate rămân vizibile și auditabile.



\### Who it is for



Use clear segments:



\* firme B2B cu ciclu comercial lung;

\* consultanță și servicii profesionale;

\* echipe comerciale mici/medii;

\* owneri care vor vizibilitate;

\* companii cu multe lead-uri și follow-up slab;

\* firme care pierd oportunități din lipsă de proces.



Avoid pretending it is for everyone.



\### What you receive



Explain concrete deliverables.



Possible cards:



\* Control Center pentru oportunități;

\* pipeline cu status și valoare;

\* next actions și deadline-uri;

\* ownership clar;

\* contacte și organizații;

\* timeline/audit;

\* rapoarte executive;

\* suport pentru drafturi și follow-up;

\* pricing/audit/managed plan.



\### Human control



Required section.



Message:



“ReveNew nu trimite acțiuni comerciale critice fără control uman.”



Explain:



\* AI can assist with drafts or summaries;

\* user reviews before sending;

\* actions remain traceable;

\* ownership remains human;

\* decisions remain under user control.



\### Security / privacy



Required section.



Message:



“Construit pentru date comerciale sensibile.”



Include:



\* Supabase auth;

\* protected routes;

\* RLS / business-level isolation concept;

\* no service role key in client;

\* minimal data principle;

\* audit-friendly workflows;

\* no unnecessary tracking.



Do not overclaim compliance certifications unless actually implemented.



\### Pricing



Preserve pricing:



\#### Revenue Recovery Audit



490 EUR · plată unică



For:



\* firms that want a structured review of lost/untracked opportunities.



Include:



\* opportunity mapping;

\* follow-up/process review;

\* revenue leakage snapshot;

\* recommended next actions.



CTA:

“Solicită audit”



\#### ReveNew Managed



690 EUR / lună



For:



\* firms that want ongoing revenue recovery operations.



Include:



\* managed opportunity tracking;

\* recurring review;

\* prioritization;

\* reporting;

\* workflow support.



CTA:

“Discută implementarea”



\#### Implementare personalizată



Ofertă



For:



\* teams with complex workflows, custom integrations, or multiple stakeholders.



CTA:

“Cere ofertă”



Pricing rule:

Do not mention guarantees.



\### FAQ



Recommended questions:



\* “Este ReveNew un CRM?”

\* “Ce înseamnă revenue recovery?”

\* “Trimite ReveNew emailuri automat?”

\* “Cine vede datele companiei?”

\* “Pentru cine este potrivit Revenue Recovery Audit?”

\* “Pot folosi ReveNew fără integrare complexă?”

\* “Ce se întâmplă după ce creez contul?”



\### Final CTA



Example:



“Începe cu oportunitățile pe care deja le ai.”



Subtext:



“ReveNew te ajută să vezi ce merită urmărit, cine răspunde și care este următoarea acțiune.”



CTA:

“Solicită audit”



\### Footer



Include:



\* ReveNew;

\* short positioning line;

\* navigation;

\* legal links if available;

\* contact/support if available.



\## 7.2 Login



\### Goal



Login must feel simple, secure, and premium.



\### Layout



\* centered card or two-column layout;

\* RN monogram;

\* short headline;

\* email/password form;

\* link to signup/access if appropriate;

\* subtle trust copy.



\### Copy examples



Title:

“Autentificare în ReveNew”



Subtitle:

“Accesează workspace-ul și urmărește oportunitățile comerciale active.”



Button:

“Intră în cont”



Error:

“Datele de autentificare nu sunt corecte. Verifică emailul și parola.”



\### Rules



\* no noisy marketing hero;

\* no generic AI illustrations;

\* preserve Supabase auth logic;

\* preserve protected route behavior.



\## 7.3 Signup



\### Goal



Signup must be clear and honest.



If commercial activation is required, do not imply immediate full access.



\### Copy examples



Title:

“Creează cont ReveNew”



Subtitle:

“După creare, poți configura workspace-ul. Accesul la funcțiile comerciale poate necesita activarea unui plan.”



Button:

“Creează cont”



Helper:

“Folosește emailul de business pentru o configurare corectă a workspace-ului.”



\### Rules



\* keep form short;

\* show what happens next;

\* no fake urgency;

\* no “start free forever” unless true.



\## 7.4 Access / Pricing Activation Page



\### Goal



This page must not feel like an error. It should feel like a professional access/billing state.



\### Required message



The user has an account, but no active plan/access.



\### Structure



1\. Clear page header

2\. Account/access status panel

3\. Pricing options

4\. What happens after activation

5\. Contact/support CTA

6\. Trust/security note



\### Copy example



Title:

“Cont creat. Accesul comercial trebuie activat.”



Subtitle:

“Workspace-ul există, dar funcțiile ReveNew sunt disponibile după alegerea unui plan sau după confirmarea implementării.”



Status card:

“Status acces: plan inactiv”



CTA:

“Alege planul potrivit”



\### Rules



\* do not show “unauthorized” as primary message;

\* do not make the user feel blocked without explanation;

\* no cold error UI;

\* pricing cards must look premium.



\## 7.5 Onboarding



\### Goal



Onboarding must guide setup without feeling like an administrative tax form.



\### Required flow



Recommended steps:



1\. Business basics



&#x20;  \* company name;

&#x20;  \* industry/category;

&#x20;  \* city/country if needed.



2\. Revenue workflow



&#x20;  \* sales cycle type;

&#x20;  \* opportunity source;

&#x20;  \* who handles follow-up.



3\. First opportunity



&#x20;  \* optional but recommended;

&#x20;  \* name/company;

&#x20;  \* estimated value;

&#x20;  \* owner;

&#x20;  \* next action.



4\. Review



&#x20;  \* show what will be created;

&#x20;  \* CTA to go to Control Center.



\### Rules



\* show step progress;

\* keep each screen focused;

\* use helper text;

\* do not show too many fields at once;

\* preserve validation;

\* use business Romanian.



\### Empty onboarding state



If user skips data:

“Poți completa datele mai târziu, dar ReveNew devine util când există cel puțin o oportunitate, un owner și o următoare acțiune.”



\## 7.6 Dashboard / Control Center



\### Goal



This is the most important overview page.



It must answer immediately:



\* what potential value exists;

\* what opportunities are urgent;

\* what must be done today;

\* what is blocked;

\* what progress exists;

\* where management must intervene.



\### Required layout



\#### Top summary



A premium executive brief panel.



Example:



Title:

“Control Center”



Summary copy:

“7 oportunități necesită acțiune, cu €18.400 valoare estimată blocată în follow-up întârziat.”



Include:



\* date range;

\* workspace/business;

\* primary CTA: “Adaugă oportunitate”

\* secondary CTA: “Vezi rapoarte”



\#### KPI cards



Required cards:



1\. Valoare potențial recuperabilă

2\. Oportunități active

3\. Acțiuni scadente azi

4\. Oportunități blocate / în atenție



Each KPI must include context.



Bad:

“42.500 EUR”



Good:

“€42.500 · 12 oportunități active · 3 fără follow-up în ultimele 7 zile”



\#### Today’s next actions



List opportunities requiring action today.



Each row/card:



\* opportunity name;

\* company/contact;

\* action;

\* due time/date;

\* owner;

\* estimated value;

\* CTA: “Deschide”



\#### Urgent opportunities



Show blocked/stale/high-value opportunities.



Sort by:



1\. overdue next action;

2\. high estimated value;

3\. blocked status;

4\. no owner;

5\. no recent activity.



\#### Pipeline / attention model



Show status distribution.



Could be:



\* compact segmented bar;

\* small cards by status;

\* attention buckets.



Buckets:



\* “Urgent”

\* “În lucru”

\* “Așteaptă răspuns”

\* “Blocate”

\* “Fără owner”

\* “Fără next action”



\#### Activity feed



Show recent meaningful actions.



Examples:



\* “David a actualizat next action pentru ABC Consulting.”

\* “Oportunitatea X a fost marcată ca blocată.”

\* “Draft follow-up pregătit pentru revizuire.”

\* “Contact principal schimbat.”



\#### Executive summary



Optional but recommended.



Short insight:



“Cea mai mare problemă în acest moment este follow-up-ul întârziat: 5 oportunități active nu au activitate recentă.”



\### Do not



\* put random charts at the top;

\* create generic sales KPIs unrelated to action;

\* hide next actions;

\* waste the first screen with welcome text.



\## 7.7 Opportunities List



\### Goal



This page must be a powerful, dense, clean operating table.



\### Required features



\* search;

\* filters;

\* sorting;

\* clear status;

\* value;

\* owner;

\* next action;

\* deadline;

\* risk/attention;

\* last activity;

\* create/import action.



\### Header



Title:

“Oportunități”



Subtitle:

“Urmărește valoarea, ownership-ul și următoarea acțiune pentru fiecare oportunitate comercială.”



CTA:

“Adaugă oportunitate”



Secondary:

“Importă listă” if implemented.



\### Filters



Recommended:



\* status;

\* owner;

\* attention/risk;

\* due date;

\* value range;

\* source/category;

\* has next action;

\* has owner.



\### Table columns



Required:



\* Opportunity / company

\* Status

\* Estimated value

\* Owner

\* Next action

\* Deadline

\* Attention

\* Last activity

\* Actions



\### Row behavior



\* click row opens detail page;

\* action menu for quick updates;

\* status pill visible;

\* overdue action highlighted;

\* no owner shown as warning.



\### Empty state



Title:

“Nu există oportunități urmărite.”



Body:

“Adaugă prima oportunitate pentru a vedea valoarea potențial recuperabilă, owner-ul și următoarea acțiune.”



CTA:

“Adaugă oportunitate”



\## 7.8 Opportunity Detail / Workflow



\### Goal



This is the most important product page. It must feel like a command page for one commercial opportunity.



\### Required layout



\#### Header



Include:



\* opportunity name;

\* organization/contact;

\* status pill;

\* estimated value;

\* owner;

\* next action;

\* primary CTA.



Example primary CTAs based on state:



\* “Marchează acțiunea ca făcută”

\* “Adaugă rezultat”

\* “Pregătește follow-up”

\* “Actualizează status”



\#### Summary strip



Show compact key fields:



\* estimated value;

\* status;

\* owner;

\* next action;

\* due date;

\* attention/risk;

\* last activity.



\#### Main content



Sections:



1\. Timeline

2\. Actions / next steps

3\. Contacts

4\. Organization

5\. Documents

6\. Notes / outcomes

7\. AI assistance if present

8\. Audit trail



\#### Right rail



Sticky on desktop.



Include:



\* owner card;

\* primary contact card;

\* organization card;

\* opportunity metadata;

\* risk/attention state;

\* last updated;

\* quick actions.



\### Timeline



Must show meaningful events:



\* created;

\* status changed;

\* owner changed;

\* next action updated;

\* draft generated;

\* email marked sent;

\* outcome added;

\* value changed;

\* document added;

\* contact changed.



\### AI assistance



AI must be positioned as controlled assistance.



Labels:



\* “Sugestie AI”

\* “Draft pentru revizuire”

\* “Necesită aprobare”

\* “Aprobat de utilizator”



Rules:



\* never hide human approval;

\* never make AI action primary unless user is reviewing;

\* generated copy should be editable.



\### Documents



Documents must show:



\* title;

\* type;

\* status;

\* last updated;

\* action.



Document statuses:



\* Draft

\* Editat

\* Pregătit

\* Trimis

\* Arhivat



\### Notes/outcomes



Outcomes should be structured.



Recommended fields:



\* outcome type;

\* summary;

\* next action;

\* date;

\* owner.



\### Do not



\* make the page look like a generic form;

\* bury next action below the fold;

\* hide contacts;

\* hide audit trail;

\* use decorative panels without operational value.



\## 7.9 Reports



\### Goal



Reports must feel executive-grade.



This page is for management, not data entry.



\### Required sections



1\. Executive summary

2\. Recovered / potential value

3\. Active opportunities

4\. Stale opportunities

5\. Outcomes

6\. Owner/team performance if data supports it

7\. Export

8\. Methodology/context note



\### Executive summary



Must be written like a management brief.



Example:



“În perioada selectată, ReveNew urmărește €42.500 valoare potențial recuperabilă. Principala zonă de risc este follow-up-ul întârziat: 5 oportunități active nu au avut activitate în ultimele 7 zile.”



\### Charts



Use moderate charts only.



Allowed:



\* trend line;

\* status distribution;

\* owner workload;

\* value by status;

\* stale opportunities by age.



Avoid:



\* pie charts unless very clear;

\* decorative charts;

\* fake analytics;

\* overcomplicated dashboards.



\### Export



If implemented, export action should be clear:



\* “Exportă PDF”

\* “Exportă CSV”

\* “Descarcă raport”



Do not show export buttons that do not work.



\## 7.10 Settings



\### Goal



Settings must feel secure, ordered, and boring in the best possible way.



\### Required structure



Settings should be grouped:



1\. Profile

2\. Workspace

3\. Business

4\. Team / access if implemented

5\. Integrations

6\. Billing / access

7\. Security

8\. Audit / debug only where appropriate



\### Visual rules



\* clean sidebar or tabbed settings layout;

\* forms with clear labels;

\* save/cancel actions;

\* danger zone separated;

\* no dashboard-style cards unless useful.



\### Security



Security settings must be explicit and careful.



Never expose:



\* service role keys;

\* API secrets;

\* raw env values;

\* internal tokens.



If showing integration state:



\* show connected/not connected;

\* mask sensitive data;

\* explain what data is used.



\## 7.11 Help



\### Goal



Help must answer real user questions.



\### Structure



Sections:



\* Getting started

\* Opportunities

\* Next actions

\* Reports

\* Access/pricing

\* Security/privacy

\* Contact support



\### Rules



\* concise;

\* searchable if content grows;

\* no generic filler text;

\* write in Romanian business language.



\---



\# 8. Copywriting Direction



\## 8.1 Language



All user-facing copy must be in Romanian business language.



Tone:



\* clear;

\* mature;

\* direct;

\* professional;

\* calm;

\* specific.



Avoid:



\* “revoluționar”;

\* “garantat”;

\* “magic”;

\* “supercharge”;

\* “unlock”;

\* “AI-powered future”;

\* “crește exponențial”;

\* “automatizează tot”;

\* fake urgency;

\* vague claims.



\## 8.2 Core vocabulary



Use:



\* venit recuperabil;

\* oportunități comerciale;

\* follow-up;

\* ownership;

\* următoarea acțiune;

\* valoare estimată;

\* control uman;

\* auditabilitate;

\* pipeline;

\* risc;

\* prioritate;

\* acțiuni scadente;

\* rezultate comerciale;

\* workspace;

\* acces activ;

\* raport executive.



\## 8.3 Hero copy examples



Option 1:



“Recuperează controlul asupra oportunităților comerciale pierdute.”



“ReveNew ajută echipele B2B să identifice, prioritizeze și urmărească oportunitățile nevalorificate, cu owner clar, next action și control uman.”



Option 2:



“Venitul pierdut începe cu follow-up-ul uitat.”



“ReveNew transformă oportunitățile neclare într-un proces urmărit: valoare estimată, responsabil, deadline, istoric și rezultat.”



Option 3:



“Un Control Center pentru venitul care scapă printre procese.”



“Vezi ce oportunități contează, cine răspunde, ce trebuie făcut azi și unde trebuie intervenit.”



\## 8.4 Dashboard copy examples



Daily brief:

“3 oportunități necesită acțiune azi. Valoarea estimată aflată în atenție este de €18.400.”



Empty:

“Nu există încă acțiuni scadente. Adaugă next actions pentru oportunitățile active ca să poți urmări ce trebuie făcut.”



Warning:

“5 oportunități nu au owner. Fără ownership, follow-up-ul nu poate fi controlat.”



\## 8.5 Empty state copy examples



Opportunities:

“Nu există oportunități urmărite.”

“Adaugă prima oportunitate pentru a vedea valoarea estimată, responsabilul și următoarea acțiune.”



Reports:

“Nu există suficiente date pentru raport.”

“Rapoartele devin utile după ce există oportunități, acțiuni și rezultate comerciale înregistrate.”



Contacts:

“Nu există contacte asociate.”

“Adaugă un contact principal pentru ca follow-up-ul să fie clar și ușor de urmărit.”



\## 8.6 Access page copy examples



Title:

“Cont creat. Accesul comercial trebuie activat.”



Body:

“Poți folosi contul pentru configurare, dar funcțiile ReveNew sunt disponibile după activarea unui plan sau după confirmarea implementării.”



CTA:

“Activează accesul”



Secondary:

“Discută cu echipa ReveNew”



\## 8.7 Pricing copy examples



Revenue Recovery Audit:

“O analiză structurată a oportunităților comerciale pierdute sau nevalorificate.”



ReveNew Managed:

“Urmărire lunară a oportunităților, prioritizare, ownership și raportare.”



Custom Implementation:

“Pentru echipe cu fluxuri comerciale complexe, date distribuite sau cerințe speciale de integrare.”



\## 8.8 Opportunity detail copy examples



Next action:

“Următoarea acțiune”



No next action:

“Nu există următoare acțiune setată.”



CTA:

“Setează next action”



Audit:

“Istoric oportunitate”



AI draft:

“Draft pregătit pentru revizuire”



Approval:

“Revizuiește înainte de trimitere”



\---



\# 9. Implementation Plan for Codex



\## 9.1 Critical instruction



Do not perform a blind rewrite. The redesign must preserve existing business logic, authentication, Supabase integration, RLS assumptions, protected routes, and existing features.



This is a UI/design-system refactor, not a product logic replacement.



\## 9.2 Files and areas to inspect first



Codex must inspect the repository before editing.



Start with:



\* `package.json`

\* `tailwind.config.ts`

\* `postcss.config.\*`

\* `src/app/\*\*/\*`

\* `src/components/\*\*/\*`

\* `src/lib/\*\*/\*`

\* `src/styles/\*\*/\*` or global CSS file

\* `src/app/globals.css` if present

\* auth-related routes/components

\* Supabase client/server utilities

\* dashboard page

\* opportunities list page

\* opportunity detail page

\* landing page

\* access/pricing page

\* onboarding page

\* reports page

\* settings page

\* login/signup pages

\* shared layout/app shell components

\* tests in `tests/\*`

\* validation scripts in `scripts/validation/\*`



\## 9.3 Phase 1 — Visual audit and UI architecture inventory



Before changing UI, Codex must produce an internal implementation note identifying:



\* all current pages;

\* all shared components;

\* current design tokens;

\* repeated styling patterns;

\* current app shell structure;

\* current auth/protected route structure;

\* current loading/error/empty states;

\* obvious UI inconsistencies;

\* components that should be refactored first.



Do not modify database schema in this phase.



\## 9.4 Phase 2 — Design tokens and global components



Implement or refine a centralized design system.



Tasks:



1\. Update Tailwind theme tokens carefully.

2\. Preserve existing `ink`, `mint`, and premium direction where useful.

3\. Add semantic tokens for:



&#x20;  \* background;

&#x20;  \* surface;

&#x20;  \* border;

&#x20;  \* text;

&#x20;  \* brand;

&#x20;  \* success;

&#x20;  \* warning;

&#x20;  \* danger;

&#x20;  \* info.

4\. Create or refactor shared UI components:



&#x20;  \* Button;

&#x20;  \* Input;

&#x20;  \* Select;

&#x20;  \* Textarea;

&#x20;  \* Badge;

&#x20;  \* StatusPill;

&#x20;  \* Card;

&#x20;  \* Table;

&#x20;  \* PageHeader;

&#x20;  \* EmptyState;

&#x20;  \* AlertBanner;

&#x20;  \* Toast if existing;

&#x20;  \* Modal/Drawer if existing.

5\. Ensure all components support light and dark variants if the app supports theme mode.

6\. Do not add a heavy UI library unless absolutely necessary.



\## 9.5 Phase 3 — App shell, sidebar, topbar



Refactor the authenticated app shell.



Tasks:



\* create consistent sidebar;

\* create consistent topbar/page header behavior;

\* ensure protected pages share layout;

\* improve navigation hierarchy;

\* keep workspace/business context visible;

\* keep account/access status clear;

\* make mobile sidebar a drawer if needed.



Do not break routing.



\## 9.6 Phase 4 — Dashboard / Control Center



Redesign this first among product pages.



Tasks:



\* create executive daily brief;

\* create KPI cards with context;

\* create today’s next actions section;

\* create urgent/stale opportunities section;

\* create attention/pipeline overview;

\* create activity feed;

\* create empty states;

\* ensure all values are clearly labeled and not overclaimed.



Acceptance for this phase:



\* A user knows what to do within 10 seconds.

\* Urgent opportunities are visible above the fold.

\* Next actions are visible.

\* Potential value is contextualized.

\* UI looks premium, not generic.



\## 9.7 Phase 5 — Opportunities list/detail



Redesign the opportunity operating system.



\### Opportunities list tasks



\* refine table layout;

\* add/clean filters;

\* ensure status/owner/value/next action/deadline are visible;

\* improve empty/loading/error states;

\* improve row actions;

\* ensure responsive behavior.



\### Opportunity detail tasks



\* redesign header;

\* add summary strip;

\* structure main content + right rail;

\* improve timeline;

\* improve contacts/organization panels;

\* improve documents/actions/outcomes;

\* improve AI assistance area if present;

\* preserve all existing workflows.



Acceptance for this phase:



\* Opportunity detail feels like the core product page.

\* Next action is impossible to miss.

\* Owner/contact/value/status are visible.

\* Timeline/audit is understandable.

\* No business logic is broken.



\## 9.8 Phase 6 — Landing / Access / Pricing



Redesign public/commercial pages.



\### Landing tasks



\* implement required section order;

\* write Romanian premium business copy;

\* use product-focused visuals;

\* add human control and security sections;

\* refine pricing;

\* remove hype;

\* ensure mobile polish.



\### Access/pricing activation tasks



\* make it feel like account/access state, not error;

\* show plan options clearly;

\* explain next step;

\* preserve auth/access logic.



Acceptance:



\* Landing looks like a serious B2B SaaS company.

\* Pricing is clear.

\* Access page does not feel broken.

\* No fake claims are introduced.



\## 9.9 Phase 7 — Onboarding / Reports / Settings / Help



\### Onboarding



\* step-based;

\* fewer fields per screen;

\* clearer helper text;

\* business value orientation.



\### Reports



\* executive summary;

\* financial metric hierarchy;

\* moderate charts;

\* export area;

\* clear empty state.



\### Settings



\* organized settings sections;

\* security-conscious;

\* no exposed secrets;

\* no debug noise in normal views.



\### Help



\* clean FAQ/help structure;

\* practical Romanian copy.



\## 9.10 Phase 8 — Responsive, polish, accessibility, QA



Tasks:



\* test desktop, tablet, mobile;

\* test light/dark if implemented;

\* test keyboard navigation;

\* test focus states;

\* test loading states;

\* test empty states;

\* test auth flows;

\* test protected routes;

\* test opportunity workflows;

\* test reports/settings/access;

\* run validation commands.



Required commands, if available in current repo:



\* `npm run typecheck`

\* `npm run lint`

\* `npm test`

\* `npm run validate:migrations`

\* `npm run validate:security`

\* `npm run build`

\* `npm run validate:diff`

\* `npm run validate`



If full validation is too slow during iteration, run targeted checks first, then full validation before final delivery.



\## 9.11 Implementation safety rules



Codex must not:



\* change business logic unless directly required by UI;

\* change database schema for styling;

\* weaken RLS;

\* expose service role keys;

\* move server-side operations into client components;

\* add unnecessary dependencies;

\* delete tests;

\* silence TypeScript errors with `any` unless unavoidable and justified;

\* remove validation scripts;

\* break existing auth/session behavior;

\* hardcode demo data into production flows;

\* introduce fake customer logos or claims.



\---



\# 10. Acceptance Criteria



The redesign is complete only when all criteria below are met.



\## 10.1 Product coherence



\* All priority pages use the same visual system.

\* No obvious old UI remains mixed with new UI.

\* Navigation is consistent.

\* Page headers are consistent.

\* Cards, tables, buttons, badges, and forms follow the design system.

\* Copy tone is consistently premium Romanian business.



\## 10.2 Dashboard clarity



\* Dashboard answers what must be done today.

\* Urgent/stale opportunities are visible.

\* Potential revenue is contextualized.

\* Next actions are visible.

\* Owner/ownership problems are visible.

\* Activity feed is useful.



\## 10.3 Opportunity management usefulness



\* Opportunity list is dense, readable, filterable, and useful.

\* Opportunity detail shows status, value, owner, next action, contact, timeline, documents, and audit.

\* Workflow actions remain functional.

\* AI assistance, if present, remains human-controlled.



\## 10.4 Landing credibility



\* Landing page looks premium and serious.

\* Hero clearly explains the product.

\* Problem section is specific.

\* Pricing is clear.

\* Security/privacy is present.

\* No false guarantees or hype claims exist.

\* CTA flow is clear.



\## 10.5 Access and onboarding



\* Access page explains inactive plan state clearly.

\* Pricing activation is not presented as an error.

\* Onboarding is guided and not overwhelming.

\* Login/signup are premium and simple.



\## 10.6 Reports and settings



\* Reports feel executive-grade.

\* Reports distinguish potential/recovered/active/stale values.

\* Settings are organized and secure.

\* Integrations/security areas do not expose secrets.

\* Debug/audit areas are separated from normal user settings.



\## 10.7 Responsive



\* Mobile layout is usable.

\* Sidebar works on mobile.

\* Tables degrade gracefully.

\* Primary actions remain accessible.

\* No horizontal overflow except intentional table containers.



\## 10.8 Accessibility



\* Keyboard focus is visible.

\* Buttons and icon buttons have accessible labels.

\* Forms have labels.

\* Contrast is sufficient.

\* Motion respects reduced-motion preference.

\* Errors are readable and specific.



\## 10.9 Security and functionality



\* Supabase auth still works.

\* Protected routes still work.

\* RLS assumptions remain untouched unless explicitly required.

\* No API keys are exposed in frontend.

\* Service role key is never used in client code.

\* Business/workspace data isolation remains intact.

\* Existing tests and validation scripts pass.



\---



\# 11. Security Constraints



Security is non-negotiable.



\## 11.1 Do not touch RLS unnecessarily



Do not modify Row Level Security policies for design changes. If a UI feature requires policy change, stop and justify it explicitly before implementation.



\## 11.2 Never expose service role keys



Service role keys must never appear in:



\* client components;

\* browser bundles;

\* public env variables;

\* UI;

\* logs;

\* error messages.



\## 11.3 Do not move server-side operations into client



Operations involving privileged data, workspace-level access, secure mutations, AI calls, email sending, or business-sensitive records must remain server-side where currently designed.



\## 11.4 Preserve Supabase auth



Do not break:



\* signup;

\* login;

\* logout;

\* session recovery;

\* protected routes;

\* middleware;

\* server/client Supabase separation.



\## 11.5 Preserve data isolation



All workspace/business data must remain isolated between businesses/users according to existing authorization design.



\## 11.6 Privacy/security by design



Rules:



\* collect only necessary data;

\* do not add unnecessary trackers;

\* do not add analytics scripts without explicit approval;

\* do not expose raw internal IDs when not useful;

\* do not show sensitive debug data to normal users;

\* mask sensitive integration details.



\## 11.7 No database schema changes for styling



Do not modify the database schema for visual redesign unless there is a legitimate product requirement and it is explicitly justified.



\## 11.8 No risky autonomous actions



Do not introduce UI that implies:



\* automatic sending without approval;

\* autonomous business decisions;

\* invisible AI actions;

\* guaranteed revenue recovery.



All risky actions require human review and clear state.



\---



\# 12. Anti-Patterns



Do not implement any of the following.



\## 12.1 Generic AI SaaS look



Avoid:



\* purple-blue gradient background;

\* floating AI orbs;

\* glowing abstract dashboard;

\* “AI-powered growth engine” language;

\* meaningless animated waves.



\## 12.2 Decorative dashboard



Avoid:



\* charts with no decision value;

\* card grids with random metrics;

\* huge welcome card above critical actions;

\* hiding next actions;

\* dashboard that does not say what to do.



\## 12.3 Template clone



Aura templates are references, not source of truth. Do not copy:



\* exact colors;

\* exact layout blindly;

\* irrelevant sections;

\* investment/wealth positioning;

\* fake template content.



\## 12.4 Over-polished landing, weak app



The app must be at least as polished as the landing page. ReveNew is a product, not just a marketing site.



\## 12.5 Uncontrolled density



Avoid both extremes:



\* too much whitespace in tables;

\* cramped unreadable rows.



The app should be compact but calm.



\---



\# 13. Reference Usage



\## 13.1 Aura Wealth Management Template



Use for:



\* premium finance maturity;

\* refined cards;

\* business landing feel;

\* spacing;

\* restrained contrast;

\* polished financial confidence.



Do not use for:



\* investment positioning;

\* wealth management language;

\* portfolio features;

\* consumer finance metaphors.



\## 13.2 Aura SaaS Dashboard Admin Template



Use for:



\* app shell;

\* sidebar;

\* header;

\* KPI grid;

\* table structure;

\* admin SaaS clarity.



Do not use for:



\* generic SaaS metrics;

\* irrelevant subscriber/churn dashboards;

\* generic iconography;

\* copy-paste UI.



\## 13.3 Aura Revenue Infrastructure Landing Page



Use for:



\* enterprise B2B landing structure;

\* revenue infrastructure narrative;

\* trust;

\* product storytelling;

\* analytics/security/control sections.



Do not overuse:



\* WebGL/animated backgrounds;

\* futuristic visuals;

\* overly dark landing if light-first direction is stronger.



\## 13.4 Aura SaaS Revenue Optimization Landing Page



Use for:



\* revenue leak messaging;

\* audit positioning;

\* pricing clarity;

\* conversion structure;

\* problem-agitation framework.



Do not use:



\* aggressive guarantee language;

\* CRO consultant clichés;

\* exaggerated ROI proof.



\## 13.5 Aura Operations Dashboard



Use for:



\* daily operations;

\* alerts;

\* activity feed;

\* urgent actions;

\* “what needs attention” command center.



Translate its logic into:



\* opportunities;

\* next actions;

\* blocked follow-up;

\* owner;

\* revenue potential.



\## 13.6 Aura Executive Dashboard



Use for:



\* reports;

\* owner/manager view;

\* executive summary;

\* export-oriented reporting;

\* leadership-level financial overview.



\## 13.7 Aura Financial Research Dashboard



Use for:



\* data density;

\* financial insight cards;

\* analytical hierarchy;

\* report previews;

\* high-contrast financial panels.



Do not use for:



\* market data/trading metaphors;

\* irrelevant investment analytics.



\## 13.8 Aura Admin Settings Dashboard



Use for:



\* settings organization;

\* profile/security panels;

\* audit logs;

\* integration configuration;

\* calm back-office design.



\---



\# 14. Final Codex Instruction



When implementing this redesign, optimize for durable product quality over quick cosmetic changes.



Priority order:



1\. Preserve security and functionality.

2\. Establish design tokens and shared components.

3\. Redesign the app shell.

4\. Make Dashboard / Control Center operationally clear.

5\. Make Opportunities list/detail excellent.

6\. Make Landing / Access / Pricing credible.

7\. Polish Onboarding / Reports / Settings / Help.

8\. Validate responsive, accessibility, auth, and security.



If a proposed design change makes the product prettier but less useful, reject it.



If a proposed implementation risks auth, RLS, Supabase isolation, API security, or existing business logic, reject it.



If a page looks good in isolation but does not match the rest of ReveNew, refactor it until it belongs to the same product.



The final result must feel like a serious revenue recovery SaaS with a premium, calm, enterprise-grade interface.



