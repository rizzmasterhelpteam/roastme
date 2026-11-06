import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { encode } from "gpt-tokenizer/encoding/o200k_base";
import { localConversationMemory } from "../src/lib/conversation-memory";
import {
  compactNotes,
  parseRememberedReply,
  MEMORY_TOKEN_BUDGET,
} from "../src/lib/server/conversation-memory";
import { buildGenerationMessages } from "../src/lib/server/generation-context";
import {
  countInputTokens,
  GENERATION_INPUT_BUDGET,
} from "../src/lib/server/token-budget";

test("guest notes survive reopening, stay account/chat/persona scoped, and reset safely", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
  const store = localConversationMemory(storage);
  const memory = {
    notes: "Fictional parrot Pickle steals spoons.",
    sourceId: randomUUID(),
    revision: 0,
  };
  store.set("guest-a", "chat-a", "grandma", memory);
  assert.deepEqual(
    localConversationMemory(storage).get("guest-a", "chat-a", "grandma"),
    memory,
  );
  assert.equal(store.get("guest-b", "chat-a", "grandma"), undefined);
  assert.equal(store.get("guest-a", "chat-b", "grandma"), undefined);
  assert.equal(store.get("guest-a", "chat-a", "savage"), undefined);
  store.clear("guest-a", "chat-a", "grandma");
  assert.equal(store.get("guest-a", "chat-a", "grandma"), undefined);
  for (let i = 0; i < 20; i++)
    store.set("guest-a", String(i), "grandma", memory);
  assert.equal(Object.keys(JSON.parse([...values.values()][0])).length, 12);
  store.clear("guest-a");
  assert.equal(values.size, 0);
  storage.setItem("roast-memory:v1:bad", "null");
  assert.equal(store.get("bad", "chat-a", "grandma"), undefined);
  const denied = localConversationMemory({
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
    removeItem() {
      throw Error();
    },
  });
  assert.doesNotThrow(() => denied.set("a", "b", "cat", memory));
  assert.equal(denied.get("a", "b", "cat"), undefined);
});

test("notes are bounded complete facts; malformed replies cannot become user-visible JSON", () => {
  const compact = compactNotes(
    Array.from(
      { length: 100 },
      (_, i) => `Fact ${i}: fictional parrot owns spoon ${i}.`,
    ).join("\n"),
  );
  assert.ok(encode(compact).length <= MEMORY_TOKEN_BUDGET);
  assert.ok(compact.endsWith("Fact 99: fictional parrot owns spoon 99."));
  assert.equal(compactNotes("🧑🏽‍💻".repeat(160)), "");
  assert.deepEqual(
    parseRememberedReply(
      '{"reply":"A complete joke.","notes":"Pickle steals spoons."}',
    ),
    { content: "A complete joke.", notes: "Pickle steals spoons." },
  );
  assert.throws(() => parseRememberedReply('{"notes":"Hidden text only"}'));
  assert.throws(() => parseRememberedReply("not JSON"));
});

test("old facts plus latest corrections enter every mode within the existing budget", () => {
  for (const type of ["text", "chat", "image", "battle"] as const) {
    const input = {
      prompt: "No, Pickle steals spoons now, not socks.",
      persona: "grandma" as const,
      level: "Spicy" as const,
      chaos: 100,
      replyLength: "medium" as const,
      language: "Hindi" as const,
      requestId: randomUUID(),
      sessionId: randomUUID(),
      type,
      opponent: "cat" as const,
    };
    const history = Array.from({ length: 6 }, () => ({
      prompt: "The fictional bird has a new hobby.",
      content: "Pickle has plans.",
    }));
    const messages = buildGenerationMessages(
      input,
      history,
      type === "image" ? "A green toy bird." : undefined,
      "Fictional parrot Pickle steals socks.",
      true,
    );
    assert.ok(messages[1].content.includes("untrusted"));
    assert.ok(messages[1].content.includes("steals socks"));
    assert.ok(messages.at(-1)!.content.includes("spoons now"));
    assert.ok(
      messages[0].content.includes("Latest corrections replace old facts"),
    );
    assert.ok(countInputTokens(messages) <= GENERATION_INPUT_BUDGET);
  }
});

test("database notes commit with credits, reject guests/client access, and invalidate on deletion/reset", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key,is_anonymous boolean not null default false);
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated,service_role;
      grant execute on function auth.uid() to authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;`);
    await db.exec(
      await readFile(
        new URL("../supabase/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    const owner = randomUUID(),
      guest = randomUUID(),
      other = randomUUID(),
      session = randomUUID();
    await db.query(
      "insert into auth.users(id,is_anonymous) values($1,false),($2,true),($3,false)",
      [owner, guest, other],
    );
    const finish = async (
      user: string,
      chat: string,
      notes: string,
      revision = 0,
    ) => {
      const token = randomUUID();
      await db.query("select public.begin_generation($1,$2,1)", [user, token]);
      return db.query<{ id: string }>(
        "select public.finish_generation_with_memory($1,$2,$3,$4,'grandma','chat','Spicy',30,'Synthetic test prompt','Synthetic reply',null,$5,$6,$7) as id",
        [user, token, randomUUID(), chat, notes, revision, user !== guest],
      );
    };
    const first = await finish(
      owner,
      session,
      "Fictional parrot Pickle steals socks.",
    );
    await finish(owner, session, "Fictional parrot Pickle steals spoons.");
    assert.equal(
      (
        await db.query<{ notes: string }>(
          "select notes from public.conversation_memories where user_id=$1",
          [owner],
        )
      ).rows[0].notes,
      "Fictional parrot Pickle steals spoons.",
    );
    await finish(guest, randomUUID(), "Must never persist.");
    assert.equal(
      (
        await db.query(
          "select * from public.conversation_memories where user_id=$1",
          [guest],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      finish(other, session, "Wrong owner"),
      /Invalid session/,
    );
    assert.equal(
      (
        await db.query<{ credits_balance: number }>(
          "select credits_balance from public.profiles where id=$1",
          [other],
        )
      ).rows[0].credits_balance,
      5,
    );
    await db.query("delete from public.messages where id=$1", [
      first.rows[0].id,
    ]);
    assert.equal(
      (
        await db.query(
          "select * from public.conversation_memories where user_id=$1",
          [owner],
        )
      ).rows.length,
      0,
    );
    await finish(owner, session, "Stale summary must not come back.", 0);
    assert.equal(
      (
        await db.query(
          "select * from public.conversation_memories where user_id=$1",
          [owner],
        )
      ).rows.length,
      0,
    );
    await finish(owner, session, "New notes after deletion.", 1);
    await db.query("select public.clear_conversation_memory($1,$2)", [
      other,
      session,
    ]);
    assert.equal(
      (
        await db.query(
          "select * from public.conversation_memories where user_id=$1",
          [owner],
        )
      ).rows.length,
      1,
      "another user cannot clear notes",
    );
    await db.query("select public.clear_conversation_memory($1,$2)", [
      owner,
      session,
    ]);
    assert.equal(
      (
        await db.query(
          "select * from public.conversation_memories where user_id=$1",
          [owner],
        )
      ).rows.length,
      0,
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select * from public.conversation_memories"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.clear_conversation_memory($1,$2)", [
        owner,
        session,
      ]),
      /permission denied/,
    );
    await db.exec("reset role");
    // Deleting an account cascades its summaries as well as its conversation data.
    await finish(owner, randomUUID(), "Account-scoped test.");
    await db.query("delete from auth.users where id=$1", [owner]);
    assert.equal(
      (
        await db.query(
          "select * from public.conversation_memories where user_id=$1",
          [owner],
        )
      ).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
