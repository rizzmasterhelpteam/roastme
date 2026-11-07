import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

test("every portrait and website brand image fully decodes, including the bottom of the Savage mascot", async () => {
  for (const name of [
    "brand/savage.webp",
    "brand/grandma.webp",
    "brand/ceo.webp",
    "brand/cat.webp",
    "brand/robot.webp",
    "brand/drama.webp",
    "logo.png",
    "favicon-savage.png",
    "icon-192.png",
    "icon-512.png",
    "apple-touch-icon.png",
    "personas.webp",
    "social-preview.png",
  ]) {
    const file = new URL("../public/" + name, import.meta.url);
    const decoded = await sharp(await readFile(file), { failOn: "warning" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.ok(decoded.data.length > 0, name);
    if (name === "brand/savage.webp") {
      const { data, info } = decoded;
      let colored = 0;
      for (let y = Math.floor(info.height / 2); y < info.height; y++)
        for (let x = 0; x < info.width; x++) {
          const n = (y * info.width + x) * info.channels;
          if (data[n] > 100 && data[n] > data[n + 2] * 1.5) colored++;
        }
      assert.ok(
        colored > info.width * info.height * 0.1,
        "the lower face and thumbs must decode completely",
      );
    }
  }
  await sharp(await readFile(new URL("../src/app/icon.png", import.meta.url)), {
    failOn: "warning",
  })
    .raw()
    .toBuffer();
});
test("ICO contains complete 16, 32, 48 and 64 pixel PNG frames", async () => {
  const ico = await readFile(new URL("../public/favicon.ico", import.meta.url));
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 4);
  for (let i = 0; i < 4; i++) {
    const n = 6 + i * 16,
      size = ico.readUInt32LE(n + 8),
      offset = ico.readUInt32LE(n + 12);
    assert.equal(ico[n], [16, 32, 48, 64][i]);
    assert.ok(offset + size <= ico.length);
    const { info } = await sharp(ico.subarray(offset, offset + size), {
      failOn: "warning",
    })
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(info.width, ico[n]);
  }
});
