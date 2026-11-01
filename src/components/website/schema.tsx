import { SITE_URL } from "@/lib/site";
export function SiteSchema({ page }: { page?: { type: string; title: string; path: string; description: string } }) {
  const graph = [
    { "@type": "Organization", "@id": SITE_URL + "/#organization", name: "Roast Me AI", url: SITE_URL, logo: SITE_URL + "/logo.png" },
    { "@type": "WebSite", "@id": SITE_URL + "/#website", name: "Roast Me AI", url: SITE_URL, publisher: { "@id": SITE_URL + "/#organization" } },
    ...(page ? [{ "@type": page.type, name: page.title, description: page.description, url: SITE_URL + page.path, isPartOf: { "@id": SITE_URL + "/#website" } }] : []),
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c") }} />;
}
