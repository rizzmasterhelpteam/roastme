import { z } from "zod";

// Shared wire format. No tokenizer or server dependencies enter the Android bundle.
export const conversationMemorySchema = z.object({
  notes: z.string().max(1200),
  sourceId: z.string().uuid(),
  revision: z.number().int().nonnegative(),
});
export type ConversationMemory = z.infer<typeof conversationMemorySchema>;

type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;
type Entry = ConversationMemory & { touched: number };
const prefix = "roast-memory:v1:";
const slot = (session: string, persona: string) => `${session}:${persona}`;

export function localConversationMemory(storage: Storage) {
  const read = (account: string): Record<string, Entry> => {
    try {
      const raw = JSON.parse(storage.getItem(prefix + account) || "{}");
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
      return Object.fromEntries(
        Object.entries(raw).filter(([, v]) => {
          const value = v as Entry;
          return (
            conversationMemorySchema.safeParse(value).success &&
            Number.isFinite(value.touched)
          );
        }),
      ) as Record<string, Entry>;
    } catch {
      return {};
    }
  };
  return {
    get(account: string, session: string, persona: string) {
      const item = read(account)[slot(session, persona)];
      // Keep guest notes for at most 30 days, and never reuse another account's notes.
      return item && item.touched > Date.now() - 30 * 86400000
        ? conversationMemorySchema.parse(item)
        : undefined;
    },
    set(account: string, session: string, persona: string, memory: unknown) {
      const parsed = conversationMemorySchema.safeParse(memory);
      if (!parsed.success) return;
      const entries = read(account);
      entries[slot(session, persona)] = { ...parsed.data, touched: Date.now() };
      const recent = Object.entries(entries)
        .sort((a, b) => b[1].touched - a[1].touched)
        .slice(0, 12);
      try {
        storage.setItem(
          prefix + account,
          JSON.stringify(Object.fromEntries(recent)),
        );
      } catch {}
    },
    clear(account: string, session?: string, persona?: string) {
      try {
        if (!session) storage.removeItem(prefix + account);
        else {
          const entries = read(account);
          delete entries[slot(session, persona || "")];
          storage.setItem(prefix + account, JSON.stringify(entries));
        }
      } catch {}
    },
  };
}
