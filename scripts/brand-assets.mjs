// Reuse the original Savage artwork for every app identity surface.
// Generates image resources only; never packages the Android app.
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const res = path.join(root, "android/app/src/main/res");
const source = await sharp(path.join(root, "public/personas.webp"))
  .extract({ left: 0, top: 0, width: 512, height: 512 })
  .png().toBuffer();
const background = "#0c0b10";
async function padded(size, fraction = 0.8, transparent = false) {
  const edge = Math.round(size * fraction);
  const art = await sharp(source).resize(edge, edge).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4,
    background: transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : background } })
    .composite([{ input: art, gravity: "centre" }]).png().toBuffer();
}
await writeFile(path.join(root, "public/logo.png"), source);
for (const size of [192, 512]) {
  await writeFile(path.join(root, `public/icon-${size}.png`), await padded(size, 0.7));
}
await writeFile(path.join(root, "public/apple-touch-icon.png"), await padded(180));
const favicon = await padded(64, 0.9);
await writeFile(path.join(root, "public/icon.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><image width="64" height="64" href="data:image/png;base64,${favicon.toString("base64")}"/></svg>\n`);
for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  const dir = path.join(res, `mipmap-${density}`);
  await mkdir(dir, { recursive: true });
  const legacy = await padded(size);
  await writeFile(path.join(dir, "ic_launcher.png"), legacy);
  await writeFile(path.join(dir, "ic_launcher_round.png"), legacy);
  await writeFile(path.join(dir, "ic_launcher_foreground.png"), await padded(Math.round(size * 2.25), 0.6, true));
}
await mkdir(path.join(res, "drawable-nodpi"), { recursive: true });
await writeFile(path.join(res, "drawable-nodpi/savage_splash.png"), await padded(288, 0.6, true));
console.log("Savage brand images updated. No Android package built.");
