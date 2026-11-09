export const replyLengths = {
  short: {
    instruction:
      "One self-contained sentence with a complete joke and clear payoff.",
  },
  medium: {
    instruction:
      "One flowing paragraph of 2-3 short sentences forming one complete joke, not separate one-liners.",
  },
  long: {
    instruction:
      "One flowing paragraph of 2-4 connected sentences: develop the same joke from setup to final payoff. No extra joke to fill space.",
  },
} as const;
