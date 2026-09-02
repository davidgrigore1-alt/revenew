# Manual paid access for early pilots

This runbook supports manual invoicing for early ReveNew pilots. It does not create a Stripe integration, automatic payment collection, or self-service checkout.

## Activation

1. Confirm payment externally under the signed pilot agreement.
2. Identify the exact production business UUID through the approved operator process.
3. Run the command without `--apply` and inspect the printed `target` origin, plan, status, end date, and bounded reference.
4. Verify `--environment production` points to the intended non-loopback Supabase project.
5. Re-run the identical command with `--apply` only after the printed `target` origin matches the intended project.
6. Confirm the sanitized result reports the expected business ID, subscription ID, plan, status, period end, and `changed` state.
7. Ask the customer to sign in.
8. Confirm `/billing` displays the active plan and period end.
9. Confirm a protected route opens only after server-side access verification.

Example dry run:

```powershell
npm run billing:access -- --business-id <uuid> --plan starter --status active --until 2026-10-01T00:00:00Z --reference INV-2026-001 --environment production
```

Apply only after the dry-run details are correct:

```powershell
npm run billing:access -- --business-id <uuid> --plan starter --status active --until 2026-10-01T00:00:00Z --reference INV-2026-001 --environment production --apply
```

## Past due

Set `--status past_due` after the approved external process determines payment is overdue. Protected access stops because server-side access treats `past_due` as blocked.

## Cancellation

Set `--status cancelled` using the agreed period end. Existing semantics are preserved:

- `cancelled` with a future period end keeps access until that date;
- `cancelled` with an expired or current period end stops access.

## Reactivation

Explicitly set `--status active` with a new future `--until` timestamp. Active access cannot be made indefinite through this path.

## Rollback

Repeat the operator operation with the previous known plan, status, and period end. The operation updates the current subscription row and records one audit event for an actual change. An identical retry is idempotent and produces no duplicate audit mutation.

## Security

- Never paste service-role keys into tickets, documents, chat, screenshots, or source control.
- Keep the production service-role key only in the approved secret store.
- Verify the production target before using `--apply`.
- Confirm the dry-run's printed `target` origin before repeating the exact command with `--apply`; production requires a non-loopback `https:` target.
- Browser users have read-only subscription access through RLS and cannot invoke the operator RPC.
- The reference is a short invoice/reference identifier only; do not use it for customer notes, card data, or invoice contents.
