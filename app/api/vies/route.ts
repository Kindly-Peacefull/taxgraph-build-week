import { NextResponse } from "next/server";
import { z } from "zod";
import {
  consumeRateLimit,
  rateLimitHeaders,
  readBoundedInteger,
  requestClientIdentifier,
} from "@/lib/rate-limit";
import { checkViesLive } from "@/lib/vies";

export const runtime = "nodejs";

const requestSchema = z.object({
  countryCode: z.string().length(2),
  vatNumber: z.string().min(1).max(20),
});

export async function POST(request: Request) {
  const requestsPerMinute = readBoundedInteger(
    process.env.VIES_RATE_LIMIT_PER_MINUTE,
    30,
    1,
    300,
  );
  const rateLimit = consumeRateLimit(
    "vies",
    requestClientIdentifier(request),
    requestsPerMinute,
  );
  const headers = rateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error:
          "Too many VIES requests. Try again after the rate-limit window resets.",
      },
      { status: 429, headers },
    );
  }

  let requestPayload: unknown;
  try {
    requestPayload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The request body must be valid JSON." },
      { status: 400, headers },
    );
  }

  const input = requestSchema.safeParse(requestPayload);
  if (!input.success) {
    return NextResponse.json(
      { error: "Invalid VIES request", issues: input.error.issues },
      { status: 400, headers },
    );
  }

  try {
    return NextResponse.json(
      await checkViesLive(input.data.countryCode, input.data.vatNumber),
      { headers },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid VIES input",
      },
      { status: 400, headers },
    );
  }
}
