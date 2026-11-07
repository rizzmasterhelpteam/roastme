import { personas, type AppState } from "./personas";
type Store = Pick<Storage, "getItem" | "setItem">;
const valid = (id: string | null | undefined) =>
  personas.some((p) => p.id === id);
export const chatAccount = (state: AppState) =>
  state.accountId || state.email || "guest";
function read(store: Store | undefined, key: string) {
  try {
    return store?.getItem(key) || null;
  } catch {
    return null;
  }
}
export function restoreChat(
  state: AppState,
  explicit?: string,
  store?: Store,
  legacy?: Store,
) {
  const account = chatAccount(state);
  const history = state.history.filter(
    (r) => ["chat", "image"].includes(r.type) || !r.type,
  );
  const remembered = read(store, `roast-persona:${account}`);
  const persona = valid(explicit)
    ? explicit!
    : valid(remembered)
      ? remembered!
      : history.find((r) => valid(r.persona))?.persona || "savage";
  const key = `roast-session:${account}:${persona}`;
  const stored = read(store, key) || read(legacy, key);
  const old = read(legacy, `roast-session:${persona}`);
  const ownedLegacy =
    old && history.some((r) => r.persona === persona && r.session_id === old)
      ? old
      : undefined;
  const sessionId =
    stored ||
    ownedLegacy ||
    history.find((r) => r.persona === persona && r.session_id)?.session_id ||
    crypto.randomUUID();
  return { account, persona, sessionId };
}
export function rememberChat(
  store: Store | undefined,
  chat: ReturnType<typeof restoreChat>,
) {
  try {
    store?.setItem(`roast-persona:${chat.account}`, chat.persona);
    store?.setItem(
      `roast-session:${chat.account}:${chat.persona}`,
      chat.sessionId,
    );
  } catch {}
}
