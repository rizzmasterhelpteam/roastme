import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRoastPunctuation } from "../src/lib/roast-text";

test("reply punctuation removes long dash separators without changing hyphenated words or line breaks", () => {
 assert.equal(normalizeRoastPunctuation("I’m fine, dear\u2014your greeting needs work."), "I’m fine, dear, your greeting needs work.");
 assert.equal(normalizeRoastPunctuation("Hello -- dear.\nNext \u2013 joke."), "Hello, dear.\nNext, joke.");
 assert.equal(normalizeRoastPunctuation("Well\u2014!\n\u2014Try again\u2014"), "Well!\nTry again");
 assert.equal(normalizeRoastPunctuation("A part-time job, 2-3 lines and -5 points."), "A part-time job, 2-3 lines and -5 points.");
});
