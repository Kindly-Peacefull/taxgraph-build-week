import { describe, expect, it } from "vitest";
import { germanyInput } from "@/lib/fixtures";
import { mergeModelPayload } from "@/lib/model-normalization";

describe("structured form normalization priority", () => {
  it("preserves model decomposition but overrides deterministic component fields", () => {
    const transaction = mergeModelPayload(
      { ...germanyInput, demoScenarioId: null },
      {
        summary: "Model summary",
        serviceComponents: [
          {
            id: "custom-model-component",
            category: "custom-integration",
            description: "Model-derived Zendesk integration",
            deliveryMode: "mixed",
            automationLevel: "low",
            humanInvolvement: "minimal",
            recurring: false,
            separatelyPriced: true,
            commercialImportance: "primary",
            ipRightsTransferred: false,
            physicalPresenceRequired: true,
            evidenceRefs: ["freeTextDescription:integration"],
            confidence: 0.9,
            alternatives: [],
          },
        ],
        extractedFreeTextFacts: [],
        extractedContractFacts: [],
        inferredFacts: [],
        missingFacts: [],
        contradictions: [],
        missingFactQuestions: [],
      },
      "test-model",
      1,
    );
    const component = transaction.serviceComponents[0];

    expect(component).toMatchObject({
      id: "custom-model-component",
      category: "custom-integration",
      description: "Model-derived Zendesk integration",
      deliveryMode: "mixed",
      automationLevel: "medium",
      humanInvolvement: "substantial",
      recurring: true,
      ipRightsTransferred: true,
      physicalPresenceRequired: true,
    });
    expect(
      transaction.knownFacts.find(
        (fact) => fact.path === "serviceComponents.automationLevel",
      )?.provenance.sourceType,
    ).toBe("form");
  });
});
