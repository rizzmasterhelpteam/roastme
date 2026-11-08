import "server-only";
import DodoPayments from "dodopayments";
import { z } from "zod";

export class WebBillingError extends Error {
  constructor(
    message: string,
    public status = 503,
  ) {
    super(message);
  }
}
export const webPlanSchema = z.enum(["weekly", "monthly"]);
export type WebPlan = z.infer<typeof webPlanSchema>;
export function dodoEnvironment() {
  const mode = process.env.DODO_PAYMENTS_ENVIRONMENT || "live_mode";
  if (mode !== "live_mode" && mode !== "test_mode")
    throw new WebBillingError("Invalid Dodo environment configuration.");
  return mode;
}
export function dodoConfigured() {
  return !!(
    process.env.DODO_PAYMENTS_API_KEY &&
    process.env.DODO_PAYMENTS_WEBHOOK_KEY &&
    process.env.DODO_PAYMENTS_WEEKLY_PRODUCT_ID &&
    process.env.DODO_PAYMENTS_MONTHLY_PRODUCT_ID &&
    (dodoEnvironment() === "live_mode" ||
      process.env.NODE_ENV !== "production" ||
      process.env.ALLOW_SANDBOX_PURCHASES === "true")
  );
}
export function dodoClient() {
  if (!dodoConfigured())
    throw new WebBillingError(
      "Web subscriptions are not configured yet. No payment has been taken.",
    );
  return new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY!,
    environment: dodoEnvironment(),
    timeout: 10000,
    maxRetries: 1,
  });
}
export function dodoProduct(plan: WebPlan) {
  const id =
    process.env[
      plan === "weekly"
        ? "DODO_PAYMENTS_WEEKLY_PRODUCT_ID"
        : "DODO_PAYMENTS_MONTHLY_PRODUCT_ID"
    ];
  if (!id) throw new WebBillingError("This web plan is not configured yet.");
  return id;
}
export function dodoPlan(product: string): WebPlan {
  if (product === dodoProduct("weekly")) return "weekly";
  if (product === dodoProduct("monthly")) return "monthly";
  throw new WebBillingError(
    "This product is not a Roast Me AI Premium plan.",
    400,
  );
}
export function webBillingReturn() {
  return new URL(
    "/premium?checkout=return",
    process.env.NEXT_PUBLIC_APP_URL || "https://www.roastme-ai.com",
  ).href;
}
export function validateDodoProduct(
  product: DodoPayments.Products.Product,
  plan: WebPlan,
) {
  const price = product.price;
  if (
    product.product_id !== dodoProduct(plan) ||
    !product.is_recurring ||
    price.type !== "recurring_price" ||
    price.payment_frequency_count !== 1 ||
    price.payment_frequency_interval !==
      (plan === "weekly" ? "Week" : "Month") ||
    price.price <= 0 ||
    (price.trial_period_days || 0) > 0
  )
    throw new WebBillingError(
      "This subscription’s billing period or price is not configured correctly.",
    );
  const currency = price.currency;
  const digits = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits!;
  return {
    plan,
    priceString: new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).format(price.price / 10 ** digits),
    taxInclusive: price.tax_inclusive === true,
  };
}
export function readDodoSubscription(
  sub: DodoPayments.Subscriptions.Subscription,
  customerId: string,
  user: string,
  now = Date.now(),
) {
  if (
    sub.customer.customer_id !== customerId ||
    sub.metadata.supabase_user_id !== user ||
    sub.metadata.app !== "roastme"
  )
    throw new WebBillingError(
      "This subscription belongs to a different account.",
      403,
    );
  const plan = dodoPlan(sub.product_id);
  if (
    sub.payment_frequency_count !== 1 ||
    sub.payment_frequency_interval !== (plan === "weekly" ? "Week" : "Month") ||
    sub.on_demand
  )
    throw new WebBillingError(
      "Subscription billing period does not match the selected plan.",
      400,
    );
  const expiry = Math.min(
    Date.parse(sub.next_billing_date),
    sub.expires_at ? Date.parse(sub.expires_at) : Infinity,
  );
  if (!Number.isFinite(expiry))
    throw new WebBillingError("Subscription expiry could not be verified.");
  return {
    plan,
    active: sub.status === "active" && expiry > now,
    expiry: new Date(expiry).toISOString(),
  };
}
