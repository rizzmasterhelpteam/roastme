# Web subscriptions with Dodo Payments

The website uses Dodo; Android purchases continue through Google Play. Both write verified subscriptions into the same Supabase account. Sign in with the same account on either platform to use Premium. The existing one-active-Premium-session policy still applies. Guest users must sign in before purchasing. Web users receive five daily credits but cannot watch ads for additional credits.

## Vercel variables (server only)

```
DODO_PAYMENTS_API_KEY=
DODO_PAYMENTS_WEBHOOK_KEY=
DODO_PAYMENTS_ENVIRONMENT=live_mode
DODO_PAYMENTS_WEEKLY_PRODUCT_ID=
DODO_PAYMENTS_MONTHLY_PRODUCT_ID=
```

Use Dodo API keys and product IDs from the same environment. Create recurring fixed-price products with a one-week and one-month billing interval, no trial, and a positive price. The UI reads actual product prices; final taxes/currency are displayed at checkout. Keep both IDs distinct. Checkout is disabled until all keys/products are present and validated. Never prefix these variables with `NEXT_PUBLIC_`.

For sandbox testing, use `test_mode` with test keys/products. Production rejects sandbox checkout unless `ALLOW_SANDBOX_PURCHASES=true` is explicitly set. Use a separate test deployment/project to avoid mixing test entitlements with real customers. Redeploy after adding or changing variables.

## Dodo dashboard

1. Create the weekly and monthly recurring products and copy their IDs into Vercel.
2. Create an HTTPS webhook endpoint: `https://www.roastme-ai.com/api/webhooks/dodo`.
3. Subscribe to all `subscription.*` events, `refund.succeeded`, and `dispute.lost`. Save the endpoint's signing secret as `DODO_PAYMENTS_WEBHOOK_KEY`.
4. Set `NEXT_PUBLIC_APP_URL=https://www.roastme-ai.com`. Checkout returns to `/premium?checkout=return`; additional redirect parameters never grant access by themselves.
5. Test a purchase, return confirmation, webhook redelivery, renewal, scheduled cancellation, immediate cancellation, full refund and a second-device sign-in before switching to live sales.

## Supabase

Apply `supabase/dodo-billing.sql` and the updated `apply_google_play_subscription` function from `supabase/google-play-billing.sql`. Fresh projects can run `supabase/schema.sql`. Billing tables/RPCs are service-role only with RLS. Subscription ownership is bound to a server-created Dodo customer and the authenticated Supabase user ID, not checkout email or browser-return status. Reviewer grants are preserved.

Signed webhook events retrieve the subscription's current state, then atomically update entitlement. Duplicate deliveries are idempotent; stale snapshots cannot overwrite newer ones. Full refunds/lost disputes for the current period block that period until a later paid renewal. Partial refunds do not revoke access. An old-period refund does not revoke a newer period. Subscription state is refreshed on account use at most every five minutes; expiry is checked on every Premium operation. Web “Refresh access” can recover a successful checkout before its webhook arrives. Customers use the account-bound Dodo customer portal to cancel/manage web subscriptions; Play subscriptions remain managed in Google Play. Android contains no Dodo checkout or portal link.

Real payment processing cannot be tested until the Dodo variables and webhook endpoint are configured. Google Play's existing service-account credential requirement remains separate from Dodo.

Official references: [Checkout sessions](https://docs.dodopayments.com/developer-resources/checkout-session), [webhook verification and retries](https://docs.dodopayments.com/developer-resources/webhooks).
