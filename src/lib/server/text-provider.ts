import {
  assertInputBudget,
  GENERATION_INPUT_BUDGET,
  SAFETY_INPUT_BUDGET,
  countInputTokens,
} from "./token-budget";

export class TextProviderError extends Error {}
export async function completeText(
  messages: { role: string; content: string }[],
  json: boolean | "memory" = false,
  attempt = 0,
) {
  const safety = json === true;
  if (safety && countInputTokens(messages) > SAFETY_INPUT_BUDGET)
    throw new TextProviderError(
      "The reply ran too long. Please try again. No credits were used.",
    );
  assertInputBudget(
    messages,
    safety ? SAFETY_INPUT_BUDGET : GENERATION_INPUT_BUDGET,
  );
  if (!process.env.OPENROUTER_API_KEY?.trim())
    throw new TextProviderError("Text roasting is not configured yet.");
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY.trim()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://www.roastme-ai.com",
        "X-Title": "Roast Me AI",
      },
      body: JSON.stringify({
        model:
          process.env.OPENROUTER_MODEL?.trim() ||
          "deepseek/deepseek-v4-flash-0731",
        messages,
        max_tokens: 2048,
        // This checkpoint supports low/high/max/none, not OpenAI's medium.
        // Keep reasoning out of the reply and require JSON/reasoning support.
        reasoning: { effort: safety ? "low" : "none", exclude: true },
        provider: { require_parameters: true },
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok) {
    const failure = await response.json().catch(() => null);
    const code = failure?.error?.code;
    const errorType = failure?.error?.type;
    const quotaFailure =
      [code, errorType].some(
        (value) =>
          typeof value === "string" &&
          /quota|billing|budget|credit.*exhaust/i.test(value),
      ) ||
      /exceeded your current quota|check your plan and billing|insufficient credits/i.test(
        failure?.error?.message || "",
      );
    console.error("Text provider request failed", {
      status: response.status,
      code: typeof code === "string" ? code : undefined,
      requestId: response.headers.get("x-request-id"),
    });
    if (response.status === 401)
      throw new TextProviderError(
        "The text service key could not be authenticated. Please contact support. No credits were used.",
      );
    if (response.status === 402 || quotaFailure)
      throw new TextProviderError(
        "The text service has no available API quota. The app owner needs to check API billing and project limits. No credits were used.",
      );
    if (response.status === 404 || code === "model_not_found")
      throw new TextProviderError(
        "The configured text model is unavailable. Please contact support. No credits were used.",
      );
    if (response.status === 403)
      throw new TextProviderError(
        "The text service key does not have permission for this model. Please contact support. No credits were used.",
      );
    if (response.status === 429 && attempt === 0) {
      const retrySeconds = Number(response.headers.get("retry-after") || "2");
      if (
        Number.isFinite(retrySeconds) &&
        retrySeconds >= 0 &&
        retrySeconds <= 5
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.max(1000, retrySeconds * 1000)),
        );
        return completeText(messages, json, attempt + 1);
      }
    }
    if (response.status === 429)
      throw new TextProviderError(
        "The text service is receiving too many requests. Please try shortly. No credits were used.",
      );
    const reference =
      typeof code === "string" && /^[a-z_]{1,64}$/.test(code)
        ? ` (${response.status}: ${code})`
        : ` (${response.status})`;
    throw new TextProviderError(
      `The text service could not process this request${reference}. Please contact support. No credits were used.`,
    );
  }
  const data = await response.json();
  // OpenRouter can return a provider error inside an HTTP 200 response.
  if (data.error || data.choices?.[0]?.finish_reason === "error") {
    console.error("Text provider returned an inference error", {
      provider: "openrouter",
      code: typeof data.error?.code === "number" ? data.error.code : undefined,
    });
    throw new TextProviderError(
      "The text service could not finish this request. Please retry. No credits were used.",
    );
  }
  if (data.usage)
    console.info("Roast AI token usage", {
      provider: "openrouter",
      model: data.model,
      generationId: data.id,
      cost: data.usage.cost,
      purpose: safety ? "safety" : "roast",
      budgetedInput: countInputTokens(messages),
      historyTurns: safety
        ? 0
        : messages.filter((m) => m.role === "assistant").length,
      input: data.usage.prompt_tokens,
      cachedInput: data.usage.prompt_tokens_details?.cached_tokens,
      output: data.usage.completion_tokens,
      reasoning: data.usage.completion_tokens_details?.reasoning_tokens,
    });
  if (data.choices?.[0]?.finish_reason === "length")
    throw new Error(
      "The roast was cut short. Please try again. No credits were used.",
    );
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim())
    throw new Error("No roast came back. Please try again.");
  return text.trim();
}
