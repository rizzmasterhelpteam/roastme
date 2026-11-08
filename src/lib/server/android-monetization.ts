import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  playApi,
  playReceiptSchema,
  verifyPlaySignature,
  readPlaySubscription,
  playTokenHash,
  PlayBillingError,
} from "./google-play";
async function checkToken(
  db: SupabaseClient,
  user: string,
  token: string,
  expectedProduct?: string,
) {
  const checked = new Date().toISOString();
  const data = await playApi(
    `purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`,
  );
  const result = readPlaySubscription(data, user);
  if (expectedProduct && result.productId !== expectedProduct)
    throw new PlayBillingError(
      "The purchase token does not match this receipt.",
      400,
    );
  const applied = await db.rpc("apply_google_play_subscription", {
    p_user: user,
    p_hash: playTokenHash(token),
    p_token: token,
    p_product: result.productId,
    p_base: result.basePlanId,
    p_plan: result.plan,
    p_active: result.active,
    p_expiry: result.expiry,
    p_state: result.state,
    p_checked: checked,
  });
  if (applied.error)
    throw new PlayBillingError(
      "The purchase could not be linked to this account. Use Restore purchases to retry.",
    );
  if (result.active && result.acknowledge)
    await playApi(
      `purchases/subscriptions/${encodeURIComponent(result.productId)}/tokens/${encodeURIComponent(token)}:acknowledge`,
      "POST",
    );
}
export async function syncGooglePlay(
  db: SupabaseClient,
  user: string,
  receipts: unknown,
) {
  const list = playReceiptSchema.array().max(10).parse(receipts);
  for (const receipt of list) {
    const purchase = verifyPlaySignature(receipt);
    await checkToken(db, user, purchase.purchaseToken, purchase.productId);
  }
  if (!list.length) await refreshGooglePlay(db, user, true);
}
export async function refreshGooglePlay(
  db: SupabaseClient,
  user: string,
  force = false,
) {
  const rows = await db
    .from("google_play_purchases")
    .select("purchase_token,checked_at")
    .eq("user_id", user)
    .gte("expires_at", new Date(Date.now() - 59 * 86400000).toISOString());
  if (rows.error)
    throw new PlayBillingError(
      "Subscription records could not be loaded. Please retry.",
    );
  for (const row of rows.data || [])
    if (force || Date.parse(row.checked_at) < Date.now() - 300000)
      await checkToken(db, user, row.purchase_token);
}
