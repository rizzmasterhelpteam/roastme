import { test } from "node:test";
import assert from "node:assert/strict";
import {
  completeText,
  TextProviderError,
} from "../src/lib/server/text-provider";

test("OpenRouter transport preserves JSON replies and never returns reasoning", async (t) => {
  const oldKey = process.env.OPENROUTER_API_KEY;
  const oldModel = process.env.OPENROUTER_MODEL;
  process.env.OPENROUTER_API_KEY = "test-key";
  delete process.env.OPENROUTER_MODEL;
  t.after(() => {
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = oldModel;
    t.mock.restoreAll();
  });
  const requests: { url: string; body: any }[] = [];
  let reply: unknown = {
    choices: [
      {
        finish_reason: "stop",
        message: {
          content:
            '{"allowed":true,"reply":"Pickle has started charging rent.","notes":"Fictional parrot: Pickle."}',
          reasoning: "Internal reasoning must never become a roast.",
        },
      },
    ],
  };
  let status = 200;
  t.mock.method(
    globalThis,
    "fetch",
    async (url: unknown, init: RequestInit) => {
      requests.push({ url: String(url), body: JSON.parse(String(init.body)) });
      assert.equal(
        new Headers(init.headers).get("Authorization"),
        "Bearer test-key",
      );
      return Response.json(reply, { status });
    },
  );
  const messages = [
    { role: "user", content: "Remember my fictional parrot Pickle." },
  ];
  const result = await completeText(messages, "combined");
  assert.equal(JSON.parse(result).notes, "Fictional parrot: Pickle.");
  assert.doesNotMatch(result, /Internal reasoning/);
  assert.equal(
    requests[0].url,
    "https://openrouter.ai/api/v1/chat/completions",
  );
  assert.equal(requests[0].body.model, "deepseek/deepseek-v4-flash-0731");
  assert.deepEqual(requests[0].body.messages, messages);
  assert.deepEqual(requests[0].body.reasoning, {
    effort: "low",
    exclude: true,
  });
  assert.equal(requests[0].body.response_format.type, "json_schema");
  assert.deepEqual(requests[0].body.plugins, [{ id: "response-healing" }]);
  assert.equal(requests[0].body.response_format.json_schema.strict, true);
  assert.deepEqual(
    requests[0].body.response_format.json_schema.schema.required,
    ["allowed", "reply", "notes"],
  );
  assert.equal(requests[0].body.provider.require_parameters, true);
  assert.equal(requests[0].body.max_tokens, 2048);
  assert.equal(requests[0].body.store, undefined);

  reply = {
    choices: [
      { finish_reason: "stop", message: { content: '{"allowed":true}' } },
    ],
  };
  assert.equal(await completeText(messages, true), '{"allowed":true}');
  assert.equal(requests[1].body.reasoning.effort, "low");
  assert.deepEqual(
    requests[1].body.response_format.json_schema.schema.required,
    ["allowed"],
  );
  process.env.OPENROUTER_MODEL = " deepseek/deepseek-v4-flash-0731 ";
  await completeText(messages);
  assert.equal(requests[2].body.model, "deepseek/deepseek-v4-flash-0731");

  reply = {
    choices: [
      {
        finish_reason: "stop",
        message: { content: '```json\n{"allowed":true}\n```' },
      },
    ],
  };
  assert.equal(await completeText(messages, true), '{"allowed":true}');
  reply = {
    choices: [{ finish_reason: "stop", message: { content: '{"reply":' } }],
  };
  const beforeMalformed = requests.length;
  await assert.rejects(completeText(messages, "combined"), TextProviderError);
  assert.equal(
    requests.length,
    beforeMalformed + 2,
    "one bounded retry for malformed provider JSON",
  );
  reply = {
    choices: [
      { finish_reason: "stop", message: { content: '{"allowed":"true"}' } },
    ],
  };
  await assert.rejects(completeText(messages, true, 1), TextProviderError);

  status = 402;
  reply = { error: { code: 402, message: "Insufficient credits" } };
  await assert.rejects(completeText(messages), /no available API quota/);
  status = 200;
  reply = { error: { code: 502, message: "upstream failed" } };
  await assert.rejects(completeText(messages), TextProviderError);
  reply = {
    choices: [
      { finish_reason: "length", message: { content: "partial joke" } },
    ],
  };
  await assert.rejects(completeText(messages), /cut short/);
  reply = {
    choices: [
      {
        finish_reason: "stop",
        message: { content: "", reasoning: "reasoning only" },
      },
    ],
  };
  await assert.rejects(completeText(messages), /No roast came back/);
  const count = requests.length;
  delete process.env.OPENROUTER_API_KEY;
  await assert.rejects(completeText(messages), /not configured/);
  assert.equal(
    requests.length,
    count,
    "no request or OpenAI fallback without an OpenRouter key",
  );
});
