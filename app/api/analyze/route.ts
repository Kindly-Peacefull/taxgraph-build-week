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
import { checkViesLive } from "@/lib/vies";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsedInput = scenarioInputSchema.safeParse(await request.json());
  if (!parsedInput.success) {
    return NextResponse.json(
      {
        error: "The transaction input is invalid.",
        issues: parsedInput.error.issues,
      },
      { status: 400 },
    );
  }

  const input = parsedInput.data;
  if (input.demoScenarioId === "france-b2c") {
    return NextResponse.json(
      evaluateTransaction(
        input,
        createFranceTransaction(),
        createFranceViesResult(),
      ),
    );
  }
  if (input.demoScenarioId === "germany-b2b") {
    return NextResponse.json(
      evaluateTransaction(
        input,
        createGermanyTransaction(),
        createGermanyViesResult(),
      ),
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
      { status: 503 },
    );
  }

  const client = new OpenAI({ apiKey });
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await client.responses.parse({
        model,
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
      });

      if (!response.output_parsed) {
        throw new Error("The model did not return a parsed structured output.");
      }
      const transaction = mergeModelPayload(
        input,
        response.output_parsed,
        model,
        attempt,
      );
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

      return NextResponse.json(
        evaluateTransaction(input, transaction, viesCheck),
      );
    } catch (error) {
      lastError = error;
    }
  }

  return NextResponse.json(
    {
      error:
        "Live structured normalization failed after two validated attempts. No malformed result was used.",
      detail: lastError instanceof Error ? lastError.message : "Unknown error",
      fallbackAvailable: true,
    },
    { status: 502 },
  );
}
