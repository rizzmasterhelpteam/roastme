import { SITE_URL } from "@/lib/site";
export const dynamic = "force-static";
export function GET() {
  return new Response(`# Roast Me AI\n\n> Playful AI comedy with six personas: Savage, Grandma, CEO, Judgy Cat, Robot, and Drama Queen.\n\nText roasts, photo roasts, and roast battles are entertainment, not factual judgments or professional advice. Chaos and reply length can be adjusted. Private conversations and account data are not public content.\n\n## Public pages\n- [Roast room](${SITE_URL}/): Start using the app.\n- [About](${SITE_URL}/about): Product and personas.\n- [Help](${SITE_URL}/help): Controls, daily credits, saving, and reporting.\n- [Guidelines](${SITE_URL}/guidelines): Consent and humor boundaries.\n- [Blog](${SITE_URL}/blog): Articles coming soon; no posts are published yet.\n- [Sitemap](${SITE_URL}/sitemap.xml)\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
