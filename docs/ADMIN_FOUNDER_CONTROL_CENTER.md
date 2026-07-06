# ReveNew Admin Founder Control Center

The internal Admin area is a Founder Control Center for platform value, provider/API cost, post-API contribution, usage, operational warnings and system readiness.

## Routes

- `/admin`: overview dashboard.
- `/admin/businesses`: business-by-business cost and usage table.
- `/admin/businesses/[id]`: one-company cost and usage drill-down.
- `/admin/usage`: sanitized usage event explorer.
- `/admin/costs`: provider cost, model cost, plan budget and forecast view.
- `/admin/audit`: platform role audit events.
- `/admin/system`: technical and operational readiness.

## Permissions

- `/admin`: `platform.admin.access`
- `/admin/businesses`: `platform.businesses.read_all`
- `/admin/businesses/[id]`: `platform.businesses.read_all`
- `/admin/usage`: `platform.usage.read_all`
- `/admin/costs`: `platform.usage.read_all`
- `/admin/audit`: `platform.audit.read`
- `/admin/system`: `platform.system_health.read`

Permissions are resolved server-side. No Admin route uses email allowlists, `profiles.role`, browser state, Preview Mode or payment status for platform authorization.

## Metric Definitions

- Valoare lunară configurată: monthly value only when a reliable configured contract/subscription amount exists.
- Cost API: estimated provider cost from metered usage events.
- Contribuție după API: configured monthly value minus estimated provider/API cost.
- Marjă după cost API: `(valoare configurată - cost API) / valoare configurată`.
- Firme active: businesses visible to the internal Admin loader.
- Cereri procesate: usage events in the selected period.
- Erori provider: failed usage events or events with an error reason.

The UI does not call post-API contribution "profit". Hosting, salaries, taxes, payment fees and support costs are not included.

## Thresholds

- Sănătos: provider cost below 20% of configured value.
- De urmărit: 20% to below 30%.
- Avertizare: 30% to below 40%.
- Critic: 40% or more.
- Date insuficiente: missing usage cost or configured value.

Statuses are always labeled in text, not communicated only through color.

## Forecast

The costs page uses a simple forecast:

`current average daily provider cost × total days in selected period`

It is labeled as a simplified forecast and is not presented as predictive AI.

## Empty State Logic

The Admin does not display false zeroes when infrastructure is missing.

- Missing usage tables: cost and usage sections show "Indisponibil" or an explanatory empty state.
- Missing configured monthly value: margin and contribution are unavailable.
- Missing audit table: audit page explains that role-audit migration is required.
- No usage in selected period: tables show a no-events empty state.

## Known Limitations

- Confirmed collected revenue is not available because payment collection data is not integrated.
- Configured monthly value is unavailable until a reliable contract/subscription amount exists.
- Usage event schema does not currently store latency, cached input units or pricing-version references.
- Usage explorer currently limits results to the latest 1000 events for the selected range.
- CSV export is documented as a safe future extension and was not added until export requirements are final.
