# A4 reference library

This register records the external sources reviewed during A4. No external component code was copied or adapted. Product references inform principles only; ReveNew does not reproduce their interfaces.

| Source | URL | License / status | Allowed use | ReveNew adaptation |
| --- | --- | --- | --- | --- |
| shadcn/ui documentation and components | https://ui.shadcn.com/docs | MIT for repository source | Review individual component source; copy only after dependency and license review | Composition model only. Existing ReveNew primitives were retained. |
| shadcn/ui Blocks | https://ui.shadcn.com/blocks | Verify each block/source before adoption | Reference and individually reviewed permissive code only | No block adopted; dashboard templates were too generic for the Control Center. |
| Origin UI | https://github.com/shadcn/originui | MIT | Individually reviewed components, including Tailwind 3 legacy variants where applicable | No component adopted; current controls already cover this batch without extra code. |
| Radix Primitives | https://www.radix-ui.com/primitives/docs/overview/introduction | MIT | Accessible behavior primitives when an existing ReveNew control has a demonstrated gap | Accessibility contracts informed the audit; no dependency or primitive added. |
| TanStack Table | https://github.com/TanStack/table | MIT | Real enterprise table behavior such as sorting, selection or virtualization | Rejected for A4.0: Home needs a decision queue, not a configurable data grid. |
| Motion | https://github.com/motiondivision/motion/blob/main/packages/motion/LICENSE.md | MIT | Meaningful feedback only after dependency review | Not adopted. Existing CSS motion tokens are sufficient. |
| Atlassian Design System foundations | https://atlassian.design/foundations | Design reference; no source copied | Visual and UX research only | Reinforced semantic tokens, restrained spacing and surface-first elevation. |
| Microsoft Fluent 2 | https://fluent2.microsoft.design | Design reference; no source copied | Visual and UX research only | Reinforced 4px spacing, neutral hierarchy, logical headings and visible focus. |
| IBM Carbon / 2x Grid | https://www.ibm.com/design/language/2x-grid/ | Design reference; no source copied | Visual and UX research only | Reinforced consistent grid alignment and productive typography. |
| Attio | https://attio.com/help/reference/productivity-collaborating/navigating-your-workspace | Proprietary product reference | Visual and workflow research only | Informed quiet workspace navigation and record/view density. |
| Linear | https://linear.app/docs/custom-views | Proprietary product reference | Visual and workflow research only | Informed compact saved views, clear selection and contextual detail. |
| HubSpot Sales Workspace | https://knowledge.hubspot.com/sales-workspace/manage-sales-activities-in-the-updated-sales-workspace | Proprietary product reference | Visual and workflow research only | Informed attention-first ordering and quick access to the next safe action. |
| Twenty | https://github.com/twentyhq/twenty | Primarily AGPL-3.0 with mixed/open-core terms | Reference only unless an exact file has a separately verified permissive license | No code copied; used only as a CRM workspace reference. |

## Adoption rule

Before future adoption, record the exact source file or component, stable URL, license, dependencies and adapted behavior here. Unknown, proprietary, commercial-only or copyleft source must remain reference-only unless legal obligations are explicitly accepted.

## A4.2 commercial records

The A4.2 review also covered [Attio table views](https://attio.com/help/reference/managing-your-data/views/create-and-manage-table-views) and [records](https://attio.com/help/reference/managing-your-data/records/create-and-view-records), [Linear custom views](https://linear.app/docs/custom-views), [HubSpot records](https://knowledge.hubspot.com/records/work-with-records) and [Sales Workspace](https://knowledge.hubspot.com/sales-workspace/manage-sales-activities-in-the-updated-sales-workspace), [Atlassian Dynamic Table](https://atlassian.design/components/dynamic-table), and [TanStack Table](https://tanstack.com/table/latest/docs/overview). The resulting reusable pattern is a compact record toolbar, responsive structured rows, a factual summary bar, and URL-addressable record tabs. No external code or dependency was adopted: the existing native tables and ReveNew controls already provide the required semantics without adding grid complexity.

## A4.3 revenue execution

The A4.3 review covered [Clari Inspect](https://www.clari.com/products/inspect/), [Gong pipeline management](https://www.gong.io/pipeline-management-software), [Salesforce Pipeline Inspection](https://help.salesforce.com/s/articleView?id=sales.pipeline_inspection_managing_pipelines_overview.htm&language=en_US), and [Atlassian Dynamic Table](https://atlassian.design/components/dynamic-table). ReveNew adopted only the durable composition lessons: compact exception filters, explicit current work, and contextual evidence beside the selected case. Predictive scores, probability, forecast semantics, external code, and new dependencies were deliberately rejected.

## A4.4 commercial orchestration

The A4.4 review covered [HubSpot sequence enrollment](https://knowledge.hubspot.com/sequences/enroll-contacts-in-a-sequence), [Zapier human-in-the-loop](https://zapier.com/blog/human-in-the-loop-guide/), [Atlassian automation audit logs](https://support.atlassian.com/cloud-automation/docs/what-is-the-automation-audit-log/), and [Microsoft Power Automate monitoring](https://learn.microsoft.com/en-us/power-automate/guidance/coding-guidelines/monitoring-and-alerting). ReveNew adopted only the durable presentation patterns: deliberate enrollment, visible human checkpoints, a readable trigger-to-action sequence, and scanable run evidence. No external code, workflow canvas dependency, autonomous execution pattern, or invented orchestration state was adopted.

## A4.5 executive proof and administration

The A4.5 review covered [HubSpot report management](https://knowledge.hubspot.com/reports/manage-reports-in-your-reports-list), [Linear Insights](https://linear.app/docs/insights), [Google Workspace app access control](https://support.google.com/a/answer/7281227), and [GitHub organization roles](https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/roles-in-an-organization). ReveNew adopted only durable presentation principles: report scope and data provenance remain visible, pilot comparison stays explicit, provider health never outruns the verified connector state, and organization settings retain a clear active scope and permission boundary. No external source code, assets, brand marks, dependency, provider behavior, or authorization model was adopted.
