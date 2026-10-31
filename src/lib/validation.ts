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

// This is an output guard. User wording is roast material, so profanity,
// slang, insults, and quoted slurs are not blocked before generation.
const highRiskPatterns = [
  /\b(?:kill|hurt|harm)\s+(?:myself|yourself|himself|herself|themself|someone|somebody)\b/i,
  /\b(?:suicide|suicidal|self[- ]harm)\b/i,
  /\b(?:csam|child\s*(?:porn|sexual\s*(?:abuse|exploitation))|sexual(?:ly)?\s+exploit(?:ing)?\s+(?:a\s+)?minor)\b/i,
  /\b(?:how|ways?|instructions?|guide|steps?|help(?:\s+me)?)\b.{0,80}\b(?:make|build|buy|detonate)\b.{0,50}\b(?:bomb|explosive|weapon)\b/i,
];

export function isUnsafe(text: string) {
  return (
    highRiskPatterns.some((pattern) => pattern.test(text)) ||
    isPersonaEscapeAttempt(text)
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

const personaEscapePatterns = [
  /\b(?:ignore|disregard|forget|override|bypass)\b.{0,80}\b(?:system|developer|hidden|previous|safety)?\s*(?:instructions?|prompt|rules?)\b/i,
  /\b(?:reveal|show|print|repeat|quote|dump|list)\b.{0,80}\b(?:system|developer|hidden|internal)\s*(?:instructions?|prompt|message)?\b/i,
  /\b(?:break|leave|drop|exit|stop being|step out of)\b.{0,50}\b(?:character|persona|role|roast)\b/i,
  /\b(?:jailbreak|prompt injection|developer mode|dan mode|system message)\b/i,
];

const implementationQuestionPatterns = [
  /\b(?:what|which|tell me|explain|how|where|show|give|reveal|list)\b.{0,80}\b(?:ai\s+)?(?:model|model name|model version|api(?:\s*key)?|provider|endpoint|system prompt|developer message)\b/i,
  /\b(?:ai\s+)?(?:model|api(?:\s*key)?|provider|endpoint|system prompt|developer message)\b.{0,80}\b(?:what|which|tell|explain|how|where|show|give|reveal|list)\b/i,
  /\b(?:groq|gemini|openai)\b.{0,60}\b(?:model|api|key|endpoint|prompt)\b/i,
];

export function isPersonaEscapeAttempt(text: string) {
  return [...personaEscapePatterns, ...implementationQuestionPatterns].some(
    (pattern) => pattern.test(text),
  );
}

export function isImplementationResponse(text: string) {
  return [
    /\b(?:as an ai|as a language model|i am an ai|i'm an ai|large language model)\b/i,
    /\b(?:my|the|this)\s+(?:model|api|system prompt|developer prompt|hidden instructions)\b/i,
    /\b(?:api key|system prompt|developer message|prompt injection|developer mode)\b/i,
    /\b(?:groq|gemini|openai)\s+(?:model|api|endpoint|key)\b/i,
  ].some((pattern) => pattern.test(text));
}
