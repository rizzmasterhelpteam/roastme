import { test } from "node:test";
import assert from "node:assert/strict";
import {
  budgetConversation,
  countInputTokens,
  GENERATION_INPUT_BUDGET,
  TEXT_INPUT_BUDGET,
  SAFETY_INPUT_BUDGET,
  InputBudgetError,
  assertInputBudget,
} from "../src/lib/server/token-budget";
import { buildRoastSystem, safetyPrompt } from "../src/lib/server/roast-prompt";
import { personas } from "../src/lib/personas";
import { replyLanguages } from "../src/lib/languages";
import { encode } from "gpt-tokenizer/encoding/o200k_base";

const base = {
  prompt: "hi i noob",
  persona: "grandma" as const,
  chaos: 30,
  replyLength: "medium" as const,
  language: "English" as const,
  type: "chat" as const,
  level: "Spicy" as const,
  requestId: "00000000-0000-4000-8000-000000000001",
};
test("all persona, language, length and chaos combinations leave room for the actual message", () => {
  for (const persona of personas)
    for (const language of replyLanguages)
      for (const chaos of [0, 14, 15, 30, 39, 40, 64, 65, 84, 85, 99, 100])
        for (const replyLength of ["short", "medium", "long"] as const) {
          const system = buildRoastSystem({
            ...base,
            persona: persona.id,
            language,
            chaos,
            replyLength,
          });
          assert.ok(
            encode(system).length < 850,
            `${persona.id}/${language}/${chaos}/${replyLength}`,
          );
          const messages = budgetConversation(
            system,
            "मेरे काम टालने की आदत पर मज़ाक करो।",
            [],
          );
          assert.ok(countInputTokens(messages) < GENERATION_INPUT_BUDGET);
        }
  assert.ok(encode(safetyPrompt).length < 150);
  assert.equal(
    GENERATION_INPUT_BUDGET + SAFETY_INPUT_BUDGET,
    TEXT_INPUT_BUDGET,
  );
});
test("history stays chronological, paired and bounded; latest correction is never changed", () => {
  const history = Array.from({ length: 12 }, (_, i) => ({
    prompt: `topic ${i}: ` + "I put off the work again. ".repeat(32),
    content: `reply ${i}: ` + "That excuse needs work. ".repeat(32),
  }));
  const latest = "No, I meant YOU were the noob, not me.";
  const messages = budgetConversation(buildRoastSystem(base), latest, history);
  assert.equal(messages.at(-1)?.content, latest);
  assert.equal(messages[0].role, "system");
  assert.ok(countInputTokens(messages) <= GENERATION_INPUT_BUDGET);
  assert.ok(messages.length <= 14);
  const selected = messages.slice(1, -1);
  assert.equal(selected.length % 2, 0);
  for (let i = 0; i < selected.length; i += 2) {
    assert.equal(selected[i].role, "user");
    assert.equal(selected[i + 1].role, "assistant");
  }
  assert.ok(selected.some((m) => m.content === history.at(-1)!.prompt));
  assert.ok(!selected.some((m) => m.content === history[0].prompt));
});
test("an oversized old reply keeps the recent user context via a labelled excerpt", () => {
  const user = "I was talking about cooking, not gaming.";
  const reply =
    "Cooking: " +
    "An old assistant answer. ".repeat(3000) +
    " End of cooking reply.";
  const messages = budgetConversation(
    buildRoastSystem(base),
    "What about that?",
    [{ prompt: user, content: reply }],
  );
  assert.equal(messages[1].content, user);
  assert.match(messages[2].content, /middle omitted/);
  assert.ok(messages[2].content.startsWith("Cooking:"));
  assert.ok(messages[2].content.endsWith("End of cooking reply."));
  assert.ok(countInputTokens(messages) <= GENERATION_INPUT_BUDGET);
});
test("oversized latest input fails explicitly rather than silently losing its meaning", () => {
  const latest = "संदर्भ 🧑🏽‍💻 ".repeat(900);
  assert.throws(
    () => budgetConversation(buildRoastSystem(base), latest, []),
    InputBudgetError,
  );
  assert.throws(
    () =>
      assertInputBudget(
        [{ role: "user", content: latest }],
        SAFETY_INPUT_BUDGET,
      ),
    InputBudgetError,
  );
  const markers = "<|endoftext|> <|im_start|>";
  assert.equal(
    budgetConversation(buildRoastSystem(base), markers, []).at(-1)?.content,
    markers,
  );
});
