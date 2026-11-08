import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultState, type Roast } from "../src/lib/personas";
import {
  restoreChat,
  rememberChat,
  freshPersonaChat,
  sameConversation,
} from "../src/lib/chat-selection";
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

test("a fresh chat resets only its captured persona and preserves all other sessions", async () => {
  const state = { ...structuredClone(defaultState), accountId: "account-a" };
  const local = store();
  for (const persona of ["savage", "grandma", "cat", "ceo", "robot", "drama"])
    rememberChat(local, {
      account: "account-a",
      persona,
      sessionId: `existing-${persona}`,
    });
  const target = restoreChat(state, "grandma", local);
  const calls: unknown[] = [];
  const fresh = await freshPersonaChat(target, async (body) => {
    calls.push(body);
  });
  rememberChat(local, fresh);
  assert.deepEqual(calls, [
    { sessionId: "existing-grandma", persona: "grandma" },
  ]);
  assert.equal(fresh.persona, "grandma");
  assert.notEqual(fresh.sessionId, target.sessionId);
  assert.deepEqual(
    restoreChat(state, undefined, local),
    fresh,
    "reload stays with Grandma's empty new chat",
  );
  for (const persona of ["savage", "cat", "ceo", "robot", "drama"])
    assert.equal(
      restoreChat(state, persona, local).sessionId,
      `existing-${persona}`,
    );
  assert.equal(sameConversation(target, fresh), false);
});

test("navigation during reset cannot select another persona or lose its session; failures preserve the old chat", async () => {
  const state = { ...structuredClone(defaultState), accountId: "account-a" };
  const local = store();
  const target = {
    account: "account-a",
    persona: "grandma",
    sessionId: "old-grandma",
  };
  rememberChat(local, target);
  let finish!: () => void;
  const pending = freshPersonaChat(
    target,
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const current = {
    account: "account-a",
    persona: "robot",
    sessionId: "existing-robot",
  };
  rememberChat(local, current);
  finish();
  const fresh = await pending;
  rememberChat(local, fresh, sameConversation(current, target));
  assert.deepEqual(restoreChat(state, undefined, local), current);
  assert.equal(restoreChat(state, "grandma", local).sessionId, fresh.sessionId);
  const snapshot = restoreChat(state, "robot", local);
  await assert.rejects(
    freshPersonaChat(snapshot, async () => {
      throw Error("network failed");
    }),
  );
  assert.deepEqual(restoreChat(state, "robot", local), snapshot);
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
