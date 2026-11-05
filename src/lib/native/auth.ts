import { browserSupabase } from "@/lib/supabase";
export function parseAuthLink(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "ai.roastme.app:" ||
    url.hostname !== "auth" ||
    url.pathname !== "/callback"
  )
    return null;
  return {
    code: url.searchParams.get("code"),
    error:
      url.searchParams.get("error_description") ||
      url.searchParams.get("error"),
  };
}
const exchanges = new Map<string, Promise<boolean>>();
export async function consumeAuthLink(value: string) {
  const link = parseAuthLink(value);
  if (!link) return false;
  if (link.error)
    throw new Error(
      "Sign-in was cancelled or could not be completed. Please try again.",
    );
  if (!link.code) return false;
  const existing = exchanges.get(link.code);
  if (existing) return existing;
  const code = link.code;
  const pending = (async () => {
    const sb = browserSupabase();
    if (!sb) throw new Error("Sign-in is not configured.");
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) throw error;
    const { Browser } = await import("@capacitor/browser");
    await Browser.close().catch(() => {});
    const session = (await sb.auth.getSession()).data.session;
    if (!session) throw new Error("Sign-in session is missing.");
    const { nativeRequest } = await import("./client");
    const connection = await nativeRequest("premium/connect", {}, session.access_token, session.user.id);
    if (connection.status >= 400) throw new Error(connection.data.error || "Unable to connect this device.");
    window.dispatchEvent(new Event("roast:refresh"));
    return true;
  })();
  exchanges.set(code, pending);
  try {
    return await pending;
  } catch (error) {
    exchanges.delete(code);
    throw error;
  }
}
