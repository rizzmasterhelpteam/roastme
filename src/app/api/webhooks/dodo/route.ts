import { createClient } from "@supabase/supabase-js";
import { dodoConfigured, WebBillingError } from "@/lib/server/dodo";
import { handleDodoEvent } from "@/lib/server/web-billing";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !dodoConfigured())
    return Response.json({ error: "Not configured" }, { status: 503 });
  const body = await request.text();
  if (body.length > 262144)
    return Response.json({ error: "Payload too large" }, { status: 413 });
  try {
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await handleDodoEvent(
      db,
      body,
      Object.fromEntries(request.headers.entries()),
    );
    return Response.json({ received: true });
  } catch (error) {
    const status = error instanceof WebBillingError ? error.status : 503;
    console.error("Dodo webhook failed", { status });
    return Response.json(
      {
        error:
          status === 401
            ? "Invalid signature"
            : "Webhook processing failed; retry delivery.",
      },
      { status },
    );
  }
}
