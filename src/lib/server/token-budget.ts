import { encode } from "gpt-tokenizer/encoding/o200k_base";
export type ChatMessage = { role: string; content: string };
export type Exchange = { prompt: string; content: string };
// Local BPE budgeting with conservative framing allowance. API usage is authoritative.
export const GENERATION_INPUT_BUDGET = 2200;
export const SAFETY_INPUT_BUDGET = 800;
export const TEXT_INPUT_BUDGET = GENERATION_INPUT_BUDGET + SAFETY_INPUT_BUDGET;
export class InputBudgetError extends Error {
  constructor(
    message = "This message is too long for a roast. Shorten it and try again. No credits were used.",
  ) {
    super(message);
  }
}
export function countInputTokens(messages: ChatMessage[]) {
  return (
    32 +
    messages.reduce(
      (n, m) =>
        n + 8 + encode(m.content, { disallowedSpecial: new Set() }).length,
      0,
    )
  );
}
export function assertInputBudget(messages: ChatMessage[], limit: number) {
  if (countInputTokens(messages) > limit) throw new InputBudgetError();
}
export function budgetConversation(
  system: string,
  latest: string,
  context: Exchange[],
): ChatMessage[] {
  const base: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: latest },
  ];
  assertInputBudget(base, GENERATION_INPUT_BUDGET);
  const history: ChatMessage[] = [];
  // Keep a contiguous suffix of complete exchanges; never orphan replies or edit the latest message.
  for (const turn of context.slice(-6).reverse()) {
    const pair = [
      { role: "user", content: turn.prompt },
      { role: "assistant", content: turn.content },
    ];
    if (
      countInputTokens([base[0], ...pair, ...history, base[1]]) >
      GENERATION_INPUT_BUDGET
    ) {
      // Keep the full previous user message; fit a labelled assistant excerpt at any length.
      const chars = Array.from(turn.content);
      const marker = "\n[Earlier reply excerpt; middle omitted]\n";
      let compact: ChatMessage[] | undefined;
      let low = 64,
        high = chars.length - 1;
      while (low <= high) {
        const keep = Math.floor((low + high) / 2);
        const head = Math.ceil(keep * 0.6);
        const excerpt =
          chars.slice(0, head).join("") +
          marker +
          chars.slice(-(keep - head)).join("");
        const candidate = [pair[0], { role: "assistant", content: excerpt }];
        if (
          countInputTokens([base[0], ...candidate, ...history, base[1]]) <=
          GENERATION_INPUT_BUDGET
        ) {
          compact = candidate;
          low = keep + 1;
        } else high = keep - 1;
      }
      if (compact) history.unshift(...compact);
      else if (history.length === 0)
        throw new InputBudgetError(
          "There isn’t enough room to keep the previous exchange. Shorten your message or start a fresh chat. No credits were used.",
        );
      break;
    }
    history.unshift(...pair);
  }
  return [base[0], ...history, base[1]];
}
