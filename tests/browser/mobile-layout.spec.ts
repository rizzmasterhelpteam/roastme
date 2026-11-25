import { test, expect } from '@playwright/test';
import { defaultState } from '../../src/lib/personas';

test('mobile web keeps composer and navigation inside viewport with a long conversation', async ({ page }) => {
  const state = structuredClone(defaultState);
  state.history = Array.from({ length: 10 }, (_, i) => ({
    id: `layout-${i}`, persona: 'savage', type: 'chat', session_id: 'layout-session',
    prompt: 'Roast my coffee habit.', content: 'Your coffee has a loyalty card for your bloodstream. Even the mug needs a day off.',
    created_at: new Date(1700000000000 + i * 1000).toISOString(), saved: false,
  })) as typeof state.history;
  await page.addInitScript(() => {
    sessionStorage.setItem('roast-session:savage', 'layout-session');
    const user = { id: 'f6020b92-02ab-4941-8870-1138817b2e30', aud: 'authenticated', role: 'authenticated', is_anonymous: true };
    const exp = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem('sb-yvasapreydrajjitycnd-auth-token', JSON.stringify({ access_token: btoa('{}') + '.' + btoa(JSON.stringify({ ...user, sub: user.id, exp })) + '.test', refresh_token: 'test', expires_at: exp, expires_in: 3600, token_type: 'bearer', user }));
  });
  await page.route('**/api/**', route => route.fulfill({ json: state }));
  for (const size of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 390, height: 500 }, { width: 640, height: 360 }]) {
    await page.setViewportSize(size);
    await page.goto('/');
    await expect(page.locator('.insta-assistant-bubble')).toHaveCount(10);
    for (const selector of ['.insta-composer-footer', '.mobile-nav', '.insta-header']) {
      const box = await page.locator(selector).boundingBox();
      expect(box, selector).not.toBeNull();
      expect(box!.y, selector).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height, selector).toBeLessThanOrEqual(size.height + 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
    const viewport = page.locator('.insta-chat-viewport');
    expect(await viewport.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
    await expect(page.locator('.insta-story-ring .portrait')).toHaveCSS('background-size', 'contain');
    await page.screenshot({ path: `work/mobile-web-${size.width}.png` });
  }
});

