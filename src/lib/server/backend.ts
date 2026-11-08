import "server-only";
import { refreshGooglePlay } from "./android-monetization";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { defaultState, type AppState, type Roast } from "@/lib/personas";
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
type DemoRecord = {
  state: AppState;
  claimed: string;
  busy: boolean;
  requests: number[];
  reports: unknown[];
  touched: number;
};
const globalDemo = globalThis as unknown as {
  roastDemos?: Map<string, DemoRecord>;
};
const demos = (globalDemo.roastDemos ||= new Map<string, DemoRecord>());
export type Backend =
  | { demo: true; record: DemoRecord; id: string }
  | { demo: false; db: SupabaseClient; user: User; token: string; id: string };
export async function backend(request: Request): Promise<Backend> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.DEMO_MODE !== "true"
    )
      throw new ApiError(
        "The service is being configured. Please check back shortly.",
        503,
      );
    const jar = await cookies();
    let id = jar.get("roast_demo")?.value;
    if (!id || !demos.has(id)) {
      id = randomUUID();
      jar.set("roast_demo", id, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 86400,
      });
      demos.set(id, {
        state: structuredClone(defaultState),
        claimed: new Date().toISOString().slice(0, 10),
        busy: false,
        requests: [],
        reports: [],
        touched: Date.now(),
      });
    }
    const record = demos.get(id)!;
    record.touched = Date.now();
    if (demos.size > 2000)
      for (const [k, v] of demos)
        if (v.touched < Date.now() - 86400000) demos.delete(k);
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
    return { demo: true, record, id };
  }
  const token = request.headers.get("authorization")?.replace(/^Bearer /i, "");
  if (!token)
    throw new ApiError(
      "Please continue as a guest or sign in to start roasting.",
      401,
    );
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user)
    throw new ApiError("Your session has expired. Please sign in again.", 401);
  if (!data.user.is_anonymous) await refreshGooglePlay(db, data.user.id);
  const route = new URL(request.url).pathname;
  if (!route.endsWith("/premium/connect") && !data.user.is_anonymous) {
    const profile = await db
      .from("profiles")
      .select("premium_status,premium_expires_at")
      .eq("id", data.user.id)
      .single();
    if (profile.error)
      throw new ApiError("Unable to verify Premium access.", 503);
    if (
      profile.data.premium_status &&
      new Date(profile.data.premium_expires_at).getTime() > Date.now()
    ) {
      const current = await db
        .from("premium_sessions")
        .select("instance_id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (current.error)
        throw new ApiError(
          "Premium sessions are being configured. Please retry shortly.",
          503,
        );
      if (
        !current.data ||
        current.data.instance_id !== request.headers.get("x-roast-instance")
      )
        throw new ApiError("PREMIUM_SESSION_REPLACED", 409);
    }
  }
  const reset = await db.rpc("reset_daily_credits", { p_user: data.user.id });
  if (reset.error)
    throw new ApiError("Could not refresh daily credits. Please retry.", 503);
  return { demo: false, db, user: data.user, token, id: data.user.id };
}
export async function getState(b: Backend): Promise<AppState> {
  if (b.demo) return b.record.state;
  const [profile, settings, messages, saved] = await Promise.all([
    b.db.from("profiles").select("*").eq("id", b.id).single(),
    b.db
      .from("user_settings")
      .select("preferences")
      .eq("user_id", b.id)
      .single(),
    b.db
      .from("messages")
      .select("*")
      .eq("user_id", b.id)
      .order("created_at", { ascending: false })
      .limit(100),
    b.db.from("saved_roasts").select("message_id").eq("user_id", b.id),
  ]);
  for (const result of [profile, settings, messages, saved])
    if (result.error)
      throw new ApiError(
        "Your account could not be loaded. Please retry.",
        503,
      );
  const history: Roast[] = await Promise.all(
    (messages.data || []).map(async (m) => {
      let image: string | undefined;
      if (m.image_path) {
        const signed = await b.db.storage
          .from("roast-images")
          .createSignedUrl(m.image_path, 3600);
        image = signed.data?.signedUrl;
      }
      return {
        id: m.id,
        content: m.content,
        prompt: m.prompt,
        persona: m.persona,
        created_at: m.created_at,
        type: m.input_type,
        saved: !!saved.data?.some((s) => s.message_id === m.id),
        feedback: m.feedback,
        image,
        session_id: m.session_id,
      };
    }),
  );
  return {
    accountId: b.id,
    credits: profile.data.credits_balance,
    premium:
      profile.data.premium_status &&
      new Date(profile.data.premium_expires_at).getTime() > Date.now(),
    email: b.user.email || null,
    guest: !!b.user.is_anonymous,
    demo: false,
    dailyClaimed:
      profile.data.last_daily_claim === new Date().toISOString().slice(0, 10),
    streak: profile.data.streak,
    settings: settings.data?.preferences || defaultState.settings,
    history,
  };
}
export function ensure<T extends { error: { message: string } | null }>(
  result: T,
) {
  if (result.error) throw new ApiError(result.error.message);
  return result;
}
