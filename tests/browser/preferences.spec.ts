import { test, expect } from "@playwright/test";
import { defaultState } from "../../src/lib/personas";

test("length preferences do not restart account setup; language, sound and reminders work", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  let stateReads = 0;
  const state = structuredClone(defaultState);
  await context.grantPermissions(["notifications"], {
    origin: new URL(process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000")
      .origin,
  });
  await page.addInitScript(() => {
    // This host's headless Chromium reports denied even after a CDP grant.
    // Keep the permission getter consistent with the granted browser permission.
    Object.defineProperty(Notification, "permission", { get: () => "granted" });
    (window as any).sentNotifications = [];
    ServiceWorkerRegistration.prototype.showNotification = async function (
      title,
      options,
    ) {
      (window as any).sentNotifications.push({ title, options });
    };
    const user = {
      id: "f6020b92-02ab-4941-8870-1138817b2e30",
      aud: "authenticated",
      role: "authenticated",
      is_anonymous: true,
    };
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token =
      btoa("{}") +
      "." +
      btoa(JSON.stringify({ ...user, sub: user.id, exp })) +
      ".test";
    localStorage.setItem(
      "sb-yvasapreydrajjitycnd-auth-token",
      JSON.stringify({
        access_token: token,
        refresh_token: "test",
        expires_at: exp,
        expires_in: 3600,
        token_type: "bearer",
        user,
      }),
    );
    (window as any).feedbackCounts = { vibrate: 0, tones: 0 };
    Object.defineProperty(navigator, "vibrate", {
      value: () => {
        (window as any).feedbackCounts.vibrate++;
        return true;
      },
    });
    const create = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () {
      (window as any).feedbackCounts.tones++;
      return create.call(this);
    };
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/state") {
      stateReads++;
      await route.fulfill({ json: state });
    } else if (path === "/api/settings") {
      state.settings = route.request().postDataJSON();
      await route.fulfill({ json: { state } });
    } else await route.fulfill({ json: { state } });
  });
  await page.goto("/settings");
  await page.getByText("Roast controls", { exact: true }).click();
  const before = stateReads;
  for (const length of ["Short", "Long", "Medium", "Short"]) {
    await page.getByRole("button", { name: new RegExp("^" + length) }).click();
    await expect(
      page.getByRole("button", { name: new RegExp("^" + length) }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("roast-controls") || "{}")
            .replyLength,
      ),
    )
    .toBe("short");
  expect(stateReads).toBe(before);
  await page
    .getByLabel("Reply language", { exact: true })
    .selectOption("Hindi");
  await expect.poll(() => state.settings.language).toBe("Hindi");
  await page
    .getByRole("switch", { name: "Sound effects", exact: true })
    .click();
  await expect.poll(() => state.settings.sound).toBe(true);
  await page.getByRole("button", { name: /^Long/ }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).feedbackCounts.tones))
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => (window as any).feedbackCounts.vibrate))
    .toBeGreaterThan(0);
  await page
    .getByRole("switch", { name: "Notifications", exact: true })
    .click();
  await expect(
    page.getByRole("switch", { name: "Notifications", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: /Test notification/ }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).sentNotifications.length))
    .toBe(1);
  expect(
    await page.evaluate(async () =>
      Boolean((await navigator.serviceWorker.getRegistration())?.active),
    ),
  ).toBe(true);
  await page.reload();
  await page.getByText("Roast controls", { exact: true }).click();
  await expect(page.getByRole("button", { name: /^Long/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByLabel("Reply language", { exact: true })).toHaveValue(
    "Hindi",
  );
  expect(errors).toEqual([]);
});
