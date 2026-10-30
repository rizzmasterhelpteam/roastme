import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("desktop roast, save, share export, report, daily claim and battle", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(page.locator(".insta-chat-screen")).toBeVisible();
  await expect(page.locator(".credit-badge b")).toHaveText("5");
  await page.locator(".insta-dropdown-btn").click();
  await expect(
    page.getByRole("heading", { name: "Who’s roasting you today?" }),
  ).toBeVisible();
  await expect(page.locator(".persona-card").last()).toHaveCSS("opacity", "1");
  await page.locator(".insta-dropdown-btn").click();
  await page.screenshot({ path: "work/home-desktop.png", fullPage: true });
  await page.goto("/chat/savage");
  await page.locator("#roast-prompt").fill("Roast my work from home routine.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator(".assistant-message p")).toContainText("remote");
  await expect(page.locator(".credit-badge b")).toHaveText("4");
  await page.getByRole("button", { name: "Save roast", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unsave roast", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Like roast", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Like roast", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Report", exact: true }).click();
  await page.getByLabel("Spam or low quality", { exact: true }).check();
  await page.getByRole("button", { name: "Submit report" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: "Share roast", exact: true }).click();
  await expect(page.locator(".share-card")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).click();
  expect((await download).suggestedFilename()).toBe("roast-me-ai.png");
  await page.goto("/");
  await page.locator(".insta-heart-nav-btn").click();
  await expect(page).toHaveURL(/\/saved/);
  await expect(page.locator(".saved-roast-card")).toHaveCount(1);
  await page.goto("/");
  await page.locator(".credit-badge").click();
  await expect(page.getByRole("heading", { name: "Fuel the fire" })).toBeVisible();
  await page.getByRole("button", { name: /Watch an ad/ }).click();
  await expect(page.locator(".credit-badge b")).toHaveText("9");
  await page.goto("/battle");
  await page.getByRole("button", { name: /Start roast battle/ }).click();
  await expect(page.locator(".battle-round-pill")).toHaveText("ROUND 1 OF 3");
  await expect(page.locator(".credit-badge b")).toHaveText("4");
  expect(errors).toEqual([]);
});
test("API rejects blocked requests, repeat rewards, forged rewards and overspending", async ({
  request,
}) => {
  const state = await request.get("/api/state");
  expect((await state.json()).credits).toBe(5);
  const body = {
    prompt: "I procrastinate on everything.",
    persona: "savage",
    type: "text",
    requestId: randomUUID(),
  };
  const blocked = await request.post("/api/roast", {
    data: { ...body, prompt: "encourage self-harm" },
  });
  expect(blocked.status()).toBe(422);
  expect((await (await request.get("/api/state")).json()).credits).toBe(5);
  const first = await request.post("/api/roast", { data: body });
  expect(first.status()).toBe(200);
  await request.post("/api/roast", { data: body });
  expect((await (await request.get("/api/state")).json()).credits).toBe(4);
  for (let i = 0; i < 4; i++)
    expect(
      (
        await request.post("/api/roast", {
          data: { ...body, requestId: randomUUID() },
        })
      ).status(),
    ).toBe(200);
  expect(
    (
      await request.post("/api/roast", {
        data: { ...body, requestId: randomUUID() },
      })
    ).status(),
  ).toBe(402);
  expect(
    (
      await request.post("/api/rewards/ad", {
        data: { completed: true, amount: 999 },
      })
    ).status(),
  ).toBe(503);
  expect(
    (
      await request.post("/api/billing/checkout", {
        data: { plan: "monthly", premium: true },
      })
    ).status(),
  ).toBe(503);
  expect(
    (await request.post("/api/rewards/daily", { data: {} })).status(),
  ).toBe(200);
  expect(
    (await request.post("/api/rewards/daily", { data: {} })).status(),
  ).toBe(400);
  expect((await (await request.get("/api/state")).json()).credits).toBe(5);
});
test("mobile screens do not overflow, and photo roast charges two credits", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/",
    "/onboarding",
    "/sign-in",
    "/persona/cat",
    "/battle",
    "/saved",
    "/premium",
    "/settings",
    "/profile",
    "/subscription",
    "/delete-account",
    "/privacy",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1,h2").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      route + " overflow",
    ).toBe(true);
    if (route === "/") {
      await expect(page.locator(".credit-badge b")).toHaveText("5");
      await page.locator(".insta-dropdown-btn").click();
      await expect(page.locator(".persona-card").last()).toHaveCSS(
        "opacity",
        "1",
      );
      await page.locator(".insta-dropdown-btn").click();
      await page.screenshot({ path: "work/home-mobile.png", fullPage: true });
    }
  }
  await page.goto("/");
  await expect(page.locator(".credit-badge b")).toHaveText("5");
  await page.locator("input[type=file]").setInputFiles("public/personas.webp");
  await expect(page.locator(".insta-attachment-preview")).toBeVisible();
  await page.locator(".insta-send-btn").click();
  await expect(page.locator(".insta-assistant-bubble").first()).toBeVisible();
  await expect(page.locator(".credit-badge b")).toHaveText("3");
  await page.screenshot({ path: "work/image-mobile.png", fullPage: true });

  // Test opening saved replies popup from mobile bottom bar
  await page.locator(".mobile-nav-btn").click();
  await expect(page.locator(".saved-modal-container")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator(".saved-modal-container")).not.toBeVisible();
});
