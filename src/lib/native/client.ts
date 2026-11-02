import { apiOrigin, SecureSession } from "./platform";
import { nativeDemo } from "./demo";

const GOOGLE_REWARDED_TEST_AD_UNIT =
  "ca-app-pub-3940256099942544/5224354917";

let configuredUser = "";
async function purchases(userId: string) {
  const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!apiKey)
    throw new Error(
      "Google Play subscriptions are not configured yet. No payment was taken.",
    );
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  if (!configuredUser) {
    await Purchases.configure({ apiKey, appUserID: userId });
    configuredUser = userId;
  } else if (configuredUser !== userId) {
    await Purchases.logIn({ appUserID: userId });
    configuredUser = userId;
  }
  return Purchases;
}
export async function nativePlans(userId: string) {
  const sdk = await purchases(userId);
  const offerings = await sdk.getOfferings();
  return {
    weekly: offerings.current?.weekly,
    monthly: offerings.current?.monthly,
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
    const sdk = await purchases(userId);
    if (path === "billing/checkout") {
      const plans = await nativePlans(userId);
      const selected = body?.plan === "weekly" ? plans.weekly : plans.monthly;
      if (!selected)
        throw new Error(
          "This subscription is not available in Google Play yet.",
        );
      await sdk.purchasePackage({ aPackage: selected });
    } else await sdk.restorePurchases();
    return request("billing/sync", {});
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
    let consent = await AdMob.requestConsentInfo();
    if (consent.isConsentFormAvailable && !consent.canRequestAds)
      consent = await AdMob.showConsentForm();
    if (!consent.canRequestAds)
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
