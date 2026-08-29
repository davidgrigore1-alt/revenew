# ReveNew

ReveNew is a Romanian-first B2B SaaS for identifying, reviewing and tracking recoverable commercial opportunities with explicit ownership, evidence, auditability and human control.

## Prerequisites

- Node.js compatible with the repository toolchain
- npm
- Docker only for workflows that use local Supabase
- Supabase credentials for connected development environments

## Local development

Install dependencies and start the application from the repository root:

```powershell
npm install
npm run dev
```

Copy `.env.example` to `.env.local` only when a connected environment is needed. Keep credentials local and never commit or print environment files. Provider-backed features remain unavailable unless their required server-side configuration and user authorization are present.

For the isolated buyer-safe local demo, follow [`docs/local-demo.md`](docs/local-demo.md). Database and multi-environment safety instructions are in [`docs/development-safety.md`](docs/development-safety.md).

## Canonical documentation

- Repository context: [`docs/CODEX_CONTEXT.md`](docs/CODEX_CONTEXT.md)
- Capability truth: [`docs/product-truth-matrix.md`](docs/product-truth-matrix.md)
- Engineering policy: [`docs/engineering-operating-system.md`](docs/engineering-operating-system.md)
- Active execution plan: [`docs/exec-plans/active/A3.2-closeout.md`](docs/exec-plans/active/A3.2-closeout.md)
- Authorization architecture: [`docs/AUTHORIZATION_ARCHITECTURE.md`](docs/AUTHORIZATION_ARCHITECTURE.md)
- Product information architecture: [`docs/product-information-architecture.md`](docs/product-information-architecture.md)
- Current design system: [`docs/design/revenew-design-system-v4.md`](docs/design/revenew-design-system-v4.md)
- Buyer-demo operator materials: [docs/sales/full-buyer-demo-script.md](docs/sales/full-buyer-demo-script.md) and [docs/sales/demo-readiness-checklist.md](docs/sales/demo-readiness-checklist.md)

Consult the product-truth matrix before describing a capability as connected, live or execution-capable. Runtime configuration can make an implemented provider capability unavailable in a particular environment.

## Validation

Use the smallest validation set appropriate to the change. The durable risk tiers and Definition of Done are documented in the engineering operating system.

```powershell
npm run typecheck
npm run lint
npm run validate:migrations
npm run validate:security
npm test
npm run build
git diff --check
```

`npm run validate:quick` runs the repository's quick gate. `npm run validate` runs the complete validation sequence, including the build.
