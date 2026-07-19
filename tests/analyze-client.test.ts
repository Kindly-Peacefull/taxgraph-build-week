import { describe, expect, it } from "vitest";
import {
  ANALYZE_RATE_LIMIT_MESSAGE,
  AnalyzeRateLimitError,
  readAnalyzeResponse,
} from "@/lib/analyze-client";

describe("analyze client response", () => {
  it("turns a raw WAF or code-level 429 into the friendly demo message", async () => {
    const response = new Response("Too Many Requests", {
      status: 429,
      headers: { "content-type": "text/plain" },
    });

    await expect(readAnalyzeResponse(response)).rejects.toEqual(
      expect.objectContaining({
        name: AnalyzeRateLimitError.name,
        message: ANALYZE_RATE_LIMIT_MESSAGE,
      }),
    );
  });
});
