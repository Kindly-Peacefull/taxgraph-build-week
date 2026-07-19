import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as analyze } from "@/app/api/analyze/route";
import { POST as explain } from "@/app/api/explain/route";
import { evaluateTransaction } from "@/lib/engine";
import {
  createFranceTransaction,
  createFranceViesResult,
  franceInput,
} from "@/lib/fixtures";
import { resetRateLimitsForTests } from "@/lib/rate-limit";

function apiRequest(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": "test-client",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("API trust and abuse boundaries", () => {
  beforeEach(() => {
    resetRateLimitsForTests();
    vi.stubEnv("ANALYZE_RATE_LIMIT_PER_MINUTE", "10");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns 415 for non-JSON and 403 for cross-origin requests", async () => {
    const unsupported = await analyze(
      apiRequest("/api/analyze", franceInput, { "content-type": "text/plain" }),
    );
    expect(unsupported.status).toBe(415);

    resetRateLimitsForTests();
    const crossOrigin = await explain(
      apiRequest("/api/explain", {}, { origin: "https://attacker.example" }),
    );
    expect(crossOrigin.status).toBe(403);
  });

  it("returns 413 for analyze and explain bodies over their byte limits", async () => {
    const analyzeResponse = await analyze(
      apiRequest("/api/analyze", JSON.stringify({ pad: "a".repeat(65_536) })),
    );
    expect(analyzeResponse.status).toBe(413);

    resetRateLimitsForTests();
    const explainResponse = await explain(
      apiRequest("/api/explain", JSON.stringify({ pad: "a".repeat(262_144) })),
    );
    expect(explainResponse.status).toBe(413);
  });

  it("counts structured strings in the 16,000-character analyze cap", async () => {
    const input = structuredClone(franceInput);
    input.demoScenarioId = null;
    input.freeTextDescription = "a".repeat(15_990);
    input.contractExcerpt = "";

    const response = await analyze(apiRequest("/api/analyze", input));
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ error: expect.stringContaining("total") }),
    );
  });

  it("shares the code-level minute bucket between analyze and explain", async () => {
    vi.stubEnv("ANALYZE_RATE_LIMIT_PER_MINUTE", "1");
    const first = await analyze(apiRequest("/api/analyze", franceInput));
    expect(first.status).toBe(200);

    const second = await explain(apiRequest("/api/explain", {}));
    expect(second.status).toBe(429);
  });

  it("returns 400 for a forged source-backed claim before any model call", async () => {
    const analysis = evaluateTransaction(
      franceInput,
      createFranceTransaction(),
      createFranceViesResult(),
    );
    const forged = structuredClone(analysis);
    const claim = forged.taxTouchpoints
      .flatMap((touchpoint) => touchpoint.claims)
      .find((item) => item.sourceIds.length > 0);
    claim!.sourceIds = ["S14"];

    const response = await explain(apiRequest("/api/explain", forged));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ errorCode: "NARRATIVE_INPUT_REJECTED" }),
    );
  });
});
