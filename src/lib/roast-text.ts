/** Keep generated reply punctuation conversational without changing normal hyphens. */
export function normalizeRoastPunctuation(text: string): string {
  return text
    .replace(/[ \t]*(?:[\u2012-\u2015\u2e3a\u2e3b]|-{2,})[ \t]*/g, ", ")
    .replace(/,[ \t]*([,.;:!?])/g, "$1")
    .replace(/(^|\n)[ \t]*,[ \t]*/g, "$1")
    .replace(/,[ \t]*(?=\n|$)/g, "")
    .trim();
}
