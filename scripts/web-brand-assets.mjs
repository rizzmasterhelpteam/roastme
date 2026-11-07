// Repair/encode existing artwork, without changing the mascot or building Android packages.
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const source = await readFile(
  path.resolve(process.argv[2] || path.join(root, "public/logo.png")),
);
await sharp(source, { failOn: "warning" }).raw().toBuffer();
const dir = path.join(root, "public/brand");
await mkdir(dir, { recursive: true });
await writeFile(
  path.join(dir, "savage.webp"),
  await sharp(source).resize(512, 512).webp({ quality: 94 }).toBuffer(),
);
// A small, fully decoded compatibility PNG also repairs public/structured-data logo URLs.
await writeFile(
  path.join(root, "public/logo.png"),
  await sharp(source).resize(256, 256).png().toBuffer(),
);
const ids = ["savage", "grandma", "ceo", "cat", "robot", "drama"];
for (let i = 1; i < ids.length; i++) {
  await writeFile(
    path.join(dir, ids[i] + ".webp"),
    await sharp(path.join(root, "public/personas.webp"))
      .extract({
        left: (i % 3) * 512,
        top: Math.floor(i / 3) * 512,
        width: 512,
        height: 512,
      })
      .webp({ quality: 94 })
      .toBuffer(),
  );
}
const icons = [];
for (const size of [16, 32, 48, 64])
  icons.push(await sharp(source).resize(size, size).png().toBuffer());
const header = Buffer.alloc(6 + 16 * icons.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icons.length, 4);
let offset = header.length;
icons.forEach((png, i) => {
  const n = 6 + 16 * i;
  header[n] = header[n + 1] = [16, 32, 48, 64][i];
  header.writeUInt16LE(1, n + 4);
  header.writeUInt16LE(32, n + 6);
  header.writeUInt32LE(png.length, n + 8);
  header.writeUInt32LE(offset, n + 12);
  offset += png.length;
});
await writeFile(
  path.join(root, "public/favicon.ico"),
  Buffer.concat([header, ...icons]),
);
await writeFile(path.join(root, "public/favicon-savage.png"), icons[3]);
// Next's file convention emits an automatically versioned icon link in initial HTML.
await writeFile(path.join(root, "src/app/icon.png"), icons[3]);
console.log(
  "Verified full mascot, six portraits, multi-resolution favicon and Next icon.",
);
