import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkViesLive,
  classifyViesError,
  maskVatNumber,
  OFFICIAL_VIES_ENDPOINT_URL,
  resolveViesEndpoint,
  validateVatInput,
} from "@/lib/vies";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("VIES adapter input safety", () => {
  it("normalizes a German VAT ID for the server request", () => {
    expect(validateVatInput("de", "DE 123456789")).toEqual({
      countryCode: "DE",
      vatNumber: "123456789",
    });
  });

  it("rejects invalid input before a network call", () => {
    expect(() => validateVatInput("DE", "***")).toThrow(/format/);
  });

  it("masks VAT numbers before returning them to the UI", () => {
    expect(maskVatNumber("DE", "DE123456789")).toBe("DE12•••••89");
  });

  it("uses only the confirmed official REST operation URL", () => {
    expect(resolveViesEndpoint()).toBe(OFFICIAL_VIES_ENDPOINT_URL);
    expect(() =>
      resolveViesEndpoint("https://example.com/check-vat-number"),
    ).toThrow("VIES_ENDPOINT_NOT_ALLOWED");
    expect(() =>
      resolveViesEndpoint(`${OFFICIAL_VIES_ENDPOINT_URL}?redirect=true`),
    ).toThrow("VIES_ENDPOINT_NOT_ALLOWED");
  });

  it("maps network details to safe fallback codes", () => {
    expect(classifyViesError(new Error("socket host detail"))).toBe(
      "VIES_REQUEST_FAILED",
    );
  });

  it("returns a safe unavailable fallback when live VIES is disabled", async () => {
    vi.stubEnv("VIES_LIVE_ENABLED", "false");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkViesLive("DE", "DE123456789");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "unavailable",
      liveOrFixture: "unavailable",
      errorCode: "LIVE_DISABLED",
      vatNumberMaskedOrSafe: "DE12•••••89",
    });
  });

  it("posts the documented payload to the official endpoint", async () => {
    vi.stubEnv("VIES_LIVE_ENABLED", "true");
    vi.stubEnv("VIES_ENDPOINT_URL", "");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          countryCode: "DE",
          vatNumber: "123456789",
          requestDate: "2026-07-19T10:00:00.000Z",
          valid: true,
          requestIdentifier: "request-safe-id",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkViesLive("de", "DE 123456789");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(OFFICIAL_VIES_ENDPOINT_URL);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      countryCode: "DE",
      vatNumber: "123456789",
    });
    expect(result).toMatchObject({
      status: "valid",
      liveOrFixture: "live",
      requestIdentifier: "request-safe-id",
      vatNumberMaskedOrSafe: "DE12•••••89",
    });
  });

  it("falls back safely when the official service is unavailable", async () => {
    vi.stubEnv("VIES_LIVE_ENABLED", "true");
    vi.stubEnv("VIES_ENDPOINT_URL", "");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    );

    const result = await checkViesLive("DE", "DE123456789");

    expect(result).toMatchObject({
      status: "unavailable",
      liveOrFixture: "unavailable",
      errorCode: "VIES_HTTP_503",
    });
  });
});
