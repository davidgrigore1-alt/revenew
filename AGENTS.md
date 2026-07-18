# AGENTS.md — ReveNew Codex Instructions

## Project Identity

This repository may still be named `moneyhunter-ai`, but the product is now called **ReveNew**.

Always use **ReveNew** in product UI, user-facing copy, metadata, headings, navigation, pricing pages, and documentation unless referring to legacy repository history.

ReveNew is a production-grade B2B SaaS for revenue recovery and opportunity management. It is not a demo, not a generic AI app, and not just a landing page.

The product helps businesses identify, prioritize, and track lost or underused commercial opportunities with clear ownership, next actions, auditability, and human control.

## Core Design Source

Before making frontend or UX changes, read:

- `DESIGN.md`

`DESIGN.md` is the design contract for the redesign. Follow it unless the user explicitly overrides it.

Do not copy Aura templates directly. Use them only as visual and structural inspiration. The final UI must be adapted to ReveNew’s existing product, data model, business logic, and workflows.

## Language and Copy

All user-facing product copy must be in premium Romanian business language.

Use clear, mature, specific wording.

Avoid:
- hype;
- “revoluționar”;
- “garantat”;
- fake ROI promises;
- generic AI startup language;
- childish tone;
- overpromising automation.

The product should emphasize:
- venit recuperabil;
- oportunități comerciale;
- follow-up;
- ownership;
- next action;
- control uman;
- auditabilitate;
- risc;
- prioritate;
- decizii comerciale.

## Security Rules

Security is non-negotiable.

Do not:
- expose API keys in frontend code;
- expose Supabase service role keys;
- move privileged server-side logic into client components;
- weaken Supabase auth;
- weaken RLS;
- modify RLS policies for styling/design;
- modify database schema for visual design unless explicitly required and justified;
- add unnecessary tracking scripts;
- show raw secrets, tokens, env values, or internal errors in UI;
- introduce autonomous risky commercial actions without human review.

Preserve:
- Supabase auth;
- protected routes;
- server/client boundaries;
- workspace/business data isolation;
- privacy/security by design;
- auditability;
- human approval flows.

## Implementation Workflow

Do not implement the full redesign in one massive pass.

Work in phases:

1. Audit current UI architecture.
2. Refactor design tokens and shared UI components.
3. Refactor app shell, sidebar, topbar, and page headers.
4. Redesign Dashboard / Control Center.
5. Redesign Opportunities list and Opportunity detail/workflow.
6. Redesign Landing, Access, and Pricing pages.
7. Redesign Onboarding, Reports, Settings, and Help.
8. Polish responsive behavior, accessibility, loading states, empty states, and QA.

For each phase:
- inspect relevant files first;
- preserve existing functionality;
- keep changes focused;
- report changed files;
- explain any risk;
- run relevant validation commands.

## Design Priorities

Priority pages:

1. Dashboard / Control Center
2. Opportunities list
3. Opportunity detail / workflow
4. Landing page
5. Access / pricing activation page
6. Onboarding
7. Reports
8. Settings
9. Login / Signup
10. Help / secondary pages

The app must not become a pretty landing page with a weak dashboard. The authenticated product experience is the core.

## UI Rules

Use:
- premium emerald/teal accents;
- slate/zinc/neutral foundations;
- subtle borders;
- clear surfaces;
- compact operational density;
- strong typography hierarchy;
- restrained motion;
- accessible focus states;
- professional tables;
- useful empty states;
- clear status pills;
- action-oriented dashboards.

Avoid:
- generic purple SaaS gradients;
- neon;
- cyberpunk;
- excessive glassmorphism;
- decorative charts;
- huge useless cards;
- fake dashboard data;
- AI slop visuals;
- copying template colors blindly.

## Data Rules

Do not hardcode fake data into authenticated production flows.

Demo-looking data may only be used in isolated mock/demo components if clearly separated from real app logic.

If live data is missing, create proper empty states instead of fake numbers.

## Routing Rules

Do not rename routes, files, or exported functions casually.

Route changes must be explicitly justified because they can break navigation, auth redirects, and Vercel deployment behavior.

## Validation Commands

Use the project’s existing scripts where available.

Preferred validation:

```bash
npm run typecheck
npm run lint
npm run validate:security
npm run validate:migrations
npm run validate:diff
npm run build