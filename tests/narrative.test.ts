import { describe, expect, it } from "vitest";
import { evaluateTransaction } from "@/lib/engine";
import {
  createFranceTransaction,
  createFranceViesResult,
  franceInput,
} from "@/lib/fixtures";
import { buildNarrativeInput, validateNarrativePayload } from "@/lib/narrative";

const enoughWords = Array.from(
  { length: 150 },
  (_, index) => `word${index + 1}`,
).join(" ");

describe("narrative citation gate", () => {
  it("rejects an unknown source ID", () => {
    expect(() =>
      validateNarrativePayload({
        sentences: [{ text: enoughWords, sourceIds: ["S999"] }],
      }),
    ).toThrow(/unknown source/i);
  });

  it("rejects a sentence without a source ID", () => {
    expect(() =>
      validateNarrativePayload({
        sentences: [{ text: enoughWords, sourceIds: [] }],
      }),
    ).toThrow();
  });

  it("builds only the four canonical Task D input groups", () => {
    const analysis = evaluateTransaction(
      franceInput,
      createFranceTransaction(),
      createFranceViesResult(),
    );
    const input = buildNarrativeInput(analysis);

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
