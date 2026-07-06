# ReveNew Admin Manual Test Checklist

## Authorization

- Log in as `pawzoo24@gmail.com` with active `platform_admin`.
- Open `/admin` and confirm the Founder Control Center loads.
- Log in as a normal business owner and confirm `/admin` shows the restricted state.
- Open direct URLs as a normal business owner:
  - `/admin/businesses`
  - `/admin/usage`
  - `/admin/costs`
  - `/admin/audit`
  - `/admin/system`
- Confirm no Admin route uses an email allowlist or `profiles.role`.

## Missing Usage Infrastructure

- Before usage migrations are applied, confirm Admin pages show explanatory unavailable states.
- Confirm no section displays fake zero provider cost when metering tables are missing.
- Confirm system page marks metering as `Date insuficiente`.

## Overview

- Check date range links.
- Confirm top cards distinguish configured value, provider cost, contribution and margin.
- Confirm role-management message is read-only and subtle.
- Confirm top consumers, feature costs, warnings, provider issues, audit and system sections have useful empty states.

## Business List

- Open `/admin/businesses`.
- Confirm table columns: firmă, owner, plan, cereri, cost API, valoare plan, marjă.
- Confirm no destructive bulk actions exist.

## Business Detail

- Open `/admin/businesses/[id]` from a table row.
- Confirm company context, financial summary, usage summary, feature/model breakdown and recent events.
- Confirm unavailable plan value does not produce a false margin.

## Usage And Costs

- Open `/admin/usage`.
- Confirm the event table does not show prompts, raw provider responses or secrets.
- Open `/admin/costs`.
- Confirm forecast is labeled `Forecast simplificat`.
- Confirm plan budgets are internal and not labeled as collected revenue.

## Audit And System

- Open `/admin/audit`.
- Confirm only sanitized audit information appears.
- Open `/admin/system`.
- Confirm environment variables are shown only as safe statuses, never values.

## Responsive

- Check widths: 1440, 1280, 1024, 768.
- Confirm tables scroll inside their containers without page-level horizontal overflow.
- Confirm focus states are visible for links and controls.
