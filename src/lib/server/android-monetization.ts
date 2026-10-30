import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, ensure } from "./backend";
export async function syncRevenueCat(db: SupabaseClient, userId: string) {
  const secret = process.env.REVENUECAT_SECRET_KEY;
  if (!secret)
    throw new ApiError(
      "Subscriptions are not configured yet. No payment was taken.",
      503,
    );
  const checkedAt = new Date().toISOString();
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    {
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok)
    throw new ApiError(
      "Your purchase is pending verification. Use Restore purchases to retry.",
      503,
    );
  const { subscriber } = await response.json();
  const entitlement =
    subscriber?.entitlements?.[process.env.REVENUECAT_ENTITLEMENT || "premium"];
  const expiry = entitlement?.expires_date;
  const subscription =
    subscriber?.subscriptions?.[entitlement?.product_identifier];
  // Lifetime or promotional grants are not part of the offered weekly/monthly plans.
  const active =
    !!expiry &&
    new Date(expiry).getTime() > Date.now() &&
    !subscription?.refunded_at;
  const plan =
    entitlement?.product_identifier === process.env.REVENUECAT_WEEKLY_PRODUCT
      ? "weekly"
      : entitlement?.product_identifier ===
          process.env.REVENUECAT_MONTHLY_PRODUCT
        ? "monthly"
        : null;
  const acceptedEnvironment =
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_SANDBOX_PURCHASES === "true" ||
    subscription?.is_sandbox === false;
  ensure(
    await db.rpc("apply_store_subscription", {
      p_user: userId,
      p_active: active && !!plan && acceptedEnvironment,
      p_plan: plan,
      p_expiry: expiry || null,
      p_checked: checkedAt,
    }),
  );
}
