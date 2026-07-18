import { z } from "zod";
import {
  missingFactQuestionSchema,
  normalizedTransactionSchema,
  serviceComponentSchema,
  type FactProvenance,
  type NormalizedTransaction,
  type ScenarioInput,
} from "@/lib/domain";

export const modelNormalizationPayloadSchema = z.object({
  summary: z.string(),
  serviceComponents: z.array(serviceComponentSchema).min(1),
  extractedContractFacts: z.array(
    z.object({
      path: z.string(),
      value: z.string(),
      sourcePointer: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
  inferredFacts: z.array(
    z.object({
      path: z.string(),
      value: z.string(),
      reason: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
  missingFacts: z.array(z.string()),
  contradictions: z.array(
    z.object({
      factPath: z.string(),
      formValue: z.string(),
      contractValue: z.string(),
      sourcePointer: z.string(),
      explanation: z.string(),
    }),
  ),
  missingFactQuestions: z.array(missingFactQuestionSchema),
});

export type ModelNormalizationPayload = z.infer<
  typeof modelNormalizationPayloadSchema
>;

function now() {
  return new Date().toISOString();
}

function provenance(
  sourceType: FactProvenance["sourceType"],
  sourcePointer: string,
): FactProvenance {
  return { sourceType, sourcePointer, capturedAt: now() };
}

function formValueForPath(input: ScenarioInput, path: string) {
  if (path === "customer.country") return input.structuredForm.customerCountry;
  if (path === "customer.type") return input.structuredForm.customerType;
  if (path === "customer.vatId") return input.structuredForm.customerVatId;
  if (path === "commercialArrangement.recurring") {
    return String(input.structuredForm.recurring);
  }
  if (path === "serviceComponents.ipRightsTransferred") {
    return String(input.structuredForm.ipRightsTransferred);
  }
  return undefined;
}

export function mergeModelPayload(
  input: ScenarioInput,
  rawPayload: unknown,
  model: string,
  attempts: number,
): NormalizedTransaction {
  const payload = modelNormalizationPayloadSchema.parse(rawPayload);
  const formCapturedAt = now();
  const formFacts = [
    [
      "seller.country",
      input.structuredForm.sellerCountry,
      "Seller jurisdiction",
    ],
    [
      "customer.country",
      input.structuredForm.customerCountry,
      "Customer jurisdiction",
    ],
    ["customer.type", input.structuredForm.customerType, "Customer status"],
    [
      "commercialArrangement.deliveryChannel",
      input.structuredForm.deliveryChannel,
      "Delivery channel",
    ],
    [
      "commercialArrangement.recurring",
      input.structuredForm.recurring,
      "Recurring payment",
    ],
  ] as const;

  if (!input.structuredForm.customerCountry) {
    throw new Error("Customer country is required for a safe analysis.");
  }

  const contractFacts = payload.extractedContractFacts.map((fact) => ({
    path: fact.path,
    value: fact.value,
    label: `Contract fact: ${fact.path}`,
    provenance: provenance("contract", fact.sourcePointer),
  }));
  const inferredFacts = payload.inferredFacts.map((fact) => ({
    path: fact.path,
    value: fact.value,
    label: `Model inference: ${fact.path}`,
    provenance: provenance("model-inference", fact.reason),
  }));

  const contradictions = [
    ...payload.contradictions.map((item, index) => ({
      id: `model-contradiction-${index + 1}`,
      factPath: item.factPath,
      firstValue: item.formValue,
      secondValue: item.contractValue,
      firstProvenance: {
        sourceType: "form" as const,
        sourcePointer: `structuredForm.${item.factPath}`,
        capturedAt: formCapturedAt,
      },
      secondProvenance: provenance("contract", item.sourcePointer),
      explanation: item.explanation,
    })),
    ...payload.extractedContractFacts.flatMap((fact, index) => {
      const value = formValueForPath(input, fact.path);
      if (value === undefined || String(value) === fact.value) return [];
      return [
        {
          id: `detected-contradiction-${index + 1}`,
          factPath: fact.path,
          firstValue: value,
          secondValue: fact.value,
          firstProvenance: {
            sourceType: "form" as const,
            sourcePointer: `structuredForm.${fact.path}`,
            capturedAt: formCapturedAt,
          },
          secondProvenance: provenance("contract", fact.sourcePointer),
          explanation:
            "The contract-derived fact conflicts with the structured form and is preserved for user resolution.",
        },
      ];
    }),
  ];

  const type = input.structuredForm.customerType;
  const country = input.structuredForm.customerCountry;
  const vatId = input.structuredForm.customerVatId;

  return normalizedTransactionSchema.parse({
    id: `live-${Date.now()}`,
    seller: {
      country: "RS",
      legalForm: "Serbian company",
      euFixedEstablishment: null,
      germanEstablishment: null,
    },
    customer: {
      country,
      type,
      taxablePersonActingAsSuch:
        type === "business" ? true : type === "consumer" ? false : null,
      businessLocation: type === "business" ? country : null,
      fixedEstablishmentCountry: null,
      fixedEstablishmentCleared: false,
      vatId,
      locationEvidence: [],
    },
    jurisdictions: Array.from(new Set(["RS", "EU", country])),
    commercialArrangement: {
      deliveryChannel: input.structuredForm.deliveryChannel,
      recurring: input.structuredForm.recurring,
      standardPackage:
        input.structuredForm.deliveryChannel === "online-subscription",
    },
    serviceComponents: payload.serviceComponents,
    paymentFlow: {
      payer:
        type === "business" ? `${country} business` : `${country} consumer`,
      invoiceRecipient:
        type === "business" ? `${country} business` : `${country} consumer`,
      recurring: input.structuredForm.recurring,
    },
    contractFlow: {
      directContract: true,
      intermediary: false,
      contractExcerptProvided: input.contractExcerpt.trim().length > 0,
    },
    knownFacts: [
      ...formFacts.map(([path, value, label]) => ({
        path,
        value,
        label,
        provenance: {
          sourceType: "form" as const,
          sourcePointer: `structuredForm.${path}`,
          capturedAt: formCapturedAt,
        },
      })),
      ...contractFacts,
    ],
    inferredFacts,
    missingFacts: payload.missingFacts,
    contradictions,
    missingFactQuestions: payload.missingFactQuestions,
    provenance: Object.fromEntries([
      ...formFacts.map(([path]) => [
        path,
        [
          {
            sourceType: "form" as const,
            sourcePointer: `structuredForm.${path}`,
            capturedAt: formCapturedAt,
          },
        ],
      ]),
      ...contractFacts.map((fact) => [fact.path, [fact.provenance]]),
    ]),
    normalizationMetadata: {
      mode: "live",
      model,
      attempts,
      normalizedAt: now(),
    },
  });
}

export const normalizationSystemPrompt = `You normalize a single pre-sale transaction for TaxGraph.
Return only schema-constrained facts and service components supported by the input.
The structured form is authoritative: preserve its values and report contract conflicts instead of resolving them.
Extract contract facts with a character range or short exact fragment as sourcePointer.
Create only typed missing-fact questions that could affect R1-R12 or the checklist.
Do not state tax law, rates, obligations, treaty conclusions, or create rule/source IDs.
Do not decide single or composite supply treatment.
Use empty arrays when the input does not support a field.`;
