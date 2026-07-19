import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import {
  buildNarrativeInput,
  narrativeModelPayloadSchema,
  narrativeInputSourceIds,
  narrativeSystemPrompt,
  validateNarrativePayload,
} from "@/lib/narrative";
import {
  classifyOpenAIError,
  createCodedOpenAIError,
  isOpenAITimeoutError,
  shouldRetryOpenAIError,
} from "@/lib/openai-safety";
import {
  consumeRateLimit,
  rateLimitHeaders,
  readBoundedInteger,
  requestClientIdentifier,
} from "@/lib/rate-limit";
import { readGuardedJson, RequestGuardError } from "@/lib/request-guards";

export const runtime = "nodejs";

const maxOutputTokens = 1_500;
const narrativeModel = "gpt-5.6";

export async function POST(request: Request) {
  const requestsPerMinute = readBoundedInteger(
    process.env.ANALYZE_RATE_LIMIT_PER_MINUTE,
    10,
    1,
    120,
  );
  const rateLimit = consumeRateLimit(
    "analyze",
    requestClientIdentifier(request),
    requestsPerMinute,
  );
  const headers: Record<string, string> = {
    ...rateLimitHeaders(rateLimit),
    "X-TaxGraph-Max-Output-Tokens": String(maxOutputTokens),
  };
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many analysis requests. Try again after the rate-limit window resets.",
      },
      { status: 429, headers },
    );
  }

  let requestPayload: unknown;
  try {
    requestPayload = await readGuardedJson(request, 256 * 1024);
  } catch (error) {
    const status = error instanceof RequestGuardError ? error.status : 400;
    return NextResponse.json(
      {
        error:
          error instanceof RequestGuardError
            ? error.message
            : "The request body must be valid JSON.",
      },
      { status, headers },
    );
  }

  let narrativeInput;
  try {
    narrativeInput = buildNarrativeInput(requestPayload);
  } catch {
    return NextResponse.json(
      {
        error:
          "The current analysis could not pass the narrative citation gate.",
        errorCode: "NARRATIVE_INPUT_REJECTED",
      },
      { status: 400, headers },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Narrative explanation requires OPENAI_API_KEY in the server environment.",
        errorCode: "NARRATIVE_LIVE_DISABLED",
      },
      { status: 503, headers },
    );
  }

  const timeoutMs = readBoundedInteger(
    process.env.OPENAI_TIMEOUT_MS,
    75_000,
    60_000,
    90_000,
  );
  headers["X-TaxGraph-Timeout-Ms"] = String(timeoutMs);
  const client = new OpenAI({ apiKey, maxRetries: 0, timeout: timeoutMs });
  const startedAt = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const remainingTimeoutMs = timeoutMs - (Date.now() - startedAt);
    if (remainingTimeoutMs <= 0) {
      lastError = createCodedOpenAIError("OPENAI_TIMEOUT_ERROR", false);
      break;
    }

    try {
      const response = await client.responses.parse(
        {
          model: narrativeModel,
          max_output_tokens: maxOutputTokens,
          reasoning: { effort: "low" },
          store: false,
          input: [
            { role: "system", content: narrativeSystemPrompt },
            { role: "user", content: JSON.stringify(narrativeInput) },
          ],
          text: {
            format: zodTextFormat(
              narrativeModelPayloadSchema,
              "taxgraph_narrative",
            ),
          },
        },
        { timeout: remainingTimeoutMs },
      );

      if (response.usage) {
        headers["X-TaxGraph-Input-Tokens"] = String(
          response.usage.input_tokens,
        );
        headers["X-TaxGraph-Output-Tokens"] = String(
          response.usage.output_tokens,
        );
        headers["X-TaxGraph-Total-Tokens"] = String(
          response.usage.total_tokens,
        );
      }

      if (!response.output_parsed) {
        const refused = response.output.some(
          (item) =>
            item.type === "message" &&
            item.content.some((content) => content.type === "refusal"),
        );
        throw createCodedOpenAIError(
          refused ? "OPENAI_REFUSAL" : "OPENAI_NO_PARSED_OUTPUT",
          !refused,
        );
      }

      let payload;
      try {
        payload = validateNarrativePayload(
          response.output_parsed,
          narrativeInputSourceIds(narrativeInput),
        );
      } catch {
        throw createCodedOpenAIError("OPENAI_NARRATIVE_VALIDATION_ERROR", true);
      }

      return NextResponse.json(
        {
          ...payload,
          generatedAt: new Date().toISOString(),
          model: narrativeModel,
        },
        { headers },
      );
    } catch (error) {
      lastError = isOpenAITimeoutError(error)
        ? createCodedOpenAIError("OPENAI_TIMEOUT_ERROR", false)
        : error;
      if (!shouldRetryOpenAIError(lastError)) break;
    }
  }

  const errorCode = classifyOpenAIError(lastError);
  return NextResponse.json(
    {
      error:
        errorCode === "OPENAI_TIMEOUT_ERROR"
          ? "The narrative explanation timed out. The analysis remains available."
          : "The narrative explanation could not be validated after two attempts. The analysis remains available.",
      errorCode,
    },
    { status: errorCode === "OPENAI_TIMEOUT_ERROR" ? 504 : 502, headers },
  );
}
