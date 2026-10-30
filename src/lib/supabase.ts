import { createClient } from "@supabase/supabase-js";
import { isNative, sessionStorage } from "@/lib/native/platform";
let client: ReturnType<typeof createClient> | undefined;
export function browserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return (client ||= createClient(url, key, {
    auth: {
      detectSessionInUrl: !isNative(),
      flowType: isNative() ? "pkce" : "implicit",
      ...(isNative() ? { storage: sessionStorage } : {}),
      persistSession: true,
      autoRefreshToken: true,
    },
  }));
}
