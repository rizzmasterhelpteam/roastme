import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/profile", "/settings", "/history", "/saved", "/chat", "/image", "/share", "/subscription", "/delete-account", "/sign-in", "/link-account", "/controls", "/rewards", "/onboarding", "/premium", "/battle", "/text", "/safety"] }, sitemap: SITE_URL + "/sitemap.xml" };
}
