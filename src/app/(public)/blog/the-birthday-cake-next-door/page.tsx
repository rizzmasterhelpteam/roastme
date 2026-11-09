import Link from "next/link";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("/blog/the-birthday-cake-next-door", "The Birthday Cake Next Door | A Funny Short Story", "A birthday cake, a suspicious neighbour, and one very determined cat turn a simple delivery into a funny short story.");

export default function BirthdayCakeStory() {
  return <article className="story"><Link href="/blog" className="story-back">← Back to the journal</Link><p className="journal-label">A FUNNY SHORT STORY · FICTION</p><h1>The Birthday Cake Next Door</h1><p className="story-deck">All Rahul had to do was deliver a cake. Naturally, the cat had other plans.</p><picture><source srcSet="/birthday-cake-story.webp" type="image/webp" /><img src="/birthday-cake-story.jpg" alt="A man holding a pink birthday cake as a cat reaches for the frosting and a neighbour looks on" width="1400" height="933" /></picture><div className="story-body">
    <p>The cake arrived at 4:07, just as Rahul was explaining to his mother that he was perfectly capable of looking after himself.</p>
    <p>“Wonderful,” she said. “Then you can also take this to Mrs. D’Souza next door. It’s her birthday.”</p>
    <p>Rahul opened the box. The cake was pink, enormous, and had <strong>RAHUL</strong> written across it in proud white icing.</p>
    <p>“Why does it have my name on it?”</p>
    <p>“The bakery made a mistake,” his mother said. “Just tell her it’s a modern design.”</p>
    <p>Rahul had planned to replace the name with candles. He found five. Unfortunately, his mother had told Mrs. D’Souza he was bringing enough for her age.</p>
    <p>He was considering whether five candles could represent several decades when Mrs. D’Souza appeared at the kitchen door.</p>
    <p>“Your front door was open,” she said. “I brought back your container.”</p>
    <p>She placed a spotless plastic box on the table. It was the exact size of the one Rahul had been looking for since June. It was also full of her biscuits.</p>
    <p>“Happy birthday!” Rahul said, holding the cake in front of its name.</p>
    <p>“How thoughtful. Whose birthday?”</p>
    <p>Before he could answer, Mrs. D’Souza’s cat leapt onto the counter, stretched its neck and removed a generous curl of frosting. Rahul turned the cake to hide the damage. This revealed his name.</p>
    <p>Mrs. D’Souza put on her glasses. “Rahul?”</p>
    <p>“It’s a modern design.”</p>
    <p>She stared at him. Then she laughed so hard she had to sit down.</p>
    <p>“Your mother called me this morning,” she said. “She said you’d be suspicious about the name.”</p>
    <p>Rahul checked the calendar. It was his birthday. He had forgotten because he’d spent the whole week organizing a surprise dinner for his friend, who had just texted to say the reservation was actually next Friday.</p>
    <p>His mother walked in carrying a camera. “Did you surprise her?”</p>
    <p>“Absolutely,” said Mrs. D’Souza. “He even invited the cat.”</p>
    <p>The cat, meanwhile, had eaten the letter R. Rahul looked down at the cake.</p>
    <p>“Happy birthday, Ahul,” said his mother.</p>
    <p>He made a wish, blew out the five candles, and accepted a biscuit from his own container. It was, he had to admit, a modern design.</p>
  </div><aside className="story-submit"><h2>Got a funny story?</h2><p>Send your story to <a href="mailto:vantalumstudio@gmail.com?subject=Funny%20Story%20Submission">vantalumstudio@gmail.com</a> with the subject “Funny Story Submission.” Tell us whether you prefer your name, a nickname, or no name. We may feature selected stories with your permission.</p></aside></article>;
}
