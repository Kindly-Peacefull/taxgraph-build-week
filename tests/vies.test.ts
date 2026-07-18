import { describe, expect, it } from "vitest";
import { maskVatNumber, validateVatInput } from "@/lib/vies";

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
});
