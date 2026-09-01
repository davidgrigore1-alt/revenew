# ReveNew A4 design system

## Purpose

A4 is the durable visual operating system for ReveNew's authenticated product. It supports fast commercial decisions with restrained hierarchy, clear authority and truthful financial language. It is not a component-theme layer and does not replace product semantics.

The current design remains Romanian-first, operational and evidence-led. Prepared and Approvals are quality benchmarks; shared refinements may improve them, but a page may not acquire new behavior through visual work.

## Core principles

1. Content establishes hierarchy before containers do.
2. Use page canvas, subtle grouping, working surface and floating surface in that order.
3. Prefer alignment, type, spacing and separators over nested cards or decorative shadows.
4. Interaction blue identifies navigation, selection, links and focus. Champagne identifies ReveNew intelligence or an explicitly approved workspace accent. Semantic colors communicate state only.
5. Estimated value, recoverable value and confirmed revenue remain visibly distinct.
6. Prepared, approved and executed remain visibly distinct.

## Tokens

The canonical implementation is `src/app/globals.css`, consumed through `tailwind.config.ts`.

### Typography

| Role | Token / class | Use |
| --- | --- | --- |
| Page title | `--font-size-page-heading`, `text-page-heading` | One route-level heading |
| Section title | `--font-size-section-title` or compact `text-sm font-semibold` | Major page regions |
| Body | `--font-size-body` | Default product copy |
| Compact body | `--font-size-label`, `text-label` | Rows and operational controls |
| Label | `--font-size-label` | Field and filter labels |
| Metadata | `--font-size-metadata`, `text-metadata` | Dates, provenance and counts |
| Micro | `--font-size-micro`, `text-micro` | Rare secondary annotations |

Use sentence case. Page titles are short. Financial values use tabular numerals. Do not shrink global typography to create density.

### Spacing and layout

The 4px scale `--space-1` through `--space-24` is canonical. Product pages use `--page-gutter`, a standard content axis (`--content-axis`) and an expanded working axis (`--workspace-axis`). Sections use `app-section-stack`; dense relationships use separators rather than repeated card margins.

At desktop sizes, page gutters increase without changing the reading axis. A master-detail workspace may use the expanded axis. At mobile sizes, preserve DOM order and natural flow.

### Density

- Comfortable: `--row-height-comfortable`; forms, explanatory details and touch surfaces.
- Compact operational: `--row-height-compact`; queues, navigation and data lists.

Compact density reduces vertical padding, not type size or target clarity. Interactive targets remain at least 36px in dense desktop controls and 44px where touch is primary.

### Surfaces and elevation

| Level | Token / primitive | Contract |
| --- | --- | --- |
| Canvas | `--background` | Route background; never a card |
| Subtle grouping | `--surface-subtle` / `product-grouping-surface` | Groups related controls or supporting context |
| Working | `--surface` / `product-work-surface` | Primary decision surface |
| Floating | `--surface-floating` / `product-floating-surface` | Menus, dialogs and popovers only |

Default surfaces use one-pixel borders. Decorative shadows are near-zero; stronger elevation is reserved for content that actually floats above the page.

### Borders and radius

Use `--border-subtle` for internal division, `--border` for containment, `--border-strong` for floating boundaries and `--interaction-border` for selected controls. Focus uses `--focus-ring` and never relies on color fill alone.

Use `--radius-control`, `--radius-panel` and `--radius-overlay`. Pill radius is limited to status labels and compact categorical states.

### Color roles

- Neutral foundation: canvas, surfaces, text and borders.
- Interaction blue: focus, links, selected navigation and active filters.
- Champagne intelligence: generated analysis, intelligence provenance and deliberately branded moments.
- Success: confirmed or completed state only.
- Warning: pending, attention or time risk.
- Danger: destructive action, rejection or critical failure.

Never use semantic colors decoratively. Every state must retain a text label.

### Motion

Use `--motion-feedback` for hover/selection, `--motion-reveal` for small disclosure, `--motion-panel` for drawers and `--motion-page` for route content. Default easing is `--ease-standard`. Avoid layout animation, parallax and perpetual motion. `prefers-reduced-motion` disables non-essential motion.

## Component contracts

### Headers and toolbars

`PageHeader` owns route identity, description and optional actions. `SectionHeader` owns a content region. Toolbars align filters and actions without introducing a new card. One page should not repeat workspace identity already shown by the shell.

Header actions wrap within the page axis and use the full available width on mobile before returning to intrinsic width on desktop. Long labels may wrap as a group but must never create page-level horizontal overflow.

### Status and interaction

`StatusPill` communicates persisted state. `SegmentedFilter` is for a small mutually exclusive view/filter set; it uses a group label, `aria-pressed` and an interaction-blue selected state. It is not navigation unless the URL changes.

### Lists and tables

Structured lists use consistent compact rows, separators, a stable primary column and quiet metadata. Selection uses background plus an inset interaction marker. Tables need a meaningful caption or accessible label, real headers and horizontal overflow at small widths. Do not add a table library unless sorting, selection, virtualization or column management is real product behavior.

Summary bars distribute only the facts that exist; they must not reserve empty desktop columns. Numeric and monetary table columns align right with tabular numerals, while identity and narrative columns align left.

### Master-detail

The collection precedes detail in DOM order. Selection is keyboard reachable, explicitly announced and linked to its detail with ARIA. The queue and detail may scroll independently only after content exceeds a sensible available-height maximum. Short content must remain content-driven.

### Forms

Labels remain visible. Helper and error text are adjacent to their control and errors are not color-only. Destructive actions are visually separated. Read-only state must not resemble an editable control.

### Dialogs, drawers and disclosures

Dialogs and drawers require labelled semantics, initial focus, contained keyboard focus, Escape handling, scroll containment and focus restoration. A drawer is navigation or supporting context, not a substitute for page structure. Disclosures are closed by default unless immediate visibility is required for the page's primary job.

Overlays retain a small mobile viewport inset, expand that inset on larger screens and place overflow inside the dialog or drawer. Arbitrary overlay radii are replaced by the canonical overlay radius.

### Evidence and intelligence

Evidence sections show provenance, authorized scope and honest absence. Intelligence blocks use the champagne role sparingly and remain distinct from confirmed outcomes. Generated recommendations never inherit success styling.

### Empty, loading and error states

Reuse `CompactEmptyState`, `Skeleton` and `ErrorState`. State copy explains what is known, what is unavailable and the next safe action. Never insert demo facts to make a state look complete.

## Responsive rules

- Primary QA: 1440×900. The page title, current work and next safe action should be visible without decorative dead space.
- 1280 desktop: preserve the master-detail relationship and compact shell.
- Tablet: shell becomes a drawer; working surfaces may stack while keeping list before detail.
- Mobile: bottom navigation exposes only the established primary shortcuts; all destinations remain in the drawer. Use natural document flow and touch-sized controls.

Do not reorder meaning with CSS. Truncation requires a discoverable title or a nearby full-value view.

## Accessibility baseline

Use semantic landmarks and headings, one clear `h1`, visible focus, keyboard-complete controls, labelled icon buttons, announced selection/state changes, sufficient contrast and reduced-motion support. A visual refactor must preserve existing focus traps, focus restoration and server/client boundaries.
