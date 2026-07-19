export const ANALYZE_RATE_LIMIT_MESSAGE =
  "The live demo is rate-limited. Please try again in about a minute. Fixtures work without limits.";

export class AnalyzeRateLimitError extends Error {
  constructor() {
    super(ANALYZE_RATE_LIMIT_MESSAGE);
    this.name = "AnalyzeRateLimitError";
  }
}

export async function readAnalyzeResponse(response: Response) {
  if (response.status === 429) throw new AnalyzeRateLimitError();

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("The analysis service returned an unreadable response.");
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : "Analysis failed.";
    throw new Error(message);
  }

  return payload;
}
