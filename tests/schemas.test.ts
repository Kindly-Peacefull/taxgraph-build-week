import { describe, expect, it } from "vitest";
import { scenarioInputSchema } from "@/lib/domain";
import { evaluateTransaction } from "@/lib/engine";
import {
  createFranceTransaction,
  createFranceViesResult,
  franceInput,
} from "@/lib/fixtures";
import {
  mergeModelPayload,
  modelNormalizationPayloadSchema,
} from "@/lib/model-normalization";
import { answerMissingFact } from "@/lib/rerun";
import { loadRulePack, loadSourcePack } from "@/lib/source-pack";

describe("canonical schemas", () => {
  it("loads the canonical source and rule packs", () => {
    expect(loadSourcePack()).toHaveLength(14);
    expect(loadRulePack()).toHaveLength(12);
  });

  it("rejects invalid model structured output", () => {
    expect(() =>
      modelNormalizationPayloadSchema.parse({
        summary: "Invalid because required arrays and components are missing",
      }),
    ).toThrow();
  });

  it("fails safely when customer country is missing", () => {
    expect(
      scenarioInputSchema.safeParse({
        ...franceInput,
        structuredForm: {
          ...franceInput.structuredForm,
          customerCountry: "",
        },
      }).success,
    ).toBe(false);
  });

  it("preserves a contract/form contradiction", () => {
    const serviceComponent = createFranceTransaction().serviceComponents[0];
    const transaction = mergeModelPayload(
      {
        ...franceInput,
        demoScenarioId: null,
        contractExcerpt: "The buyer is a business.",
      },
      {
        summary: "Mixed service",
        serviceComponents: [serviceComponent],
        extractedContractFacts: [
          {
            path: "customer.type",
            value: "business",
            sourcePointer: "characters 13-21: business",
            confidence: 0.99,
          },
        ],
        inferredFacts: [],
        missingFacts: [],
        contradictions: [],
        missingFactQuestions: [],
      },
      "configured-model",
      1,
    );

    expect(transaction.customer.type).toBe("consumer");
    expect(transaction.contradictions).toHaveLength(1);
    expect(transaction.contradictions[0].secondProvenance.sourceType).toBe(
      "contract",
    );
  });

  it("preserves user-answered provenance", () => {
    const initial = evaluateTransaction(
      franceInput,
      createFranceTransaction(),
      createFranceViesResult(),
    );
    const { result } = answerMissingFact(
      initial,
      "fr-location-evidence",
      "ip_address",
    );

    expect(
      result.normalizedTransaction.provenance["customer.locationEvidence"].at(
        -1,
      )?.sourceType,
    ).toBe("user-answered");
    expect(result.analysisTrace.rerunWithoutGpt).toBe(true);
  });
});
