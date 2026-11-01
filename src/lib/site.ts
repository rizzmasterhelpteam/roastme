import type { Metadata } from "next";
export const SITE_URL = "https://www.roastme-ai.com";
export const publicPaths = ["/", "/blog", "/about", "/help", "/guidelines"] as const;
export const publicContent = {
  blog: { title: "Roast Me AI Blog", description: "The future home of playful roast ideas, persona guides, and tips for getting more from Roast Me AI.", eyebrow: "THE ROAST JOURNAL", heading: "Good comedy starts with a little perspective.", sections: [] },
  about: { title: "About Roast Me AI", description: "Meet Roast Me AI: six comedy personas, text and photo roasts, and playful roast battles.", eyebrow: "SAME JOKES. HIGHER STANDARDS.", heading: "A little self-awareness. A lot of personality.", sections: [
    ["Six personalities. Your kind of funny.", "Choose Savage, Grandma, CEO, Judgy Cat, Robot, or Drama Queen. Each has a distinct comedy style, from sweet shade to blunt punchlines."],
    ["Make it your roast", "Send a message, upload a photo you have permission to use, or enter a roast battle. Adjust chaos for sharper, more unpredictable humor and choose a short, medium, or long reply."],
    ["Entertainment with boundaries", "Roasts are generated comedy, not factual judgments or professional advice. Keep the joke about harmless choices, and roast only yourself, fictional personas, or consenting adults."],
  ] },
  help: { title: "Roast Me AI Help", description: "Learn how to use personas, chaos controls, daily credits, saved roasts, and reporting in Roast Me AI.", eyebrow: "A LITTLE HELP WITH THE HEAT", heading: "Find your way around the roast room.", sections: [
    ["How do I start?", "Continue as a guest or sign in, choose a persona, and send your message. Use the persona menu to try a different comedy style."],
    ["How do credits work?", "Free credits reset to 5 at 00:00 UTC every day; unused credits do not accumulate. Text replies use 1 credit, image roasts use 2, and a three-round battle uses 3, charged one completed round at a time. Failed or blocked generations do not use credits."],
    ["How do I change the replies?", "Open roast controls to adjust chaos and choose short, medium, or long replies. Higher chaos asks for more unpredictable angles and sharper punchlines. Your chosen controls are remembered on your device."],
    ["Can I save or report a roast?", "Use the save action beneath a response to keep it in Saved burns. Use Report to flag a response, select a reason, and optionally explain the issue. Account and settings contains your history and account controls."],
    ["What if a request fails?", "Check your internet connection and try again shortly. If the service reports an API quota or configuration issue, the app operator must resolve it. Avoid repeatedly resending the same message."],
  ] },
  guidelines: { title: "Roast Me AI Community Guidelines", description: "Our rules for playful, consensual roast humor: keep the heat, respect boundaries, and report harmful responses.", eyebrow: "ALL FIRE. NO HATE.", heading: "Keep the heat. Keep the humanity.", sections: [
    ["Make it specific, keep it playful", "Your procrastination, coffee habit, or carefully planned outfit can be good comedy material. Focus on harmless choices instead of identity or personal worth."],
    ["Consent comes first", "Roast yourself, fictional personas, or adults who clearly agreed. Do not use the app to bully classmates, coworkers, strangers, or other non-consenting people."],
    ["Where we draw the line", "No hateful slurs, protected-trait attacks, exploitation, threats, self-harm encouragement, sexual content involving minors, or trauma-based insults. Increasing chaos does not remove these boundaries."],
    ["Report a response", "Use the Report action beneath a generated reply if something crosses the line. Reports are stored for review by the app operator."],
  ] },
} as const;
export type PublicPageKey = keyof typeof publicContent;
export function pageMetadata(path: string, title: string, description: string, index = true): Metadata {
  return { title, description, alternates: { canonical: SITE_URL + path }, robots: { index, follow: true }, openGraph: { title, description, url: SITE_URL + path, type: "website", images: [{ url: SITE_URL + "/social-preview.png", width: 1200, height: 630 }] }, twitter: { card: "summary_large_image", title, description, images: [SITE_URL + "/social-preview.png"] } };
}
const screens: Record<string, string> = { home: "Roast room", text: "Roast my text", battle: "Roast battle", saved: "Saved burns", image: "Photo roast", history: "Roast history", rewards: "Daily rewards", premium: "Premium", onboarding: "Welcome", "sign-in": "Sign in", "link-account": "Link account", safety: "Safety notice", profile: "Account", settings: "Account and settings", subscription: "Subscription", "delete-account": "Delete account", controls: "Roast controls", privacy: "Privacy policy", terms: "Terms of service" };
const personas = ["savage", "grandma", "ceo", "cat", "robot", "drama"];
export function screenPath(segments: string[]) {
  if (!segments.length) return true;
  const [head, second] = segments;
  if (segments.length === 1 && (head in screens || head === "chat" || head === "persona" || head === "share")) return true;
  if (segments.length !== 2) return false;
  return ((head === "chat" || head === "persona") && personas.includes(second)) || (head === "battle" && second === "live") || (head === "auth" && second === "callback") || (head === "share" && /^[0-9a-f-]{36}$/i.test(second));
}
export function screenMetadata(segments: string[]) {
  const path = "/" + segments.join("/");
  return pageMetadata(path, segments.length ? `${screens[segments[0]] || "Roast Me AI"} | Roast Me AI` : "Roast Me AI — Pick a persona. Get roasted.", "Choose from six comedy personas for playful AI text roasts, photo roasts, and roast battles. Set your chaos and reply length in the roast room.", !segments.length);
}
