// Web checkout is intentionally absent from the Android bundle.
export async function webPrices() {
  return {
    configured: false,
    products: [] as { plan: string; priceString: string }[],
  };
}
export async function webBillingAction(
  ..._args: unknown[]
): Promise<Record<string, unknown>> {
  throw new Error("Use Google Play billing in the Android app.");
}
