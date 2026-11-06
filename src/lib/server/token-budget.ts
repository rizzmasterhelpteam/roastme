import { encode } from "gpt-tokenizer/encoding/o200k_base";
export type ChatMessage = { role: string; content: string };
export type Exchange = { prompt: string; content: string };
// Local BPE budgeting with conservative framing allowance. API usage is authoritative.
export const GENERATION_INPUT_BUDGET = 2200;
export const SAFETY_INPUT_BUDGET = 800;
export const TEXT_INPUT_BUDGET = GENERATION_INPUT_BUDGET + SAFETY_INPUT_BUDGET;
export class InputBudgetError extends Error {
  constructor() {
    super(
      "This message is too long for a roast. Shorten it and try again. No credits were used.",
    );
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
      // Preserve the newest user statement even when its old assistant reply was unusually long.
      const chars = Array.from(turn.content);
      if (chars.length > 500) {
        const excerpt =
          chars.slice(0, 300).join("") +
          "\n[Earlier reply excerpt; middle omitted]\n" +
          chars.slice(-200).join("");
        const compact = [pair[0], { role: "assistant", content: excerpt }];
        if (
          countInputTokens([base[0], ...compact, ...history, base[1]]) <=
          GENERATION_INPUT_BUDGET
        )
          history.unshift(...compact);
      }
      break;
    }
    history.unshift(...pair);
  }
  return [base[0], ...history, base[1]];
}
