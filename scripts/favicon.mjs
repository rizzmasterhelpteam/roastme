import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const png = await sharp(fileURLToPath(new URL("public/logo.png", root)))
  .resize(64, 64, { fit: "contain", background: "#090a20" })
  .png().toBuffer();
await writeFile(new URL("public/favicon-savage.png", root), png);
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = header[7] = 64;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);
await writeFile(new URL("public/favicon.ico", root), Buffer.concat([header, png]));
console.log("Savage website favicons generated.");
