import Link from "next/link";
import { pageMetadata } from "@/lib/site";
import { StoryAd, StoryPoll } from "@/components/website/story-elements";

export const metadata = pageMetadata(
  "/blog/brother-wedding-dinner-invoice",
  "AITA for Walking Out of a Wedding After Being Handed a $120 Invoice for Dinner?",
  "I flew across the country, rented a suit, and gave a $300 wedding gift. Then the envelopes arrived at the dinner tables."
);

export default function WeddingInvoiceStory() {
  return (
    <article className="story">
      <Link href="/blog" className="story-back">
        ← Back to all stories
      </Link>

      <p className="journal-label">FICTIONAL DILEMMA · FAMILY & WEDDING DRAMA · 4 MIN READ</p>
      <h1>AITA for Walking Out of My Brother’s Wedding After Being Handed a $120 Invoice for Dinner?</h1>
      <p className="story-deck">
        I flew across the country and gave a $300 gift. Then the envelopes arrived at the table.
      </p>

      {/* Featured Image */}
      <picture>
        <img
          src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80"
          alt="Elegant wedding table setting with place cards and dinnerware"
          width="1200"
          height="800"
          loading="eager"
        />
      </picture>

      <div className="story-body">
        <p>
          My older brother, Mark (31M), got married this past Saturday to his fiancée of three years, Chloe (29F). I genuinely like Chloe as a person, but she has always possessed an expensive aesthetic taste that doesn&apos;t quite match reality.
        </p>

        <p>
          When they announced their engagement last fall, Mark privately told me they had secured a breathtaking botanical conservatory for the reception. I was thrilled for them. I booked cross-country flights (\$580), rented the tailored suit requested for the wedding party (\$210), stayed in their designated block hotel (\$340), and dropped a card with \$300 cash into their card box during the post-ceremony cocktail hour.
        </p>

        <p>
          Between travel, attire, and gifts, I was well over \$1,400 invested in supporting my brother&apos;s milestone day. The ceremony was moving, the photos on the lawn were sunny, and spirits were soaring.
        </p>

        <p>
          Then we sat down in the grand ballroom for the formal dinner.
        </p>

        {/* Mid-Story Image #1 (Around 250-300 words) */}
        <picture>
          <img
            src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80"
            alt="Wedding guests seated at an opulent dinner hall during reception"
            width="1200"
            height="800"
            loading="lazy"
          />
        </picture>

        <p>
          As the bridal party made their grand entrance and the cheers subsided, three venue coordinators began walking through the tables. Instead of pouring wine or serving bread, they began placing crisp, cream-colored envelopes directly in front of each guest&apos;s plate.
        </p>

        <p>
          I opened mine expecting a personalized thank-you note or a souvenir menu. Instead, printed on gold-foiled cardstock was an itemized receipt:
        </p>

        <blockquote className="story-quote">
          <p>
            <em>&ldquo;To our cherished guests: In celebration of our union, tonight&apos;s five-course culinary experience is curated by Chef Julian. Guest Contribution: $120.00 per plate. Venmo / Cash accepted at the reception desk.&rdquo;</em>
          </p>
        </blockquote>

        <p>
          I blinked, convinced it was some sort of inside joke or a theatrical comedy bit. But I glanced at the tables around me. Our elderly aunt was putting on her reading glasses with a horrified squint. Two of our younger cousins, both working minimum-wage summer internships, were staring at each other in utter disbelief.
        </p>

        {/* 30% MARK AD: ROAST ME AI REALITY CHECK */}
        <StoryAd variant="mid" />

        <p>
          I leaned over toward Mark when he came by our table to say hello. I whispered, &ldquo;Mark, what is this envelope? Did the caterer make a catastrophic printing error?&rdquo;
        </p>

        <p>
          Mark flushed bright red, cleared his throat, and lowered his voice. &ldquo;Look, Chloe had her heart set on this Michelin-rated catering company, but it pushed the reception budget \$14,000 over our ceiling. Chloe’s planner suggested this. We figured \$120 is what people would pay for a nice dinner out anyway.&rdquo;
        </p>

        <p>
          &ldquo;Mark, you invited people to celebrate your wedding. You don&apos;t charge admission to a banquet after people bought flights and brought gifts,&rdquo; I said.
        </p>

        <p>
          &ldquo;Please don&apos;t cause a scene,&rdquo; he hissed. &ldquo;If you can&apos;t cover it right now, Chloe said we can do installments next week.&rdquo;
        </p>

        <p>
          <em>Installments for a wedding dinner I never agreed to buy.</em>
        </p>

        <p>
          That was the breaking point. I stood up from the table. Without raising my voice, I walked over to the gift table by the entryway, picked up the card envelope with my name on it containing the \$300 cash, slipped it back into my breast pocket, and walked out of the conservatory into the parking lot.
        </p>

        {/* Image #2: The Emotional Fallout */}
        <picture>
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80"
            alt="Person holding phone with concerned expression while contemplating a difficult situation"
            width="1200"
            height="800"
            loading="lazy"
          />
        </picture>

        <p>
          I drove straight to an all-night diner three miles down the highway, ordered a \$14 bacon cheeseburger and a milkshake, and ate in sweet, peaceful silence.
        </p>

        <p>
          Within twenty minutes, my phone began vibrating like an electric drill.
        </p>

        <p>
          Chloe sent a barrage of texts accusing me of being &ldquo;a cheap, jealous saboteur&rdquo; who tried to ruin her wedding aesthetic and humiliate her in front of her sorority sisters. She noticed my card was missing from the gift table and called it &ldquo;literal theft.&rdquo;
        </p>

        <p>
          My mother called me in tears, saying that even if Chloe made a questionable decision, family is supposed to swallow their pride and support each other. &ldquo;You’re his younger brother,&rdquo; she sobbed. &ldquo;You should have just swiped your card and talked to him on Monday.&rdquo;
        </p>

        <p>
          Mark sent me a single text: <em>&ldquo;You humiliated me at my own wedding over a hundred bucks. We’re done until you apologize to Chloe and wire the money.&rdquo;</em>
        </p>

        <p>
          Meanwhile, my college cousins texted me from the bathroom: <em>&ldquo;We didn&apos;t have \$120 in our checking accounts. We had to Venmo our mom to spot us so we wouldn&apos;t get escorted out. You were the only smart one who escaped.&rdquo;</em>
        </p>

        {/* 80% MARK AD: ROAST ME AI ROAST BATTLE */}
        <StoryAd variant="bottom" />

        <p>
          It has been three days. Half of my extended family is calling me selfish, stubborn, and petty for taking back my gift and abandoning my brother on his wedding night.
        </p>

        <p>
          The other half is quietly admitting that charging guests \$120 per plate at a reception is the most audacious, tacky thing they have ever witnessed in their lives.
        </p>

        <p>
          I refuse to apologize. But the sheer volume of angry family calls is starting to make me wonder if I really went too far by walking out.
        </p>

        {/* Interactive Reader Poll */}
        <StoryPoll />
      </div>

      <aside className="story-submit">
        <h2>Got your own wild story or dilemma?</h2>
        <p>
          Have you dealt with unreasonable family demands, wedding catastrophes, or bad roommate drama? Share your anonymous story with our editorial team at{" "}
          <a href="mailto:vantalumstudio@gmail.com?subject=AITA%20Story%20Submission">
            vantalumstudio@gmail.com
          </a>
          .
        </p>
      </aside>
    </article>
  );
}
