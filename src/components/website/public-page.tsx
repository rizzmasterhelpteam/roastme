import Link from "next/link";
import { publicContent, type PublicPageKey } from "@/lib/site";
import { SiteSchema } from "./schema";
export function PublicPage({ kind }: { kind: PublicPageKey }) {
  const page = publicContent[kind];
  return <>
    <SiteSchema page={{ type: kind === "blog" ? "CollectionPage" : kind === "about" ? "AboutPage" : "WebPage", title: page.title, path: "/" + kind, description: page.description }} />
    <header className="web-hero"><p className="web-eyebrow">{page.eyebrow}</p><h1>{page.heading}</h1><p className="web-intro">{page.description}</p></header>
    {kind === "blog" ? <section className="web-empty" aria-labelledby="coming-soon"><span aria-hidden="true">✦</span><h2 id="coming-soon">Articles coming soon</h2><p>We’re making room for fresh perspectives on playful roasts and the personalities behind them. There are no articles published yet.</p><Link className="web-cta" href="/">Start roasting <span aria-hidden="true">↗</span></Link></section> : <div className="web-sections">{page.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}<Link className="web-cta" href="/">Enter the roast room <span aria-hidden="true">↗</span></Link></div>}
    <aside className="web-related"><h2>Explore Roast Me AI</h2><Link href="/about">Meet the personalities</Link><Link href="/help">How it works</Link><Link href="/guidelines">Community guidelines</Link><Link href="/blog">The blog</Link></aside>
  </>;
}
