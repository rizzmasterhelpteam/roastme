import { test } from "node:test";
import assert from "node:assert/strict";
import sitemap from "../src/app/sitemap";
import robots from "../src/app/robots";
import { GET } from "../src/app/llms.txt/route";
import { SITE_URL, screenPath, screenMetadata } from "../src/lib/site";
test("SEO discovery lists only actual public pages on the canonical host", async () => {
  const entries = sitemap();
  assert.deepEqual(entries.map(e => e.url), ["/", "/blog", "/about", "/help", "/guidelines"].map(p => SITE_URL + p));
  assert.ok(entries.every(e => !e.lastModified));
  assert.equal(robots().sitemap, SITE_URL + "/sitemap.xml");
  const text = await GET().text();
  assert.ok(text.includes("no posts are published yet"));
  assert.ok(!text.includes("roastme-gold"));
});
test("App URLs reject unknown routes and private pages cannot be indexed", () => {
  for (const path of [[], ["settings"], ["chat", "cat"], ["battle", "live"], ["auth", "callback"]]) assert.equal(screenPath(path), true);
  for (const path of [["missing"], ["settings", "anything"], ["chat", "missing"], ["blog", "fake-post"]]) assert.equal(screenPath(path), false);
  assert.deepEqual(screenMetadata(["history"]).robots, { index: false, follow: true });
  assert.deepEqual(screenMetadata([]).robots, { index: true, follow: true });
});
