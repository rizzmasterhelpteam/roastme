import Link from "next/link";
import { pageMetadata } from "@/lib/site";
import { StoryAd, StoryPoll } from "@/components/website/story-elements";

export const metadata = pageMetadata(
  "/blog/brother-wedding-dinner-invoice",
  "AITA for Walking Out of My Brother's Wedding Over a Dinner Bill?",
  "I flew across the country and gave a $300 gift. Then the envelopes arrived at the dinner tables."
);

export default function WeddingInvoiceStory() {
  return (
    <article className="story">
      <Link href="/blog" className="story-back">
        ← Back to all stories
      </Link>

      <p className="journal-label">AITA · FAMILY DRAMA · 4 MIN READ</p>
      <h1>AITA for walking out of my brother&apos;s wedding after being handed a $120 invoice for dinner?</h1>
      <p className="story-deck">
        I spent over $1,400 to be there and put $300 cash in their card box. Then the envelopes showed up at the reception.
      </p>

      {/* Featured Header Image */}
      <figure className="story-figure">
        <picture>
          <img
            src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80"
            alt="Wedding reception dinner table with place cards and glassware"
            width="1200"
            height="800"
            loading="eager"
          />
        </picture>
      </figure>

      <div className="story-body">
        <p>
          My older brother Mark got married last Saturday to his girlfriend of three years, Chloe. I like Chloe fine, but she has always had champagne taste on a beer budget.
        </p>

        <p>
          When they got engaged last fall, Mark called me all excited to say they booked a high-end botanical venue for the reception. I wanted to support him, so I didn&apos;t hold back. I bought cross-country flights for $580, paid $210 to rent the specific tailored suit he asked the wedding party to wear, stayed two nights in their block hotel for $340, and dropped an envelope with $300 cash into their card box during cocktail hour.
        </p>

        <p>
          All in, I was down about $1,400 just to be there. The ceremony was great, the weather held up, and everyone was in high spirits.
        </p>

        <p>
          Then we sat down in the main room for dinner.
        </p>

        {/* In-article Image 1 */}
        <figure className="story-figure">
          <picture>
            <img
              src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80"
              alt="Guests seated at a banquet dinner table"
              width="1200"
              height="800"
              loading="lazy"
            />
          </picture>
        </figure>

        <p>
          Right after the wedding party made their entrance, the staff started walking between the tables. Instead of pouring drinks or bringing out bread, they began placing small cream-colored envelopes right beside everyone&apos;s forks.
        </p>

        <p>
          I opened mine thinking it was a thank-you note or a souvenir menu card.
        </p>

        <p>
          It was an invoice.
        </p>

        <blockquote className="story-quote">
          <p>
            &ldquo;To our guests: Tonight&apos;s five-course meal is curated by a private chef. Guest contribution: $120.00 per plate. Venmo / Cash accepted at the welcome desk.&rdquo;
          </p>
        </blockquote>

        <p>
          I honestly thought it was a prank until I looked around the table. My 68-year-old aunt was putting on her glasses with a look of pure confusion. Two of our younger cousins, who are still in college working summer jobs, were staring at each other with their jaws on the floor.
        </p>

        {/* 30% Mark Ad */}
        <StoryAd variant="mid" />

        <p>
          When Mark came over to our table to greet people, I pulled him aside and asked what was going on. I literally asked him if the caterer made a printing mistake.
        </p>

        <p>
          Mark got defensive immediately. He flushed red and whispered, &ldquo;Chloe really wanted this chef, but the food ended up $14,000 over our budget. Her planner said people pay $120 for a nice dinner out anyway, so we figured guests wouldn&apos;t mind chipping in.&rdquo;
        </p>

        <p>
          I told him, &ldquo;Mark, you invited people to a wedding. You don&apos;t charge admission to dinner after people bought flights and brought gifts.&rdquo;
        </p>

        <p>
          He looked annoyed and told me, &ldquo;If you can&apos;t pay it right now, Chloe said you can pay in installments next week. Just don&apos;t make a scene.&rdquo;
        </p>

        <p>
          <em>Installments. For a dinner at my own brother&apos;s wedding.</em>
        </p>

        <p>
          That was it for me. I stood up, walked over to the gift table near the entrance, found the envelope with my name on it containing the $300 cash, put it in my pocket, and walked out to my car.
        </p>

        {/* In-article Image 2 */}
        <figure className="story-figure">
          <picture>
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80"
              alt="Person looking down at phone screen while contemplating"
              width="1200"
              height="800"
              loading="lazy"
            />
          </picture>
        </figure>

        <p>
          I drove down the road to a normal 24-hour diner, ordered a burger and fries, and ate in peace.
        </p>

        <p>
          About twenty minutes later, my phone started ringing off the hook.
        </p>

        <p>
          Chloe sent me four furious texts in a row. She noticed my card was missing from the gift table and called it &ldquo;literal theft.&rdquo; She said I humiliated her in front of her family and ruined her wedding night.
        </p>

        <p>
          My mom called me crying, saying that even if Chloe made a weird choice, family always sticks together. She told me I should have just paid the $120 and talked to Mark about it after the honeymoon.
        </p>

        <p>
          Then Mark texted me: <em>&ldquo;You walked out over a hundred bucks. We&apos;re done until you apologize to Chloe and send the money.&rdquo;</em>
        </p>

        <p>
          Meanwhile, my college cousins texted me from the bathroom. They didn&apos;t have $120 in their checking accounts and had to call their parents to transfer them money so they wouldn&apos;t be embarrassed in front of the room.
        </p>

        {/* 80% Mark Ad */}
        <StoryAd variant="bottom" />

        <p>
          It&apos;s been three days now. Half the family is telling me I was childish for taking back my gift and leaving. The other half is quietly agreeing that handing out invoices at a wedding reception is the tackiest thing they&apos;ve ever seen.
        </p>

        <p>
          I don&apos;t think I did anything wrong, but my mom won&apos;t stop calling me in tears. So I wanted an outside opinion.
        </p>

        {/* Interactive Reader Poll */}
        <StoryPoll />
      </div>

      <aside className="story-submit">
        <h2>Have your own story to share?</h2>
        <p>
          Dealing with weird family drama, bad roommates, or unreasonable friends? Send your story to{" "}
          <a href="mailto:vantalumstudio@gmail.com?subject=Story%20Submission">
            vantalumstudio@gmail.com
          </a>
          . Names are changed for privacy.
        </p>
      </aside>
    </article>
  );
}
