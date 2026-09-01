# A4 final certification

## Status

A4.6 closes the broad visual-system phase. Automated presentation contracts and repository gates are the certification evidence; authenticated screenshot acceptance remains explicitly fixture-limited.

## Reviewed surfaces

- Shell: sidebar, header, mobile navigation, search and page axes.
- Control and intelligence: Control Center, AI and Commercial Inbox.
- Governance: Prepared and Approvals.
- CRM: Companies, Company 360, Contacts, Contact detail, Opportunities and Opportunity detail.
- Revenue execution: Pipeline, Recovery, Documents and Document detail.
- Orchestration: Meetings, Sequences, Workflows and workflow editor/detail.
- Executive and trust: Reports, Pilot Proof of Value, Apps and Settings.
- Shared: buttons, inputs, Select, dialogs, drawers, tables, queues, tabs, summary bars and empty/error states.

## Viewports and themes

- 1440×900 and 1280×800: axes, density, max-height and overflow contracts reviewed statically; authenticated visual capture unavailable.
- Tablet and mobile: stacking, table-to-record alternatives, header actions and overlay insets reviewed statically.
- Light and dark: semantic tokens, surface roles, borders, focus and status roles pass automated/static review. Authenticated screenshot parity remains unverified.

## Final shared corrections

- Summary bars now auto-fit existing facts without artificial empty columns.
- Page-header actions stay inside the mobile page axis.
- Apps detail overlays use the canonical radius, mobile-safe insets and contained scrolling.
- Recovery table headers, caption and monetary alignment follow the shared table contract.
- Long workspace and integration names wrap without forcing horizontal overflow.

## Accepted variations

- Executive reports remain calmer than operational registries.
- Master-detail surfaces use internal scroll only after their content exceeds the desktop boundary.
- Wide tables retain horizontal overflow where hiding commercial context would be harmful.
- Original email HTML may preserve a document-like light reading canvas inside the dark product shell.

## Fixture limitation

No authenticated local browser session was available. Protected pages redirected to `/login`; no auth bypass, user reset or fixture mutation was introduced. Manual certification must cover the protected routes listed below at 1440×900, 1280×800, tablet and mobile, in both themes.

## A4 freeze

After the automated gates pass, A4 is frozen. Later UI work requires a demonstrated usability, accessibility, responsive, customer, production or sales-evidence defect; another generic polish pass is not part of the roadmap.
