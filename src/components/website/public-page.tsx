import Link from "next/link";
import { publicContent, type PublicPageKey } from "@/lib/site";
import { SiteSchema } from "./schema";
export function PublicPage({ kind }: { kind: PublicPageKey }) {
  const page = publicContent[kind];
  return <>
    <SiteSchema page={{ type: kind === "blog" ? "CollectionPage" : kind === "about" ? "AboutPage" : "WebPage", title: page.title, path: "/" + kind, description: page.description }} />
    {kind === "blog" ? <div className="journal"><header className="journal-hero"><div><p className="journal-label"><span /> THE ROAST JOURNAL</p><h1>Good jokes.<br /><em>Better burns.</em></h1><p className="journal-intro">A little corner of the internet for roast ideas, personality guides, and a healthy dose of humor.</p><a href="#coming-soon" className="journal-explore">Explore the journal <span aria-hidden="true">↓</span></a></div><div className="journal-art" aria-hidden="true"><div className="journal-orbit" /><img src="/brand/savage.webp?v=complete-20261106" alt="" /><span>✦</span></div></header><section className="journal-empty" aria-labelledby="coming-soon"><div className="journal-empty-icon" aria-hidden="true">✦</div><div><p className="journal-label">FRESH FROM THE ROAST ROOM</p><h2 id="coming-soon">Articles coming soon.</h2><p>We’re cooking up something good. In the meantime, pick a persona and see what the heat is about.</p><Link className="journal-button" href="/">Start roasting <span aria-hidden="true">↗</span></Link></div></section></div> : <><header className="web-hero"><p className="web-eyebrow">{page.eyebrow}</p><h1>{page.heading}</h1><p className="web-intro">{page.description}</p></header><div className="web-sections">{page.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}<Link className="web-cta" href="/">Enter the roast room <span aria-hidden="true">↗</span></Link></div></>}
    <aside className="web-related"><h2>Explore Roast Me AI</h2><Link href="/about">Meet the personalities</Link><Link href="/help">How it works</Link><Link href="/guidelines">Community guidelines</Link><Link href="/blog">The blog</Link></aside>
  </>;
}
