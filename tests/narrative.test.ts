import { describe, expect, it } from "vitest";
import { evaluateTransaction } from "@/lib/engine";
import {
  createFranceTransaction,
  createFranceViesResult,
  franceInput,
} from "@/lib/fixtures";
import {
  buildNarrativeInput,
  narrativeInputSourceIds,
  rebuildTrustedAnalysis,
  validateNarrativePayload,
} from "@/lib/narrative";

const enoughWords = Array.from(
  { length: 150 },
  (_, index) => `word${index + 1}`,
).join(" ");

describe("narrative citation gate", () => {
  it("rejects an unknown source ID", () => {
    expect(() =>
      validateNarrativePayload(
        {
          sentences: [{ text: enoughWords, sourceIds: ["S999"] }],
        },
        new Set(["S1"]),
      ),
    ).toThrow(/unknown source/i);
  });

  it("rejects a sentence without a source ID", () => {
    expect(() =>
      validateNarrativePayload(
        {
          sentences: [{ text: enoughWords, sourceIds: [] }],
        },
        new Set(["S1"]),
      ),
    ).toThrow();
  });

  it("rejects a canonical source that is irrelevant to the current analysis", () => {
    expect(() =>
      validateNarrativePayload(
        { sentences: [{ text: enoughWords, sourceIds: ["S14"] }] },
        new Set(["S1"]),
      ),
    ).toThrow(/not present in the current analysis/i);
  });

  it("rejects a forged claim even when it names a canonical source", () => {
    const analysis = evaluateTransaction(
      franceInput,
      createFranceTransaction(),
      createFranceViesResult(),
    );
    const forged = structuredClone(analysis);
    const claim = forged.taxTouchpoints
      .flatMap((touchpoint) => touchpoint.claims)
      .find((item) => item.sourceIds.length > 0);
    expect(claim).toBeDefined();
    claim!.sourceIds = ["S14"];

    expect(() => rebuildTrustedAnalysis(forged)).toThrow(
      /do not match the deterministic server analysis/i,
    );
  });

  it("builds only the four canonical Task D input groups", () => {
    const analysis = evaluateTransaction(
      franceInput,
      createFranceTransaction(),
      createFranceViesResult(),
    );
    const input = buildNarrativeInput(analysis);
    expect(narrativeInputSourceIds(input).size).toBeGreaterThan(0);

    expect(Object.keys(input).sort()).toEqual([
      "missingFacts",
      "normalizedFacts",
      "sourceBackedClaims",
      "triggeredRules",
    ]);
    expect(JSON.stringify(input)).not.toContain(
      franceInput.freeTextDescription,
    );
  });
});
