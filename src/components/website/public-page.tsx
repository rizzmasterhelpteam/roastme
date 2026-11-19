import Link from "next/link";
import { publicContent, type PublicPageKey } from "@/lib/site";
import { SiteSchema } from "./schema";
export function PublicPage({ kind }: { kind: PublicPageKey }) {
  const page = publicContent[kind];
  return <>
    <SiteSchema page={{ type: kind === "blog" ? "CollectionPage" : kind === "about" ? "AboutPage" : "WebPage", title: page.title, path: "/" + kind, description: page.description }} />
    {kind === "blog" ? <div className="journal"><header className="journal-heading"><p className="journal-label"><span /> THE ROAST JOURNAL</p><h1>A little wit.<br /><em>A lot of personality.</em></h1><p>Funny short stories, awkward dilemmas, and everyday drama with a sharp twist.</p></header><div className="journal-divider"><span>THE LATEST</span><span>ROAST ME AI / JOURNAL</span></div><section className="journal-stories" aria-label="Latest stories">
      <Link className="story-card" href="/blog/brother-wedding-dinner-invoice">
        <picture>
          <img src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80" alt="Wedding dinner table setting with place cards" width="1200" height="800" />
        </picture>
        <div>
          <p className="journal-label">FICTIONAL DILEMMA · FAMILY & WEDDING DRAMA</p>
          <h2>AITA for Walking Out of My Brother’s Wedding After Being Handed a $120 Invoice for Dinner?</h2>
          <p>I flew across the country and gave a $300 gift. Then the envelopes arrived at the table.</p>
          <span>Read the story ↗</span>
        </div>
      </Link>
      <Link className="story-card" href="/blog/the-birthday-cake-next-door" style={{ marginTop: "28px" }}>
        <picture>
          <source srcSet="/birthday-cake-story-v2.webp" type="image/webp" />
          <img src="/birthday-cake-story-v2.jpg" alt="A birthday cake, a curious cat and an amused neighbour" width="1400" height="933" />
        </picture>
        <div>
          <p className="journal-label">FUNNY SHORT STORY · FICTION</p>
          <h2>The Birthday Cake Next Door</h2>
          <p>All Alex had to do was deliver a cake. Naturally, the cat had other plans.</p>
          <span>Read the story ↗</span>
        </div>
      </Link>
    </section></div> : <><header className="web-hero"><p className="web-eyebrow">{page.eyebrow}</p><h1>{page.heading}</h1><p className="web-intro">{page.description}</p></header><div className="web-sections">{page.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}<Link className="web-cta" href="/">Enter the roast room <span aria-hidden="true">↗</span></Link></div></>}
    <aside className="web-related"><h2>Explore Roast Me AI</h2><Link href="/about">Meet the personalities</Link><Link href="/help">How it works</Link><Link href="/guidelines">Community guidelines</Link><Link href="/blog">The blog</Link></aside>
  </>;
}
