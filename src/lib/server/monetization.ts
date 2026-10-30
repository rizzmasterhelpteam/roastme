import "server-only";

/** Only verified server receipts may flow through these adapters. */
export interface BillingProvider {
  createCheckout(input: {
    userId: string;
    plan: "weekly" | "monthly";
    returnUrl: string;
  }): Promise<{ url: string }>;
  verifyWebhook(
    rawBody: string,
    signature: string,
  ): Promise<{
    eventId: string;
    userId: string;
    plan: "weekly" | "monthly";
    status: "active" | "expired" | "cancelled" | "refunded";
    expiresAt: string;
  }>;
  restore(
    userId: string,
    receipt: string,
  ): Promise<{ active: boolean; expiresAt: string | null }>;
  manage(userId: string): Promise<{ url: string }>;
}
export interface RewardedAdProvider {
  createIntent(
    userId: string,
  ): Promise<{ intentId: string; expiresAt: string }>;
  /** Must validate the network signature, intent, expiry and user binding. */
  verifyCompletion(
    rawBody: string,
    signature: string,
  ): Promise<{
    eventId: string;
    intentId: string;
    userId: string;
    completed: true;
  }>;
}
// Deliberately no default adapters. Route handlers reject all billing and ad
// grant requests until a real provider and atomic callback processing exist.
