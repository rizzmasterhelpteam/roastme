import Link from "next/link";
import { publicContent, type PublicPageKey } from "@/lib/site";
import { SiteSchema } from "./schema";
export function PublicPage({ kind }: { kind: PublicPageKey }) {
  const page = publicContent[kind];
  return <>
    <SiteSchema page={{ type: kind === "blog" ? "CollectionPage" : kind === "about" ? "AboutPage" : "WebPage", title: page.title, path: "/" + kind, description: page.description }} />
    {kind === "blog" ? <div className="journal"><header className="journal-heading"><p className="journal-label"><span /> THE ROAST JOURNAL</p><h1>A little wit.<br /><em>A lot of personality.</em></h1><p>Ideas, guides, and everything worth sharing from the world of Roast Me AI.</p></header><div className="journal-divider"><span>THE LATEST</span><span>ROAST ME AI / JOURNAL</span></div><section className="journal-waiting" aria-labelledby="coming-soon"><div className="journal-mark" aria-hidden="true">✳</div><p className="journal-label">THE FIRST POST IS ON ITS WAY</p><h2 id="coming-soon">Nothing here yet.<br /><em>Give us a minute.</em></h2><p>We’re putting together our first articles. Until then, the roast room is open.</p><Link className="journal-button" href="/">Start roasting <span aria-hidden="true">↗</span></Link></section></div> : <><header className="web-hero"><p className="web-eyebrow">{page.eyebrow}</p><h1>{page.heading}</h1><p className="web-intro">{page.description}</p></header><div className="web-sections">{page.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}<Link className="web-cta" href="/">Enter the roast room <span aria-hidden="true">↗</span></Link></div></>}
    <aside className="web-related"><h2>Explore Roast Me AI</h2><Link href="/about">Meet the personalities</Link><Link href="/help">How it works</Link><Link href="/guidelines">Community guidelines</Link><Link href="/blog">The blog</Link></aside>
  </>;
}
