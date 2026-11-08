type Api = (
  path: string,
  body?: Record<string, unknown>,
) => Promise<Record<string, unknown>>;
export type WebPrices = {
  configured: boolean;
  products: { plan: string; priceString: string }[];
};
export async function webPrices(api: Api): Promise<WebPrices> {
  return (await api("billing/web/status")) as WebPrices;
}
export async function webBillingAction(
  api: Api,
  action: "checkout" | "restore" | "manage",
  body: Record<string, unknown> = {},
) {
  const result = await api(`billing/web/${action}`, body);
  if (typeof result.url === "string") {
    const url = new URL(result.url);
    if (url.protocol !== "https:")
      throw new Error("A secure billing link is required.");
    window.location.assign(url.href);
  }
  return result;
}
