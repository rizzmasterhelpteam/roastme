import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { backend, getState, ensure, ApiError } from "@/lib/server/backend";
import { InputBudgetError } from "@/lib/server/token-budget";
import { loadConversationMemory } from "@/lib/server/memory-store";
import {
  generate,
  demoRoast,
  SafetyError,
  TextProviderError,
} from "@/lib/server/providers";
import { generationSchema, imageType, reportReasons } from "@/lib/validation";
import { levelFromChaos, type Roast } from "@/lib/personas";
import { replyLanguages } from "@/lib/languages";
import { isAllowedOrigin, corsHeaders } from "@/lib/api-origin";
import { syncRevenueCat } from "@/lib/server/android-monetization";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;
async function handle(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const path = (await params).path.join("/");
    if (request.method !== "GET") {
      if (!isAllowedOrigin(request))
        throw new ApiError("Invalid request origin.", 403);
      if (Number(request.headers.get("content-length") || 0) > 7600000)
        throw new ApiError("Request is too large.", 413);
    }
    const b = await backend(request);
    if (request.method === "GET" && path === "billing/status") {
      if (!b.demo && b.user.is_anonymous)
        throw new ApiError(
          "Sign in to an account before purchasing Premium.",
          401,
        );
      if (b.demo || !process.env.REVENUECAT_SECRET_KEY)
        throw new ApiError(
          "Subscriptions are not configured yet. No payment was taken.",
          503,
        );
      return NextResponse.json({ configured: true });
    }
    if (request.method === "GET" && path === "rewards/status") {
      if (b.demo)
        throw new ApiError("Connect the live service to verify an ad.", 503);
      const intent = z
        .string()
        .uuid()
        .parse(new URL(request.url).searchParams.get("intent"));
      const row = ensure(
        await b.db
          .from("ad_rewards")
          .select("verification_status")
          .eq("user_id", b.id)
          .eq("id", intent)
          .single(),
      );
      return NextResponse.json({
        verified: row.data?.verification_status === "verified",
      });
    }
    if (request.method === "GET" && path === "premium/status")
      return NextResponse.json({ connected: true });
    if (request.method === "GET" && path === "state")
      return NextResponse.json(await getState(b), {
        headers: { "Cache-Control": "no-store" },
      });
    if (request.method !== "POST") throw new ApiError("Not found", 404);
    const raw = await request.text();
    if (raw.length > 7600000) throw new ApiError("Request is too large.", 413);
    const body = JSON.parse(raw || "{}");
    if (path === "premium/connect") {
      if (!b.demo && !b.user.is_anonymous) {
        const instance = z
          .string()
          .uuid()
          .parse(request.headers.get("x-roast-instance"));
        ensure(
          await b.db.rpc("connect_premium_session", {
            p_user: b.id,
            p_instance: instance,
          }),
        );
      }
      return NextResponse.json({ connected: true });
    }
    if (path === "memory/clear") {
      const sessionId = z.string().uuid().parse(body.sessionId);
      const persona = generationSchema.shape.persona.parse(body.persona);
      if (!b.demo)
        ensure(
          await b.db.rpc("clear_persona_conversation", {
            p_user: b.id,
            p_session: sessionId,
            p_persona: persona,
          }),
        );
      return NextResponse.json({ cleared: true });
    }
    if (path === "billing/sync") {
      if (b.demo)
        throw new ApiError("Subscriptions are not configured yet.", 503);
      await syncRevenueCat(b.db, b.id);
      return NextResponse.json({ state: await getState(b) });
    }
    if (path === "rewards/intent") {
      if (b.demo || !process.env.ADMOB_REWARDED_AD_UNIT)
        throw new ApiError("Rewarded ads are not configured yet.", 503);
      const state = await getState(b);
      if (state.premium) throw new ApiError("Premium members don’t need ads.");
      if (state.credits > 0)
        throw new ApiError("Use your remaining credits before watching an ad.");
      const intent = ensure(
        await b.db.rpc("create_ad_intent", { p_user: b.id }),
      );
      return NextResponse.json({ intentId: intent.data });
    }
    if (path === "rewards/claim") {
      if (b.demo || !process.env.ADMOB_REWARDED_AD_UNIT)
        throw new ApiError("Rewarded ads are not configured yet.", 503);
      const intentId = z.string().uuid().parse(body.intentId);
      ensure(
        await b.db.rpc("grant_verified_ad", {
          p_user: b.id,
          p_intent: intentId,
          p_event: `client:${intentId}`,
        }),
      );
      return NextResponse.json({ state: await getState(b) });
    }
    if (path === "roast") {
      const input = generationSchema.parse(body);
      const cost = input.type === "image" ? 2 : 1;
      if (input.type === "image") imageType(input.image || "");
      if (
        input.type === "battle" &&
        (!input.opponent || input.opponent === input.persona)
      )
        throw new ApiError("Choose two different personas.");
      if (b.demo) {
        const prior = b.record.state.history.find(
          (r) => r.id === input.requestId,
        );
        if (prior)
          return NextResponse.json({ roast: prior, state: b.record.state });
        if (b.record.busy)
          throw new ApiError(
            "A roast is already cooking. Try again shortly.",
            429,
          );
        b.record.requests = b.record.requests.filter(
          (t) => t > Date.now() - 60000,
        );
        if (b.record.requests.length >= 10)
          throw new ApiError("Take a breather. Try again in a minute.", 429);
        if (b.record.state.credits < cost)
          throw new ApiError("OUT_OF_CREDITS", 402);
        b.record.busy = true;
        b.record.requests.push(Date.now());
        try {
          const content = demoRoast(input);
          const roast: Roast = {
            id: input.requestId,
            content,
            prompt: input.prompt,
            persona: input.persona,
            type: input.type,
            created_at: new Date().toISOString(),
            saved: false,
            session_id: input.sessionId || randomUUID(),
          };
          b.record.state.credits -= cost;
          b.record.state.history.unshift(roast);
          return NextResponse.json({ roast, state: b.record.state });
        } finally {
          b.record.busy = false;
        }
      }
      const previous = ensure(
        await b.db
          .from("messages")
          .select("id")
          .eq("user_id", b.id)
          .eq("request_id", input.requestId)
          .maybeSingle(),
      );
      if (previous.data) {
        const previousId = previous.data.id;
        const state = await getState(b);
        return NextResponse.json({
          roast: state.history.find((r) => r.id === previousId),
          state,
        });
      }
      const token = randomUUID();
      const start = await b.db.rpc("begin_generation", {
        p_user: b.id,
        p_token: token,
        p_cost: cost,
      });
      if (start.error)
        throw new ApiError(
          start.error.message,
          start.error.message.includes("OUT_OF_CREDITS") ? 402 : 429,
        );
      let path: string | null = null;
      let committed = false;
      try {
        let context: { prompt: string; content: string }[] = [];
        const memory = await loadConversationMemory(
          b.db,
          b.id,
          !b.user.is_anonymous,
          input.sessionId,
          input.persona,
          input.memory,
        );
        if (input.sessionId) {
          const recent = ensure(
            await b.db
              .from("messages")
              .select("prompt,content")
              .eq("user_id", b.id)
              .eq("session_id", input.sessionId)
              .eq("persona", input.persona)
              .order("created_at", { ascending: false })
              .order("id", { ascending: false })
              .limit(6),
          );
          context = (recent.data || []).reverse();
        }
        const { content, notes } = await generate(input, context, memory.notes);
        if (input.type === "image") {
          const image = imageType(input.image!);
          path = `${b.id}/${randomUUID()}.${image.mime.split("/")[1]}`;
          ensure(
            await b.db.storage.from("roast-images").upload(path, image.bytes, {
              contentType: image.mime,
              upsert: false,
            }),
          );
          ensure(
            await b.db.from("image_uploads").insert({
              user_id: b.id,
              storage_path: path,
              file_type: image.mime,
              file_size: image.bytes.length,
            }),
          );
        }
        const done = ensure(
          await b.db.rpc("finish_generation_with_memory", {
            p_user: b.id,
            p_token: token,
            p_request: input.requestId,
            p_session: input.sessionId || randomUUID(),
            p_persona: input.persona,
            p_type: input.type,
            p_level: levelFromChaos(input.chaos),
            p_chaos: input.chaos,
            p_prompt: input.prompt,
            p_content: content,
            p_image: path,
            p_notes: input.sessionId ? notes : null,
            p_revision: memory.revision,
            p_persist: !b.user.is_anonymous,
          }),
        );
        committed = true;
        const state = await getState(b);
        return NextResponse.json({
          roast: state.history.find((r) => r.id === done.data),
          state,
          ...(input.sessionId && b.user.is_anonymous
            ? {
                memory: {
                  notes,
                  sourceId: done.data,
                  revision: memory.revision,
                },
              }
            : {}),
        });
      } finally {
        if (!committed) {
          await b.db.rpc("cancel_generation", { p_user: b.id, p_token: token });
          if (path) {
            await b.db.storage.from("roast-images").remove([path]);
            await b.db
              .from("image_uploads")
              .delete()
              .eq("user_id", b.id)
              .eq("storage_path", path);
          }
        }
      }
    }
    if (path === "rewards/daily") {
      throw new ApiError("Daily credits reset automatically at 00:00 UTC.");
    } else if (path === "rewards/ad")
      throw new ApiError(
        "Rewarded ads are not available yet. Free credits reset at 00:00 UTC.",
        503,
      );
    else if (
      path === "billing/checkout" ||
      path === "billing/restore" ||
      path === "billing/manage"
    )
      throw new ApiError(
        "Subscriptions are not available yet. No payment has been taken.",
        503,
      );
    else if (
      path === "history/save" ||
      path === "history/delete" ||
      path === "history/feedback" ||
      path === "reports"
    ) {
      const id = z.string().uuid().parse(body.id);
      if (b.demo) {
        const item = b.record.state.history.find((r) => r.id === id);
        if (!item) throw new ApiError("Roast not found.", 404);
        if (path === "history/save") item.saved = z.boolean().parse(body.saved);
        if (path === "history/delete")
          b.record.state.history = b.record.state.history.filter(
            (r) => r.id !== id,
          );
        if (path === "history/feedback")
          item.feedback = z.enum(["like", "dislike"]).parse(body.feedback);
        if (path === "reports")
          b.record.reports.push({
            id,
            reason: z
              .enum(reportReasons as [string, ...string[]])
              .parse(body.reason),
            details: z
              .string()
              .max(1000)
              .parse(body.details || ""),
          });
      } else {
        const owned = ensure(
          await b.db
            .from("messages")
            .select("id,image_path")
            .eq("id", id)
            .eq("user_id", b.id)
            .single(),
        );
        if (!owned.data) throw new ApiError("Roast not found.", 404);
        if (path === "history/save") {
          if (z.boolean().parse(body.saved))
            ensure(
              await b.db
                .from("saved_roasts")
                .upsert({ user_id: b.id, message_id: id }),
            );
          else
            ensure(
              await b.db
                .from("saved_roasts")
                .delete()
                .eq("user_id", b.id)
                .eq("message_id", id),
            );
        }
        if (path === "history/delete") {
          if (owned.data.image_path) {
            ensure(
              await b.db.storage
                .from("roast-images")
                .remove([owned.data.image_path]),
            );
            ensure(
              await b.db
                .from("image_uploads")
                .delete()
                .eq("user_id", b.id)
                .eq("storage_path", owned.data.image_path),
            );
          }
          ensure(
            await b.db
              .from("messages")
              .delete()
              .eq("id", id)
              .eq("user_id", b.id),
          );
        }
        if (path === "history/feedback")
          ensure(
            await b.db
              .from("messages")
              .update({
                feedback: z.enum(["like", "dislike"]).parse(body.feedback),
              })
              .eq("id", id)
              .eq("user_id", b.id),
          );
        if (path === "reports")
          ensure(
            await b.db.from("reports").insert({
              user_id: b.id,
              message_id: id,
              reason: z
                .enum(reportReasons as [string, ...string[]])
                .parse(body.reason),
              details: z
                .string()
                .max(1000)
                .parse(body.details || ""),
            }),
          );
      }
    } else if (path === "settings") {
      const preferences = z
        .object({
          notifications: z.boolean(),
          sound: z.boolean(),
          haptics: z.boolean(),
          dark: z.boolean(),
          language: z.enum(replyLanguages),
        })
        .parse(body);
      if (b.demo) b.record.state.settings = preferences;
      else
        ensure(
          await b.db
            .from("user_settings")
            .update({ preferences })
            .eq("user_id", b.id)
            .select("user_id")
            .single(),
        );
    } else if (path === "account/delete") {
      if (body.confirmation !== "DELETE")
        throw new ApiError("Type DELETE to confirm.");
      if (b.demo) {
        b.record.state.history = [];
        b.record.reports = [];
        b.record.state.credits = 0;
        const jar = await (await import("next/headers")).cookies();
        jar.delete("roast_demo");
        return NextResponse.json({ deleted: true });
      }
      const uploads = ensure(
        await b.db
          .from("image_uploads")
          .select("storage_path")
          .eq("user_id", b.id),
      );
      if (uploads.data?.length)
        ensure(
          await b.db.storage
            .from("roast-images")
            .remove(uploads.data.map((i) => i.storage_path)),
        );
      ensure(await b.db.auth.admin.signOut(b.token, "global"));
      ensure(await b.db.auth.admin.deleteUser(b.id));
      return NextResponse.json({ deleted: true });
    } else throw new ApiError("Not found", 404);
    return NextResponse.json({ state: await getState(b) });
  } catch (error) {
    if (error instanceof InputBudgetError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof TextProviderError)
      return NextResponse.json({ error: error.message }, { status: 503 });
    if (error instanceof SafetyError)
      return NextResponse.json(
        { error: error.message, blocked: true },
        { status: 422 },
      );
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid request." },
        { status: 400 },
      );
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const known = error instanceof ApiError;
    if (!known)
      console.error(
        "Roast API:",
        error instanceof Error ? error.message : "Unexpected error",
      );
    return NextResponse.json(
      {
        error: known
          ? error.message
          : "The roast could not be completed. Please try again.",
      },
      { status: known ? error.status : 503 },
    );
  }
}
async function route(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const response = await handle(request, context);
  corsHeaders(request).forEach((value, key) =>
    response.headers.set(key, value),
  );
  return response;
}
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: isAllowedOrigin(request) ? 204 : 403,
    headers: corsHeaders(request),
  });
}
export { route as GET, route as POST };
