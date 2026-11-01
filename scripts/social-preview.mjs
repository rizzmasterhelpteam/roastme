import sharp from "sharp";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const art = await sharp(fileURLToPath(new URL("public/logo.png", root))).resize(420, 500, { fit: "inside" }).toBuffer();
const text = Buffer.from('<svg width="1200" height="630"><text x="510" y="265" fill="#f5f2ff" font-family="Arial,sans-serif" font-size="64" font-weight="bold">ROAST ME AI</text><text x="510" y="335" fill="#d8a6ff" font-family="Arial,sans-serif" font-size="30">Pick a persona. Get roasted.</text><text x="510" y="410" fill="#bbb3ce" font-family="Arial,sans-serif" font-size="22">Same jokes. Higher standards.</text></svg>');
await sharp({ create: { width: 1200, height: 630, channels: 4, background: "#090a20" } }).composite([{ input: art, left: 45, top: 65 }, { input: text }]).png().toFile(fileURLToPath(new URL("public/social-preview.png", root)));
console.log("Social preview generated.");
