import { createHash, createPublicKey, sign, verify } from "node:crypto";
import { z } from "zod";

export const PLAY_PACKAGE = "com.roastmeai.vantalum";
// Public licensing key supplied by the app owner; this is not a private credential.
export const PLAY_LICENSE_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAhTa0wsnbafe3PlrEBFRdQotb+BMP8NhEuPtsrFXABV+zNUJGpaUfMPy58/QUIxsn2fOv38KsoKzg6GYGRcnEZLzRQlIMgf5AF2KcMKq6HvviP4Mp1RLSOlAZhs9JEkNE+0IWUPJnV9PGMEdUobcs4MzEB+penpJ5B9Jmz2hArqrHDzUbt4UEsPQ3ZZZIAf96TvT/FX1tMTWezK317/g7OXpNgEtN2TNj1V+Y88zR8KvNDw/f7hOMxu/gKntTggtP9WFVMKJRf6CweYQHFItckCuM1lkp+FZhKxssTOnIMmngDOpl9MIJAwFOtywnLzd9C8qu8IvQhNBmeCiD/kJnWwIDAQAB";
export class PlayBillingError extends Error {
  constructor(
    message: string,
    public status = 503,
  ) {
    super(message);
  }
}
export const playReceiptSchema = z.object({
  signedData: z.string().min(2).max(20000),
  signature: z.string().min(32).max(2048),
});
export type PlayReceipt = z.infer<typeof playReceiptSchema>;
export const playAccountId = (user: string) =>
  createHash("sha256").update(`${PLAY_PACKAGE}:${user}`).digest("hex");
export const playTokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function playCatalog() {
  const monthly = {
    plan: "monthly",
    productId: process.env.GOOGLE_PLAY_MONTHLY_PRODUCT || "monthly",
    basePlanId: process.env.GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID || "monthly",
    period: "P1M",
  };
  const weekly =
    (process.env.GOOGLE_PLAY_WEEKLY_BASE_PLAN_ID ?? "goweekly")
      ? {
          plan: "weekly",
          productId: process.env.GOOGLE_PLAY_WEEKLY_PRODUCT || "weekly",
          basePlanId: process.env.GOOGLE_PLAY_WEEKLY_BASE_PLAN_ID || "goweekly",
          period: "P1W",
        }
      : null;
  return [monthly, ...(weekly ? [weekly] : [])];
}
export function verifyPlaySignature(
  receipt: PlayReceipt,
  key = process.env.GOOGLE_PLAY_LICENSE_KEY || PLAY_LICENSE_KEY,
) {
  let valid = false;
  try {
    valid = verify(
      "RSA-SHA1",
      Buffer.from(receipt.signedData, "utf8"),
      createPublicKey({
        key: Buffer.from(key, "base64"),
        format: "der",
        type: "spki",
      }),
      Buffer.from(receipt.signature, "base64"),
    );
  } catch {
    /* malformed signature/key */
  }
  if (!valid)
    throw new PlayBillingError(
      "The Google Play purchase signature could not be verified.",
      400,
    );
  let purchase: unknown;
  try {
    purchase = JSON.parse(receipt.signedData);
  } catch {
    throw new PlayBillingError("The Google Play receipt is invalid.", 400);
  }
  const parsed = z
    .object({
      packageName: z.literal(PLAY_PACKAGE),
      productId: z.string(),
      purchaseToken: z.string().min(10).max(5000),
      purchaseState: z.literal(0),
    })
    .safeParse(purchase);
  if (!parsed.success)
    throw new PlayBillingError(
      "Only completed purchases for Roast Me AI can be verified.",
      400,
    );
  if (!playCatalog().some((p) => p.productId === parsed.data.productId))
    throw new PlayBillingError(
      "This subscription product is not configured.",
      400,
    );
  return parsed.data;
}
let access: { key: string; token: string; expires: number } | undefined;
export function playConfigured() {
  return !!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
}
async function accessToken() {
  let service: {
    client_email: string;
    private_key: string;
    private_key_id?: string;
  };
  try {
    service = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || "");
    if (!service.client_email || !service.private_key) throw Error();
  } catch {
    throw new PlayBillingError(
      "Google Play verification is not configured yet. No payment has been taken.",
    );
  }
  const key = createHash("sha256")
    .update(service.client_email + service.private_key)
    .digest("hex");
  if (access?.key === key && access.expires > Date.now() + 60000)
    return access.token;
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned =
    encode({ alg: "RS256", typ: "JWT", kid: service.private_key_id }) +
    "." +
    encode({
      iss: service.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    });
  const assertion =
    unsigned +
    "." +
    sign("RSA-SHA256", Buffer.from(unsigned), service.private_key).toString(
      "base64url",
    );
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok || typeof data.access_token !== "string")
    throw new PlayBillingError(
      "Google Play service credentials could not be authenticated. Please contact support.",
    );
  access = {
    key,
    token: data.access_token,
    expires: Date.now() + Number(data.expires_in || 3600) * 1000,
  };
  return access.token;
}
export async function playApi(path: string, method = "GET") {
  const response = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PLAY_PACKAGE}/${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      ...(method === "POST" ? { body: "{}" } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok)
    throw new PlayBillingError(
      "Google Play could not verify the subscription. Please retry Restore purchases.",
    );
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new PlayBillingError(
      "Google Play returned an unreadable verification response. Please retry.",
    );
  }
}
export function readPlaySubscription(
  data: any,
  user: string,
  now = Date.now(),
) {
  if (
    data.externalAccountIdentifiers?.obfuscatedExternalAccountId !==
    playAccountId(user)
  )
    throw new PlayBillingError(
      "This Google Play purchase belongs to a different app account.",
      403,
    );
  if (data.testPurchase && process.env.ALLOW_SANDBOX_PURCHASES !== "true")
    throw new PlayBillingError(
      "Test purchases are not enabled on this server.",
      400,
    );
  const matches = (data.lineItems || [])
    .flatMap((item: any) => {
      const plan = playCatalog().find(
        (p) =>
          p.productId === item.productId &&
          p.basePlanId === item.offerDetails?.basePlanId,
      );
      const expiry = Date.parse(item.expiryTime);
      return plan && Number.isFinite(expiry)
        ? [{ ...plan, expiry: item.expiryTime as string, expires: expiry }]
        : [];
    })
    .sort((a: any, b: any) => b.expires - a.expires);
  const item = matches[0];
  if (!item)
    throw new PlayBillingError(
      "The purchased base plan does not match a configured subscription.",
      400,
    );
  const allowed = [
    "SUBSCRIPTION_STATE_ACTIVE",
    "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    "SUBSCRIPTION_STATE_CANCELED",
  ].includes(data.subscriptionState);
  return {
    ...item,
    active: allowed && item.expires > now,
    state: String(data.subscriptionState),
    acknowledge: data.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING",
  };
}
