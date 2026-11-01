import Link from "next/link";

export function WebsitePageLinks() {
  return <nav className="website-page-links" aria-label="Explore Roast Me AI">
    {[["/about", "About"], ["/blog", "Blog"], ["/help", "Help"], ["/guidelines", "Guidelines"], ["/privacy", "Privacy"], ["/terms", "Terms"]].map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}
  </nav>;
}
