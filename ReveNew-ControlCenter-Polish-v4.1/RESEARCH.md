# Design research and implementation decisions

This package deliberately does **not** install a new UI library.

## Why

The current ReveNew Control Center already has:
- native disclosure semantics;
- keyboard-accessible `<details>/<summary>` behavior;
- established design tokens;
- a stable light/dark theme system;
- working charts and master-detail behavior.

Replacing those foundations just to polish four surfaces would add dependency and regression risk without proportional UX value.

## References used

### WAI-ARIA Authoring Practices — Disclosure / Accordion
- https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
- https://www.w3.org/WAI/ARIA/apg/patterns/accordion/

Takeaway:
the header should be the obvious control, expose a clear expanded state, and remain operable with Enter/Space. ReveNew keeps native disclosure semantics rather than rebuilding them with decorative divs.

### Radix UI Accordion
- https://www.radix-ui.com/primitives/docs/components/accordion

Takeaway:
Radix is a good future primitive if ReveNew eventually needs coordinated multi-panel accordion state or richer arrow-key navigation. It is not necessary for this targeted pass.

### Carbon Design System — dashboards/data tables
- https://carbondesignsystem.com/data-visualization/dashboards/
- https://carbondesignsystem.com/components/data-table/style/

Takeaway:
strong visual hierarchy should reflect business importance; dense operational rows benefit from restrained layer contrast, not many decorative cards.

### Atlassian Design — Empty state
- https://atlassian.design/components/empty-state
- https://atlassian.design/foundations/content/designing-messages/empty-state

Takeaway:
an empty panel should explain the state and give a meaningful next step when one exists. V4 applies this to `Activitate recentă`.

## Product-truth decisions

V4 does not add:
- invented integration usage counts;
- invented health metrics;
- fake sync timestamps;
- fake permissions;
- forecast claims;
- converted/cross-currency totals;
- autonomous execution states.

The provider descriptions state only what each authorized source contributes conceptually.
