import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";
import {
  dodoClient,
  dodoConfigured,
  dodoEnvironment,
  dodoProduct,
  validateDodoProduct,
  readDodoSubscription,
  webBillingReturn,
  WebBillingError,
  type WebPlan,
} from "./dodo";

function checked<T extends { error: unknown }>(result: T): T {
  if (result.error)
    throw new WebBillingError(
      "Subscription details could not be saved. Please retry.",
    );
  return result;
}
async function customerFor(db: SupabaseClient, user: string) {
  return checked(
    await db
      .from("dodo_customers")
      .select("customer_id")
      .eq("user_id", user)
      .eq("environment", dodoEnvironment())
      .maybeSingle(),
  ).data?.customer_id as string | undefined;
}
async function ensureCustomer(db: SupabaseClient, user: User) {
  const existing = await customerFor(db, user.id);
  if (existing) return existing;
  if (!user.email)
    throw new WebBillingError(
      "Add an email address to your account before subscribing.",
      400,
    );
  const customer = await dodoClient().customers.create(
    {
      email: user.email,
      name: user.email,
      metadata: { supabase_user_id: user.id, app: "roastme" },
    },
    { idempotencyKey: `roastme-customer-${dodoEnvironment()}-${user.id}` },
  );
  checked(
    await db.from("dodo_customers").upsert(
      {
        user_id: user.id,
        environment: dodoEnvironment(),
        customer_id: customer.customer_id,
      },
      { onConflict: "user_id,environment", ignoreDuplicates: true },
    ),
  );
  return (await customerFor(db, user.id))!;
}
export async function webBillingStatus() {
  if (!dodoConfigured()) return { configured: false, products: [] };
  const client = dodoClient();
  const products = await Promise.all(
    (["weekly", "monthly"] as const).map(async (plan) =>
      validateDodoProduct(
        await client.products.retrieve(dodoProduct(plan)),
        plan,
      ),
    ),
  );
  return { configured: true, products };
}
export async function webCheckout(
  db: SupabaseClient,
  user: User,
  plan: WebPlan,
) {
  const client = dodoClient();
  validateDodoProduct(await client.products.retrieve(dodoProduct(plan)), plan);
  const customer = await ensureCustomer(db, user);
  const session = await client.checkoutSessions.create(
    {
      product_cart: [{ product_id: dodoProduct(plan), quantity: 1 }],
      customer: { customer_id: customer },
      return_url: webBillingReturn(),
      metadata: { supabase_user_id: user.id, app: "roastme" },
      feature_flags: {
        allow_customer_editing_email: false,
        allow_phone_number_collection: false,
      },
      customization: { theme: "dark" },
    },
    { maxRetries: 0 },
  );
  if (!session.checkout_url)
    throw new WebBillingError("Checkout could not be opened. Please retry.");
  return { url: session.checkout_url };
}
export async function syncDodoSubscription(
  db: SupabaseClient,
  id: string,
  expectedUser?: string,
  eventId?: string,
  blockedUntil?: string,
) {
  const checkedAt = new Date().toISOString();
  const sub = await dodoClient().subscriptions.retrieve(
    z.string().min(3).max(200).parse(id),
  );
  const row = checked(
    await db
      .from("dodo_customers")
      .select("user_id")
      .eq("customer_id", sub.customer.customer_id)
      .eq("environment", dodoEnvironment())
      .maybeSingle(),
  ).data;
  if (!row) {
    if (expectedUser)
      throw new WebBillingError(
        "This subscription belongs to a different account.",
        403,
      );
    return; // Not an app customer, or an account already deleted.
  }
  if (expectedUser && row.user_id !== expectedUser)
    throw new WebBillingError(
      "This subscription belongs to a different account.",
      403,
    );
  const result = readDodoSubscription(
    sub,
    sub.customer.customer_id,
    row.user_id,
  );
  checked(
    await db.rpc("apply_dodo_subscription", {
      p_user: row.user_id,
      p_environment: dodoEnvironment(),
      p_id: sub.subscription_id,
      p_customer: sub.customer.customer_id,
      p_product: sub.product_id,
      p_plan: result.plan,
      p_active: result.active,
      p_expiry: result.expiry,
      p_period_start: sub.previous_billing_date,
      p_state: sub.status,
      p_checked: checkedAt,
      p_event: eventId || null,
      p_blocked_until: blockedUntil || null,
    }),
  );
}
export async function refreshDodo(
  db: SupabaseClient,
  user: string,
  force = false,
) {
  if (!dodoConfigured()) return;
  const rows =
    checked(
      await db
        .from("dodo_subscriptions")
        .select("subscription_id,checked_at")
        .eq("user_id", user)
        .eq("environment", dodoEnvironment())
        .gte("expires_at", new Date(Date.now() - 59 * 86400000).toISOString()),
    ).data || [];
  for (const row of rows)
    if (force || Date.parse(row.checked_at) < Date.now() - 300000)
      await syncDodoSubscription(db, row.subscription_id, user);
}
export async function restoreDodo(
  db: SupabaseClient,
  user: string,
  subscriptionId?: string,
) {
  if (subscriptionId) await syncDodoSubscription(db, subscriptionId, user);
  const customer = await customerFor(db, user);
  if (!customer) return;
  // Finds completed checkout even if its webhook has not arrived yet.
  const list = await dodoClient().subscriptions.list({
    customer_id: customer,
    page_size: 100,
  });
  for (const sub of list.items) {
    if (
      sub.metadata.app !== "roastme" ||
      sub.metadata.supabase_user_id !== user
    )
      continue;
    await syncDodoSubscription(db, sub.subscription_id, user);
  }
}
export async function webPortal(db: SupabaseClient, user: string) {
  const customer = await customerFor(db, user);
  if (!customer)
    throw new WebBillingError(
      "No web subscription found. Google Play subscriptions are managed in Google Play.",
      404,
    );
  const portal = await dodoClient().customers.customerPortal.create(customer, {
    send_email: false,
    return_url: new URL("/subscription", webBillingReturn()).href,
  });
  return { url: portal.link };
}
export async function handleDodoEvent(
  db: SupabaseClient,
  raw: string,
  headers: Record<string, string>,
) {
  let event;
  try {
    event = dodoClient().webhooks.unwrap(raw, { headers });
  } catch {
    throw new WebBillingError("Invalid webhook signature.", 401);
  }
  const id = headers["webhook-id"];
  if (!id) throw new WebBillingError("Missing webhook ID.", 400);
  const existing = checked(
    await db
      .from("dodo_events")
      .select("event_id")
      .eq("environment", dodoEnvironment())
      .eq("event_id", id)
      .maybeSingle(),
  );
  if (existing.data) return;
  if (
    event.type.startsWith("subscription.") &&
    "subscription_id" in event.data
  ) {
    await syncDodoSubscription(
      db,
      String(event.data.subscription_id),
      undefined,
      id,
    );
  } else if (
    (event.type === "refund.succeeded" || event.type === "dispute.lost") &&
    "payment_id" in event.data
  ) {
    const payment = await dodoClient().payments.retrieve(
      String(event.data.payment_id),
    );
    const fullRefund = payment.refund_status === "full";
    if (event.type === "dispute.lost" || fullRefund) {
      for (const subscription of payment.subscription_ids) {
        const sub = await dodoClient().subscriptions.retrieve(subscription);
        // Refunding an old billing period must not revoke a later paid renewal.
        if (
          Date.parse(payment.created_at) >=
          Date.parse(sub.previous_billing_date)
        )
          await syncDodoSubscription(
            db,
            subscription,
            undefined,
            id,
            sub.next_billing_date,
          );
      }
    }
  }
  checked(
    await db
      .from("dodo_events")
      .upsert(
        { environment: dodoEnvironment(), event_id: id },
        { onConflict: "environment,event_id", ignoreDuplicates: true },
      ),
  );
}
