import { z } from "zod";
export const generationSchema = z.object({
  prompt: z.string().trim().min(2).max(1500),
  persona: z.enum(["savage", "grandma", "ceo", "cat", "robot", "drama"]),
  level: z.enum(["Light", "Spicy", "Savage", "Nuclear"]).default("Spicy"),
  chaos: z.number().int().min(0).max(100).default(50),
  type: z.enum(["text", "chat", "image", "battle"]).default("text"),
  opponent: z
    .enum(["savage", "grandma", "ceo", "cat", "robot", "drama"])
    .optional(),
  image: z.string().max(7200000).optional(),
  requestId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
});
export const reportReasons = [
  "Hateful or discriminatory content",
  "Harassment or bullying",
  "Sexual or explicit content",
  "Threats or violence",
  "Spam or low quality",
  "Other",
];
export function isUnsafe(text: string) {
  return /\b(kill yourself|kill myself|suicide|self[- ]harm|racial slur|rape|child porn|molest|ethnic cleansing|make a bomb|death threat)\b/i.test(
    text,
  );
}
export function imageType(data: string) {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
    data,
  );
  if (!m) throw new Error("Choose a JPG, PNG, or WebP image.");
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > 5 * 1024 * 1024 || bytes.length < 12)
    throw new Error("Images must be smaller than 5 MB.");
  const valid =
    m[1] === "image/png"
      ? bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : m[1] === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP";
  if (!valid) throw new Error("The image contents do not match its file type.");
  return { mime: m[1], base64: m[2], bytes };
}
