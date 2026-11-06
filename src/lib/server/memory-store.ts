import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationMemory } from "@/lib/conversation-memory";
import { compactNotes } from "./conversation-memory";

export async function loadConversationMemory(
  db: SupabaseClient,
  account: string,
  signedIn: boolean,
  session: string | undefined,
  persona: string,
  candidate?: ConversationMemory,
) {
  if (!session) return { notes: "", revision: 0 };
  const [chat, saved] = await Promise.all([
    db
      .from("roast_sessions")
      .select("memory_revision")
      .eq("id", session)
      .eq("user_id", account)
      .maybeSingle(),
    signedIn
      ? db
          .from("conversation_memories")
          .select("notes")
          .eq("user_id", account)
          .eq("session_id", session)
          .eq("persona", persona)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (chat.error || saved.error)
    throw new Error(
      "Unable to load conversation memory. Please retry. No credits were used.",
    );
  const revision: number = chat.data?.memory_revision ?? 0;
  if (saved.data) return { notes: compactNotes(saved.data.notes), revision };
  // Local notes may migrate only when the same authenticated user owns their source.
  // A different account signing in cannot import the preceding guest's history.
  if (chat.data && candidate?.revision === revision) {
    const source = await db
      .from("messages")
      .select("id")
      .eq("id", candidate.sourceId)
      .eq("user_id", account)
      .eq("session_id", session)
      .eq("persona", persona)
      .maybeSingle();
    if (source.error)
      throw new Error(
        "Unable to verify conversation memory. Please retry. No credits were used.",
      );
    if (source.data) return { notes: compactNotes(candidate.notes), revision };
  }
  return { notes: "", revision };
}
