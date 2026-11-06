import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGenerationMessages } from "../src/lib/server/generation-context";
import {
  budgetConversation,
  countInputTokens,
  GENERATION_INPUT_BUDGET,
  InputBudgetError,
} from "../src/lib/server/token-budget";

const base = {
  prompt: "What does he steal now?",
  persona: "grandma" as const,
  chaos: 30,
  replyLength: "medium" as const,
  language: "English" as const,
  level: "Spicy" as const,
  requestId: "00000000-0000-4000-8000-000000000001",
};
const history = [
  {
    prompt: "My fictional parrot Pickle steals socks.",
    content: "Pickle has opened a laundry business.",
  },
  {
    prompt: "Correction: Pickle steals spoons, not socks.",
    content: "Pickle has moved into catering.",
  },
];
test("chat, text, photos and battles all send the previous correction and assistant reply", () => {
  for (const type of ["chat", "text", "image", "battle"] as const) {
    const messages = buildGenerationMessages(
      { ...base, type, opponent: "cat" },
      history,
      type === "image" ? "A green toy parrot beside a spoon." : undefined,
    );
    assert.deepEqual(
      messages.slice(1, -1),
      history.flatMap((t) => [
        { role: "user", content: t.prompt },
        { role: "assistant", content: t.content },
      ]),
    );
    assert.ok(messages.at(-1)?.content.includes(base.prompt));
    assert.ok(countInputTokens(messages) <= GENERATION_INPUT_BUDGET);
  }
});
test("fresh sessions do not receive another conversation's messages", () => {
  const messages = buildGenerationMessages({ ...base, type: "chat" }, []);
  assert.equal(messages.length, 2);
  assert.ok(!messages.some((m) => m.content.includes("Pickle")));
});
test("short but token-heavy previous replies retain the full user message", () => {
  const reply = "👨‍👩‍👧‍👦".repeat(65);
  assert.ok(Array.from(reply).length < 500);
  const previous = "My name is Ria.";
  const messages = budgetConversation(
    "A useful system instruction. ".repeat(330),
    "What is my name?",
    [{ prompt: previous, content: reply }],
  );
  assert.equal(messages[1].content, previous);
  assert.match(messages[2].content, /middle omitted/);
  assert.equal(messages.at(-1)?.content, "What is my name?");
  assert.ok(countInputTokens(messages) <= GENERATION_INPUT_BUDGET);
});
test("insufficient space never silently produces a context-free reply", () => {
  assert.throws(
    () =>
      budgetConversation("Continue the conversation.", "What did I say?", [
        {
          prompt: "Really long previous input. ".repeat(1000),
          content: "Okay.",
        },
      ]),
    InputBudgetError,
  );
});
