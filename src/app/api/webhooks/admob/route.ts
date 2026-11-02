import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { verifyAdSignature } from "@/lib/ad-verification";
export const runtime = "nodejs";
let cached:
  { expires: number; keys: { keyId: number; pem: string }[] } | undefined;
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const unit = process.env.ADMOB_REWARDED_AD_UNIT,
      dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
      key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!unit || !dbUrl || !key)
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    if (!cached || cached.expires < Date.now()) {
      const response = await fetch(
        "https://www.gstatic.com/admob/reward/verifier-keys.json",
        { signal: AbortSignal.timeout(10000), cache: "no-store" },
      );
      if (!response.ok) throw new Error("Key server unavailable");
      const data = await response.json();
      cached = { expires: Date.now() + 3600000, keys: data.keys };
    }
    const publicKey = cached.keys.find(
      (k) => String(k.keyId) === url.searchParams.get("key_id"),
    );
    if (!publicKey) throw new Error("Unknown key");
    const signed = verifyAdSignature(url.search.slice(1), publicKey.pem);
    if (
      signed.get("ad_unit") !== unit.split("/").pop() ||
      !Number.isFinite(Number(signed.get("reward_amount"))) ||
      Number(signed.get("reward_amount")) <= 0
    )
      throw new Error("Invalid ad reward");
    const rawTimestamp = Number(signed.get("timestamp"));
    const timestamp = rawTimestamp > 1e14 ? rawTimestamp / 1000 : rawTimestamp;
    if (
      !Number.isFinite(timestamp) ||
      Math.abs(Date.now() - timestamp) > 15 * 60000
    )
      throw new Error("Expired callback");
    const user = z.string().uuid().parse(signed.get("user_id")),
      intent = z.string().uuid().parse(signed.get("custom_data")),
      event = z.string().min(8).max(200).parse(signed.get("transaction_id"));
    const db = createClient(dbUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await db.rpc("grant_verified_ad", {
      p_user: user,
      p_intent: intent,
      p_event: event,
    });
    if (error) throw new Error("Reward rejected");
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Ad verification failed" },
      { status: 400 },
    );
  }
}
