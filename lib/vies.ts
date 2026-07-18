import { z } from "zod";
import { viesCheckResultSchema, type ViesCheckResult } from "@/lib/domain";

const viesResponseSchema = z.object({
  countryCode: z.string().optional(),
  vatNumber: z.string().optional(),
  requestDate: z.string().optional(),
  valid: z.boolean(),
  requestIdentifier: z.string().optional(),
});

export function maskVatNumber(countryCode: string, vatNumber: string) {
  const clean = vatNumber.replace(/\s+/g, "").toUpperCase();
  const local = clean.startsWith(countryCode) ? clean.slice(2) : clean;
  if (local.length <= 4) return `${countryCode}${"•".repeat(local.length)}`;
  return `${countryCode}${local.slice(0, 2)}${"•".repeat(local.length - 4)}${local.slice(-2)}`;
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

export async function checkViesLive(
  countryCode: string,
  vatNumber: string,
): Promise<ViesCheckResult> {
  const checkedAt = new Date().toISOString();
  const safeVat = maskVatNumber(countryCode, vatNumber);
  const enabled = process.env.VIES_LIVE_ENABLED === "true";
  const endpoint = process.env.VIES_ENDPOINT_URL?.trim();

  if (!enabled || !endpoint) {
    return viesCheckResultSchema.parse({
      countryCode,
      vatNumberMaskedOrSafe: safeVat,
      status: "unavailable",
      checkedAt,
      liveOrFixture: "unavailable",
      errorCode: !enabled ? "LIVE_DISABLED" : "ENDPOINT_NOT_CONFIGURED",
      evidenceRef: "vies:unavailable",
    });
  }

  const input = validateVatInput(countryCode, vatNumber);
  const timeout = Number.parseInt(process.env.VIES_TIMEOUT_MS ?? "5000", 10);
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
      errorCode: error instanceof Error ? error.message : "VIES_UNKNOWN_ERROR",
      evidenceRef: `vies:unavailable:${checkedAt}`,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
