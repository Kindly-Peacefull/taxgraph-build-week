import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse } from "next/server";
import { scenarioInputSchema, viesCheckResultSchema } from "@/lib/domain";
import { evaluateTransaction } from "@/lib/engine";
import {
  createFranceTransaction,
  createFranceViesResult,
  createGermanyTransaction,
  createGermanyViesResult,
} from "@/lib/fixtures";
import {
  mergeModelPayload,
  modelNormalizationPayloadSchema,
  normalizationSystemPrompt,
} from "@/lib/model-normalization";
import { reconcileMissingFactQuestions } from "@/lib/missing-facts";
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
import {
  readGuardedJson,
  RequestGuardError,
  scenarioInputCharacterCount,
} from "@/lib/request-guards";
import { checkViesLive } from "@/lib/vies";

export const runtime = "nodejs";

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
  const headers: Record<string, string> = rateLimitHeaders(rateLimit);
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
    requestPayload = await readGuardedJson(request, 64 * 1024);
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

  const parsedInput = scenarioInputSchema.safeParse(requestPayload);
  if (!parsedInput.success) {
    return NextResponse.json(
      {
        error: "The transaction input is invalid.",
        issues: parsedInput.error.issues,
      },
      { status: 400, headers },
    );
  }

  const input = parsedInput.data;
  const maximumInputCharacters = readBoundedInteger(
    process.env.ANALYZE_MAX_INPUT_CHARACTERS,
    16_000,
    1_000,
    100_000,
  );
  const modelInputCharacters = scenarioInputCharacterCount(input);
  if (modelInputCharacters > maximumInputCharacters) {
    return NextResponse.json(
      {
        error: `The total transaction input exceeds the ${maximumInputCharacters}-character limit.`,
      },
      { status: 413, headers },
    );
  }

  if (input.demoScenarioId === "france-b2c") {
    return NextResponse.json(
      evaluateTransaction(
        input,
        createFranceTransaction(),
        createFranceViesResult(),
      ),
      { headers },
    );
  }
  if (input.demoScenarioId === "germany-b2b") {
    return NextResponse.json(
      evaluateTransaction(
        input,
        createGermanyTransaction(),
        createGermanyViesResult(),
      ),
      { headers },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) {
    return NextResponse.json(
      {
        error:
          "Live normalization requires OPENAI_API_KEY and OPENAI_MODEL in the server environment.",
        fallbackAvailable: true,
      },
      { status: 503, headers },
    );
  }

  const maxOutputTokens = readBoundedInteger(
    process.env.OPENAI_MAX_OUTPUT_TOKENS,
    6_000,
    1_024,
    12_000,
  );
  const timeoutMs = readBoundedInteger(
    process.env.OPENAI_TIMEOUT_MS,
    75_000,
    60_000,
    90_000,
  );
  headers["X-TaxGraph-Max-Output-Tokens"] = String(maxOutputTokens);
  headers["X-TaxGraph-Timeout-Ms"] = String(timeoutMs);

  const client = new OpenAI({ apiKey, maxRetries: 0, timeout: timeoutMs });
  const normalizationStartedAt = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const remainingTimeoutMs =
      timeoutMs - (Date.now() - normalizationStartedAt);
    if (remainingTimeoutMs <= 0) {
      lastError = createCodedOpenAIError("OPENAI_TIMEOUT_ERROR", false);
      break;
    }
    try {
      const response = await client.responses.parse(
        {
          model,
          max_output_tokens: maxOutputTokens,
          reasoning: { effort: "low" },
          store: false,
          input: [
            { role: "system", content: normalizationSystemPrompt },
            {
              role: "user",
              content: JSON.stringify({
                structuredForm: input.structuredForm,
                freeTextDescription: input.freeTextDescription,
                contractExcerpt: input.contractExcerpt,
              }),
            },
          ],
          text: {
            format: zodTextFormat(
              modelNormalizationPayloadSchema,
              "taxgraph_normalization",
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
        if (response.status === "incomplete") {
          throw createCodedOpenAIError(
            response.incomplete_details?.reason === "max_output_tokens"
              ? "OPENAI_MAX_OUTPUT_TOKENS_REACHED"
              : "OPENAI_INCOMPLETE_OUTPUT",
            false,
          );
        }
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
      let transaction;
      try {
        transaction = mergeModelPayload(
          input,
          response.output_parsed,
          model,
          attempt,
        );
      } catch {
        throw createCodedOpenAIError("OPENAI_NORMALIZATION_MERGE_ERROR", true);
      }
      const viesCheck =
        transaction.customer.country === "DE" && transaction.customer.vatId
          ? await checkViesLive("DE", transaction.customer.vatId)
          : viesCheckResultSchema.parse({
              countryCode: transaction.customer.country,
              vatNumberMaskedOrSafe: "Not provided",
              status: "not_checked",
              checkedAt: new Date().toISOString(),
              liveOrFixture: "unavailable",
              evidenceRef: "vies:not-checked",
            });

      transaction = reconcileMissingFactQuestions(
        transaction,
        viesCheck.status,
      );

      let result;
      try {
        result = evaluateTransaction(input, transaction, viesCheck);
      } catch {
        throw createCodedOpenAIError(
          "OPENAI_DETERMINISTIC_EVALUATION_ERROR",
          false,
        );
      }

      return NextResponse.json(result, { headers });
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
          ? `Live structured normalization stopped after the ${Math.round(timeoutMs / 1_000)}-second server limit. No partial result was used.`
          : "Live structured normalization failed after two validated attempts. No malformed result was used.",
      errorCode,
      fallbackAvailable: true,
    },
    { status: errorCode === "OPENAI_TIMEOUT_ERROR" ? 504 : 502, headers },
  );
}
