import { z } from "zod";
import { viesCheckResultSchema, type ViesCheckResult } from "@/lib/domain";
import { readBoundedInteger } from "@/lib/rate-limit";

export const OFFICIAL_VIES_ENDPOINT_URL =
  "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";

const viesResponseSchema = z.object({
  countryCode: z.string().optional(),
  vatNumber: z.string().optional(),
  requestDate: z.string().optional(),
  valid: z.boolean(),
  requestIdentifier: z.string().optional(),
});

export function maskVatNumber(countryCode: string, vatNumber: string) {
  const country = countryCode.toUpperCase();
  const clean = vatNumber.replace(/\s+/g, "").toUpperCase();
  const local = clean.startsWith(country) ? clean.slice(2) : clean;
  if (local.length <= 4) return `${country}${"•".repeat(local.length)}`;
  return `${country}${local.slice(0, 2)}${"•".repeat(local.length - 4)}${local.slice(-2)}`;
}

export function validateVatInput(countryCode: string, vatNumber: string) {
  const country = countryCode.toUpperCase();
  const clean = vatNumber.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    throw new Error("Country code must contain two letters.");
  }
  const local = clean.startsWith(country) ? clean.slice(2) : clean;
  if (!/^[A-Z0-9]{5,14}$/.test(local)) {
    throw new Error("VAT number format is not suitable for a VIES request.");
  }
  return { countryCode: country, vatNumber: local };
}

export function resolveViesEndpoint(configuredEndpoint?: string) {
  const candidate = configuredEndpoint?.trim() || OFFICIAL_VIES_ENDPOINT_URL;
  const parsed = new URL(candidate);
  const official = new URL(OFFICIAL_VIES_ENDPOINT_URL);
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== official.hostname ||
    parsed.pathname.replace(/\/$/, "") !== official.pathname ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.port !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error("VIES_ENDPOINT_NOT_ALLOWED");
  }
  return parsed.toString();
}

export function classifyViesError(error: unknown) {
  if (error instanceof z.ZodError) return "VIES_INVALID_RESPONSE";
  if (error instanceof DOMException && error.name === "AbortError") {
    return "VIES_TIMEOUT";
  }
  if (error instanceof Error && /^VIES_HTTP_\d{3}$/.test(error.message)) {
    return error.message;
  }
  return "VIES_REQUEST_FAILED";
}

export async function checkViesLive(
  countryCode: string,
  vatNumber: string,
): Promise<ViesCheckResult> {
  const checkedAt = new Date().toISOString();
  let input: ReturnType<typeof validateVatInput>;
  try {
    input = validateVatInput(countryCode, vatNumber);
  } catch {
    return viesCheckResultSchema.parse({
      countryCode: countryCode.toUpperCase(),
      vatNumberMaskedOrSafe: maskVatNumber(countryCode, vatNumber),
      status: "invalid_format",
      checkedAt,
      liveOrFixture: "unavailable",
      errorCode: "VIES_INVALID_FORMAT",
      evidenceRef: `vies:not-sent:${checkedAt}`,
    });
  }
  const safeVat = maskVatNumber(input.countryCode, input.vatNumber);
  const enabled = process.env.VIES_LIVE_ENABLED === "true";

  if (!enabled) {
    return viesCheckResultSchema.parse({
      countryCode: input.countryCode,
      vatNumberMaskedOrSafe: safeVat,
      status: "unavailable",
      checkedAt,
      liveOrFixture: "unavailable",
      errorCode: "LIVE_DISABLED",
      evidenceRef: "vies:unavailable",
    });
  }

  let endpoint: string;
  try {
    endpoint = resolveViesEndpoint(process.env.VIES_ENDPOINT_URL);
  } catch {
    return viesCheckResultSchema.parse({
      countryCode: input.countryCode,
      vatNumberMaskedOrSafe: safeVat,
      status: "unavailable",
      checkedAt,
      liveOrFixture: "unavailable",
      errorCode: "VIES_ENDPOINT_NOT_ALLOWED",
      evidenceRef: `vies:unavailable:${checkedAt}`,
    });
  }

  const timeout = readBoundedInteger(
    process.env.VIES_TIMEOUT_MS,
    5_000,
    1_000,
    15_000,
  );
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`VIES_HTTP_${response.status}`);
    }
    const payload = viesResponseSchema.parse(await response.json());
    return viesCheckResultSchema.parse({
      countryCode: input.countryCode,
      vatNumberMaskedOrSafe: maskVatNumber(input.countryCode, input.vatNumber),
      status: payload.valid ? "valid" : "invalid",
      checkedAt: payload.requestDate ?? checkedAt,
      liveOrFixture: "live",
      requestIdentifier: payload.requestIdentifier,
      evidenceRef: payload.requestIdentifier
        ? `vies:${payload.requestIdentifier}`
        : `vies:${checkedAt}`,
    });
  } catch (error) {
    return viesCheckResultSchema.parse({
      countryCode: input.countryCode,
      vatNumberMaskedOrSafe: maskVatNumber(input.countryCode, input.vatNumber),
      status: "unavailable",
      checkedAt,
      liveOrFixture: "unavailable",
      errorCode: classifyViesError(error),
      evidenceRef: `vies:unavailable:${checkedAt}`,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
