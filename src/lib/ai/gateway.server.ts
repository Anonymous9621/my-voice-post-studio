// Server-only AI provider layer. All model calls go through here so the
// provider, model and gateway can be changed via environment variables.
import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText, type ModelMessage } from "ai";
import type { z } from "zod";

import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

const DEFAULT_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const DEFAULT_TEXT_MODEL = "openai/gpt-6-astra";

/** Read inside handlers only (env is per-request on the server runtime). */
export function getAiConfig() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  const textModel = process.env["AI_TEXT_MODEL"] || DEFAULT_TEXT_MODEL;
  return {
    apiKey,
    configured: Boolean(apiKey),
    baseURL: process.env["AI_GATEWAY_URL"] || DEFAULT_GATEWAY_URL,
    textModel,
    visionModel: process.env["AI_VISION_MODEL"] || textModel,
  };
}

export class AiError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
  }
}

function statusOf(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    const e = error as { statusCode?: number; status?: number; cause?: unknown; lastError?: unknown };
    return e.statusCode ?? e.status ?? statusOf(e.lastError) ?? statusOf(e.cause);
  }
  return undefined;
}

function safeMessageOf(error: unknown): string | undefined {
  if (error && typeof error === "object") {
    const e = error as { responseBody?: string; lastError?: unknown };
    if (typeof e.responseBody === "string") {
      try {
        const body = JSON.parse(e.responseBody) as { error?: { message?: string }; message?: string };
        return body.error?.message ?? body.message;
      } catch {
        return undefined;
      }
    }
    return safeMessageOf(e.lastError);
  }
  return undefined;
}

function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  if (NoObjectGeneratedError.isInstance(error)) {
    return new AiError("The AI returned an incomplete answer. Please try again.", "bad_output");
  }
  const status = statusOf(error);
  const upstream = safeMessageOf(error);
  switch (status) {
    case 401:
      return new AiError("AI generation isn't configured correctly. Check the AI key.", "not_configured");
    case 402:
      return new AiError(
        upstream ?? "AI credits have run out for this workspace. Add credits to continue.",
        "credits",
      );
    case 403:
      return new AiError(upstream ?? "The AI provider declined this request.", "denied");
    case 429:
      return new AiError("The AI is busy right now. Please wait a minute and try again.", "rate_limited");
    case 400:
      return new AiError(upstream ?? "The AI couldn't process this request.", "bad_request");
    default:
      if (status && status >= 500) {
        return new AiError("The AI service is temporarily unavailable. Please try again shortly.", "unavailable");
      }
      console.error("[ai] unexpected error", error);
      return new AiError("Something went wrong while generating. Please try again.", "unknown");
  }
}

/**
 * Stream a structured (schema-validated) response and return the final object.
 * Streaming avoids buffered timeouts on long generations.
 */
export async function generateStructured<T>(opts: {
  schema: z.ZodType<T>;
  instructions: string;
  messages: ModelMessage[];
  model?: string;
  effort?: "low" | "medium";
  abortSignal?: AbortSignal;
}): Promise<{ output: T; model: string }> {
  const cfg = getAiConfig();
  if (!cfg.apiKey) {
    throw new AiError(
      "AI generation requires configuration: the server is missing its AI key.",
      "not_configured",
    );
  }
  const model = opts.model ?? cfg.textModel;
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: `${cfg.baseURL.replace(/\/+$/, "").replace(/\/v1$/, "")}/v1`,
    apiKey: cfg.apiKey,
    headers: { "Lovable-API-Key": cfg.apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });

  const reasoning = model !== "openai/chat-latest";
  let streamError: unknown;

  const result = streamText({
    model: provider.responses(model),
    instructions: opts.instructions,
    messages: opts.messages,
    output: Output.object({ schema: opts.schema }),
    ...(opts.abortSignal ? { abortSignal: opts.abortSignal } : {}),
    onError: ({ error }) => {
      streamError = error;
    },
    providerOptions: {
      openai: {
        store: false,
        ...(reasoning
          ? {
              forceReasoning: true,
              reasoningEffort: opts.effort ?? "low",
              reasoningSummary: "auto",
              include: ["reasoning.encrypted_content"],
            }
          : {}),
      },
    },
  });

  try {
    const output = (await result.output) as T;
    if (output == null) throw streamError ?? new AiError("The AI returned an empty answer.", "empty");
    return { output, model };
  } catch (error) {
    throw toAiError(streamError ?? error);
  }
}
