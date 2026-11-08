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
