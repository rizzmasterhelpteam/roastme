import Link from "next/link";
import { publicContent, type PublicPageKey } from "@/lib/site";
import { SiteSchema } from "./schema";
export function PublicPage({ kind }: { kind: PublicPageKey }) {
  const page = publicContent[kind];
  return <>
    <SiteSchema page={{ type: kind === "blog" ? "CollectionPage" : kind === "about" ? "AboutPage" : "WebPage", title: page.title, path: "/" + kind, description: page.description }} />
    {kind === "blog" ? <div className="journal"><header className="journal-heading"><p className="journal-label"><span /> THE ROAST JOURNAL</p><h1>A little wit.<br /><em>A lot of personality.</em></h1><p>Ideas, guides, and everything worth sharing from the world of Roast Me AI.</p></header><div className="journal-divider"><span>THE LATEST</span><span>ROAST ME AI / JOURNAL</span></div><section className="journal-stories" aria-label="Latest stories"><Link className="story-card" href="/blog/the-birthday-cake-next-door"><picture><source srcSet="/birthday-cake-story.webp" type="image/webp" /><img src="/birthday-cake-story.jpg" alt="A birthday cake, a curious cat and an amused neighbour" width="1400" height="933" /></picture><div><p className="journal-label">FUNNY SHORT STORY · FICTION</p><h2>The Birthday Cake Next Door</h2><p>All Rahul had to do was deliver a cake. Naturally, the cat had other plans.</p><span>Read the story ↗</span></div></Link></section></div> : <><header className="web-hero"><p className="web-eyebrow">{page.eyebrow}</p><h1>{page.heading}</h1><p className="web-intro">{page.description}</p></header><div className="web-sections">{page.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}<Link className="web-cta" href="/">Enter the roast room <span aria-hidden="true">↗</span></Link></div></>}
    <aside className="web-related"><h2>Explore Roast Me AI</h2><Link href="/about">Meet the personalities</Link><Link href="/help">How it works</Link><Link href="/guidelines">Community guidelines</Link><Link href="/blog">The blog</Link></aside>
  </>;
}
