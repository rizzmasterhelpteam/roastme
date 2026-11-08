import { test, expect, type Page } from "@playwright/test";
import { defaultState } from "../../src/lib/personas";

async function account(page: Page, guest = true, configured = false) {
  const user = "f6020b92-02ab-4941-8870-1138817b2e30";
  const state = {
    ...structuredClone(defaultState),
    demo: false,
    accountId: user,
    credits: 0,
    guest,
    email: guest ? null : "synthetic@example.com",
  };
  await page.addInitScript(
    ({ user, guest }) => {
      const identity = {
        id: user,
        aud: "authenticated",
        role: "authenticated",
        is_anonymous: guest,
      };
      const exp = Math.floor(Date.now() / 1000) + 3600;
      localStorage.setItem(
        "sb-yvasapreydrajjitycnd-auth-token",
        JSON.stringify({
          access_token:
            btoa("{}") +
            "." +
            btoa(JSON.stringify({ ...identity, sub: user, exp })) +
            ".test",
          refresh_token: "synthetic",
          expires_at: exp,
          expires_in: 3600,
          token_type: "bearer",
          user: identity,
        }),
      );
    },
    { user, guest },
  );
  const calls: { path: string; body: Record<string, unknown> | null }[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    calls.push({ path, body: request.postDataJSON() });
    if (path === "/api/billing/web/status")
      return route.fulfill({
        json: {
          configured,
          products: configured
            ? [
                { plan: "weekly", priceString: "$3.00" },
                { plan: "monthly", priceString: "$9.00" },
              ]
            : [],
        },
      });
    if (path === "/api/billing/web/checkout")
      return route.fulfill({
        json: { url: "https://checkout.dodopayments.com/session/synthetic" },
      });
    if (path === "/api/billing/web/restore")
      return route.fulfill({ json: { state } });
    return route.fulfill({
      json: path.endsWith("/state") ? state : { connected: true },
    });
  });
  return calls;
}

test("zero-credit web chat and rewards offer Premium without ad actions", async ({
  page,
}) => {
  const calls = await account(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".chat-credit-offer")).toBeVisible();
  await expect(page.getByRole("button", { name: /Watch an ad/ })).toHaveCount(
    0,
  );
  await page.locator(".chat-credit-offer button").click();
  await expect(
    page.getByRole("button", { name: /Sign in to upgrade/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Subscriptions are not configured. No payment is taken.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.screenshot({ path: "work/web-billing-mobile.png" });
  await page.goto("/rewards");
  await expect(
    page.getByRole("heading", { name: "5 free credits" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Watch an ad/ })).toHaveCount(
    0,
  );
  expect(calls.some((c) => c.path.startsWith("/api/rewards/"))).toBe(false);
});

test("web checkout uses server prices and only the web billing endpoint", async ({
  page,
}) => {
  const calls = await account(page, false, true);
  await page.route("https://checkout.dodopayments.com/**", (route) =>
    route.fulfill({ body: "Synthetic checkout destination" }),
  );
  await page.goto("/premium");
  await expect(page.getByText("$9.00", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /Unlock Premium/ }).click();
  await page.waitForURL("https://checkout.dodopayments.com/**");
  const checkout = calls.find((c) => c.path === "/api/billing/web/checkout");
  expect(checkout?.body?.plan).toBe("monthly");
  expect(calls.some((c) => c.path === "/api/billing/checkout")).toBe(false);
});

test("a forged success redirect never displays active Premium", async ({
  page,
}) => {
  await account(page, false, true);
  await page.goto(
    "/premium?checkout=return&subscription_id=sub_fake&status=active",
  );
  await expect(
    page.getByText("Payment is still processing.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("Premium is active on your account", { exact: false }),
  ).toHaveCount(0);
});
