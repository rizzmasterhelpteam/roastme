import { Preferences } from "@capacitor/preferences";
import {
  defaultState,
  findPersona,
  type AppState,
  type Roast,
} from "@/lib/personas";
import { generationSchema, reportReasons } from "@/lib/validation";
type RecordState = { state: AppState; claimed: string; reports: unknown[] };
const key = "roast-native-demo-v1";
let queue = Promise.resolve();
async function perform(path: string, body?: Record<string, unknown>) {
  const stored = (await Preferences.get({ key })).value;
  const record: RecordState = stored
    ? JSON.parse(stored)
    : { state: structuredClone(defaultState), claimed: "", reports: [] };
  const today = new Date().toISOString().slice(0, 10);
  if (!record.claimed) record.claimed = today;
  if (record.claimed !== today) {
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .slice(0, 10);
    record.state.streak =
      record.claimed === yesterday ? record.state.streak + 1 : 1;
    record.state.credits = 5;
    record.claimed = today;
  }
  record.state.dailyClaimed = true;
  await Preferences.set({ key, value: JSON.stringify(record) });
  const fail = (error: string, status = 400, blocked = false) => ({
    status,
    data: { error, blocked },
  });
  let roast: Roast | undefined;
  if (path === "state") return { status: 200, data: record.state };
  if (path === "roast") {
    const parsed = generationSchema.safeParse(body);
    if (!parsed.success)
      return fail("Check your roast settings and try again.");
    const input = parsed.data;
    const existing = record.state.history.find((r) => r.id === input.requestId);
    if (existing)
      return { status: 200, data: { roast: existing, state: record.state } };
    const cost = input.type === "image" ? 2 : 1;
    if (record.state.credits < cost) return fail("OUT_OF_CREDITS", 402);
    if (
      input.type === "battle" &&
      (!input.opponent || input.opponent === input.persona)
    )
      return fail("Choose two different personas.");
    const p = findPersona(input.persona),
      other = findPersona(input.opponent || "cat");
    const content =
      input.type === "battle"
        ? Array.from({ length: 6 }, (_, i) => {
            const a = i % 2 ? other : p;
            return `${a.name}: ${a.samples[Math.floor(i / 2) % 3]}`;
          }).join("\n")
        : p.samples[Math.floor(Math.random() * p.samples.length)];
    roast = {
      id: input.requestId,
      content,
      prompt: input.prompt,
      persona: input.persona,
      type: input.type,
      created_at: new Date().toISOString(),
      saved: false,
      session_id: input.sessionId || crypto.randomUUID(),
    };
    record.state.credits -= cost;
    record.state.history.unshift(roast);
    record.state.history = record.state.history.slice(0, 100);
  } else if (path === "rewards/daily") {
    return fail("Daily credits reset automatically at 00:00 UTC.");
  } else if (path === "settings") {
    record.state.settings = body as AppState["settings"];
  } else if (path === "account/delete") {
    if (body?.confirmation !== "DELETE") return fail("Type DELETE to confirm.");
    await Preferences.remove({ key });
    return { status: 200, data: { deleted: true } };
  } else if (path.startsWith("history/") || path === "reports") {
    const item = record.state.history.find((r) => r.id === body?.id);
    if (!item) return fail("Roast not found.", 404);
    if (path === "history/save") item.saved = body?.saved === true;
    if (path === "history/delete")
      record.state.history = record.state.history.filter(
        (r) => r.id !== body?.id,
      );
    if (path === "history/feedback") item.feedback = String(body?.feedback);
    if (path === "reports") {
      if (!reportReasons.includes(String(body?.reason)))
        return fail("Choose a report reason.");
      record.reports.push(body);
    }
  } else
    return fail(
      "Connect the live service to use subscriptions and rewarded ads. No payment was taken.",
      503,
    );
  await Preferences.set({ key, value: JSON.stringify(record) });
  return {
    status: 200,
    data: { state: record.state, ...(roast ? { roast } : {}) },
  };
}
export async function nativeDemo(path: string, body?: Record<string, unknown>) {
  let result: Awaited<ReturnType<typeof perform>>;
  const next = queue.then(async () => {
    result = await perform(path, body);
  });
  queue = next.catch(() => {});
  await next;
  return result!;
}
