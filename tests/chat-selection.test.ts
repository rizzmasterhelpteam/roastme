import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultState, type Roast } from "../src/lib/personas";
import { restoreChat, rememberChat } from "../src/lib/chat-selection";
const store = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
};
test("startup restores the latest conversation before rendering, respecting explicit persona URLs", () => {
  const state = structuredClone(defaultState);
  state.accountId = "account-a";
  state.history = [
    { persona: "grandma", session_id: "grandma-chat", type: "chat" },
    { persona: "savage", session_id: "savage-chat", type: "chat" },
  ] as Roast[];
  const local = store();
  assert.equal(restoreChat(state, undefined, local).persona, "grandma");
  assert.equal(restoreChat(state, undefined, local).sessionId, "grandma-chat");
  assert.equal(restoreChat(state, "savage", local).sessionId, "savage-chat");
  const fresh = {
    account: "account-a",
    persona: "cat",
    sessionId: crypto.randomUUID(),
  };
  rememberChat(local, fresh);
  assert.deepEqual(
    restoreChat(state, undefined, local),
    fresh,
    "an empty fresh chat survives reopening",
  );
  assert.equal(
    restoreChat({ ...state, accountId: "account-b" }, undefined, local).persona,
    "grandma",
    "another account cannot inherit selection",
  );
});
test("legacy session pointers migrate only when the account owns their history", () => {
  const state = { ...structuredClone(defaultState), accountId: "account-a" };
  const legacy = store();
  legacy.setItem("roast-session:savage", "another-account-chat");
  assert.notEqual(
    restoreChat(state, "savage", undefined, legacy).sessionId,
    "another-account-chat",
  );
  state.history = [
    { persona: "savage", session_id: "another-account-chat", type: "chat" },
  ] as Roast[];
  assert.equal(
    restoreChat(state, "savage", undefined, legacy).sessionId,
    "another-account-chat",
  );
  const denied = {
    getItem() {
      throw Error("denied");
    },
    setItem() {
      throw Error("denied");
    },
  };
  assert.doesNotThrow(() =>
    rememberChat(denied, restoreChat(state, undefined, denied)),
  );
});
