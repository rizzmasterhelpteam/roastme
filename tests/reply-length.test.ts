import { test } from "node:test";
import assert from "node:assert/strict";
import { fitReplyLength, replyWordCount } from "../src/lib/server/reply-length";

test("reply limits preserve complete jokes, rewrite overlong text once, and reject unfinished overflow", async () => {
  let calls = 0;
  const joke =
    "Your gym membership gets more exercise renewing itself than you do.";
  const rewrite = async () => {
    calls++;
    return joke;
  };
  assert.equal(await fitReplyLength(joke, "short", rewrite), joke);
  assert.equal(calls, 0);
  for (const length of ["short", "medium", "long"] as const) {
    assert.equal(
      await fitReplyLength("filler ".repeat(100), length, rewrite),
      joke,
    );
  }
  assert.equal(calls, 3);
  await assert.rejects(
    fitReplyLength("filler ".repeat(100), "short", async () =>
      "still ".repeat(30),
    ),
    /exceeded/,
  );
  assert.ok(replyWordCount("तुम्हारी जिम सदस्यता तुमसे ज्यादा नियमित है।") > 5);
  assert.ok(replyWordCount("毎日ジムに行くと言ってソファから動かない。") > 3);
});
