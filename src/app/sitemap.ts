import type { MetadataRoute } from "next";
import { SITE_URL, publicPaths } from "@/lib/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return [...publicPaths, "/blog/the-birthday-cake-next-door"].map(path => ({ url: SITE_URL + path }));
}
