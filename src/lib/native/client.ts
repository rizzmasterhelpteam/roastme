import { appInstanceId } from "@/lib/app-instance";
import { apiOrigin, SecureSession } from "./platform";
import { nativeDemo } from "./demo";

const GOOGLE_REWARDED_TEST_AD_UNIT = "ca-app-pub-3940256099942544/5224354917";

import { registerPlugin } from "@capacitor/core";
import { browserSupabase } from "@/lib/supabase";
type Plan = {
  plan: string;
  productId: string;
  basePlanId: string;
  offerToken: string;
  priceString: string;
  period: string;
};
type Receipt = { signedData: string; signature: string };
const PlayBilling = registerPlugin<{
  products(options: { products: unknown[] }): Promise<{ products: Plan[] }>;
  purchase(options: {
    productId: string;
    offerToken: string;
    accountId: string;
  }): Promise<{ purchases: Receipt[] }>;
  restore(): Promise<{ purchases: Receipt[] }>;
}>("PlayBilling");
async function loadPlayPlans(products: unknown[]) {
  const found = await PlayBilling.products({ products });
  const wrap = (plan: string) => {
    const product = found.products.find((p) => p.plan === plan);
    return product ? { product } : undefined;
  };
  return { weekly: wrap("weekly"), monthly: wrap("monthly") };
}
export async function nativePlans(userId: string) {
  const session = (await browserSupabase()?.auth.getSession())?.data.session;
  if (!session || session.user.id !== userId)
    throw new Error("Sign in to view subscription prices.");
  const status = await nativeRequest(
    "billing/status",
    undefined,
    session.access_token,
    userId,
  );
  if (status.status !== 200)
    throw new Error(status.data.error || "Unable to load subscription plans.");
  return {
    ...(await loadPlayPlans(status.data.products)),
    configured: status.data.configured === true,
  };
}
export async function nativeRequest(
  path: string,
  body?: Record<string, unknown>,
  token?: string,
  userId?: string,
): Promise<{ status: number; data: any }> {
  const origin = apiOrigin();
  if (!origin) {
    const result = await nativeDemo(path, body);
    if (path === "account/delete" && result.status === 200) {
      const { clearNotificationData } = await import("./notifications");
      await clearNotificationData().catch(() => {});
    }
    return result;
  }
  if (!origin.startsWith("https://"))
    throw new Error("Android requires a secure HTTPS API URL.");
  const cacheKey = `roast-history:${userId || "guest"}`;
  const request = async (route: string, data?: Record<string, unknown>) => {
    try {
      const res = await fetch(`${origin}/api/${route}`, {
        method: data ? "POST" : "GET",
        headers: {
          "X-Roast-Instance": appInstanceId(),
          ...(data ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
        signal: AbortSignal.timeout(90000),
      });
      const payload = await res.json();
      if (res.ok && (route === "state" || payload.state)) {
        const state = route === "state" ? payload : payload.state;
        await SecureSession.set({
          key: cacheKey,
          value: JSON.stringify(state),
        }).catch(() => {});
      }
      if (res.ok && route === "account/delete") {
        await SecureSession.remove({ key: cacheKey });
        const { clearNotificationData } = await import("./notifications");
        await clearNotificationData().catch(() => {});
      }
      return { status: res.status, data: payload };
    } catch (error) {
      if (route === "state" && userId) {
        const cached = await SecureSession.get({ key: cacheKey });
        if (cached.value)
          return { status: 200, data: JSON.parse(cached.value) };
      }
      throw error;
    }
  };
  if (path === "billing/checkout" || path === "billing/restore") {
    if (!token || !userId) throw new Error("Sign in before making a purchase.");
    const available = await request("billing/status");
    if (available.status !== 200) return available;
    if (!available.data.configured)
      throw new Error(
        "Google Play verification is not configured yet. No payment has been taken.",
      );
    let result: { purchases: Receipt[] };
    if (path === "billing/checkout") {
      const plans = await loadPlayPlans(available.data.products);
      const selected = body?.plan === "weekly" ? plans.weekly : plans.monthly;
      if (!selected)
        throw new Error(
          "This subscription is not available in Google Play yet.",
        );
      result = await PlayBilling.purchase({
        productId: selected.product.productId,
        offerToken: selected.product.offerToken,
        accountId: available.data.accountId,
      });
    } else result = await PlayBilling.restore();
    return request("billing/sync", { purchases: result.purchases });
  }

  if (path === "billing/manage") {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({
      url: "https://play.google.com/store/account/subscriptions?package=com.roastmeai.vantalum",
    });
    return request("state");
  }
  if (path === "rewards/ad") {
    const adId = process.env.NEXT_PUBLIC_ADMOB_REWARDED_ID;
    if (!adId || !userId)
      throw new Error(
        "Rewarded ads are not configured yet. Your free credits reset at 00:00 UTC.",
      );
    const intent = await request("rewards/intent", {});
    if (intent.status !== 200) return intent;
    const { AdMob } = await import("@capacitor-community/admob");
    const { refreshAdConsent } = await import("./consent");
    const consent = await refreshAdConsent();
    if (!consent?.canRequestAds)
      throw new Error(
        "An ad can’t be shown right now. Your free credits reset at 00:00 UTC.",
      );
    await AdMob.initialize();
    await AdMob.prepareRewardVideoAd({
      adId,
      isTesting: adId === GOOGLE_REWARDED_TEST_AD_UNIT,
    });
    await AdMob.showRewardVideoAd();
    return request("rewards/claim", { intentId: intent.data.intentId });
  }
  return request(path, body);
}
