export const replyLengths = {
  short: {
    max: 20,
    instruction:
      "8-16 words; maximum 20. ONE brief sentence with a complete punchline. No greeting or follow-up.",
  },
  medium: {
    max: 40,
    instruction:
      "20-35 words; maximum 40. TWO compact sentences: quick setup and payoff, one paragraph.",
  },
  long: {
    max: 70,
    instruction:
      "40-60 words; maximum 70. THREE connected short sentences, one paragraph, one joke. No story or extra ending.",
  },
} as const;
export type ReplyLength = keyof typeof replyLengths;

// Word segmentation also handles languages without spaces, such as Japanese.
const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
export function replyWordCount(text: string) {
  return [...segmenter.segment(text)].filter((part) => part.isWordLike).length;
}

export async function fitReplyLength(
  content: string,
  length: ReplyLength,
  rewrite: (text: string) => Promise<string>,
) {
  if (replyWordCount(content) <= replyLengths[length].max) return content;
  const revised = (await rewrite(content)).trim();
  if (!revised || replyWordCount(revised) > replyLengths[length].max)
    throw new Error(
      "The reply exceeded your selected length. Please retry. No credits were used.",
    );
  return revised;
}
