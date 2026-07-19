import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeRateLimit,
  rateLimitHeaders,
  readBoundedInteger,
  requestClientIdentifier,
  resetRateLimitsForTests,
} from "@/lib/rate-limit";

describe("API rate limiting", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("allows requests up to the configured minute limit and then returns 429 metadata", () => {
    const start = 1_000_000;
    expect(consumeRateLimit("analyze", "client-a", 2, start)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(consumeRateLimit("analyze", "client-a", 2, start + 1)).toMatchObject(
      {
        allowed: true,
        remaining: 0,
      },
    );
    const rejected = consumeRateLimit("analyze", "client-a", 2, start + 2);
    expect(rejected).toMatchObject({ allowed: false, remaining: 0 });
    expect(rateLimitHeaders(rejected, start + 2)).toMatchObject({
      "RateLimit-Limit": "2",
      "RateLimit-Remaining": "0",
      "Retry-After": "60",
    });
  });

  it("starts a fresh bucket after sixty seconds", () => {
    const first = consumeRateLimit("vies", "client-b", 1, 0);
    expect(first.allowed).toBe(true);
    expect(consumeRateLimit("vies", "client-b", 1, 59_999).allowed).toBe(false);
    expect(consumeRateLimit("vies", "client-b", 1, 60_000).allowed).toBe(true);
  });

  it("isolates route scopes and client identifiers", () => {
    expect(consumeRateLimit("analyze", "client-a", 1, 0).allowed).toBe(true);
    expect(consumeRateLimit("vies", "client-a", 1, 0).allowed).toBe(true);
    expect(consumeRateLimit("analyze", "client-b", 1, 0).allowed).toBe(true);
  });

  it("uses the first forwarded client address and clamps numeric configuration", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(requestClientIdentifier(request)).toBe("203.0.113.7");
    expect(readBoundedInteger("999", 10, 1, 120)).toBe(120);
    expect(readBoundedInteger("invalid", 10, 1, 120)).toBe(10);
    expect(readBoundedInteger("2garbage", 10, 1, 120)).toBe(10);
  });
});
