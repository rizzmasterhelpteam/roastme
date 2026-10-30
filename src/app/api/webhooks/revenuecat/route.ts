import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { syncRevenueCat } from "@/lib/server/android-monetization";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_AUTH,
    dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
    service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !dbUrl || !service)
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const actual = Buffer.from(request.headers.get("authorization") || ""),
    expected = Buffer.from(secret);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payload = z
      .object({ event: z.object({ app_user_id: z.string().uuid() }) })
      .parse(await request.json());
    const db = createClient(dbUrl, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await syncRevenueCat(db, payload.event.app_user_id);
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Subscription verification failed" },
      { status: 503 },
    );
  }
}
