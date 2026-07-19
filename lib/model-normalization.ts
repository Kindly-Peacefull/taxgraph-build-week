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
  extractedFreeTextFacts: z.array(
    z.object({
      path: z.string(),
      value: z.string(),
      sourcePointer: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
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
  missingFactQuestions: z.array(
    missingFactQuestionSchema.extend({
      options: z.array(z.string()),
    }),
  ),
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

function uniqueExtractedFacts<T extends { path: string; value: string }>(
  facts: T[],
) {
  const seen = new Set<string>();
  return facts.filter((fact) => {
    const key = `${fact.path}\u0000${fact.value.trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function comparableFactValue(path: string, value: unknown) {
  const text = String(value).trim();
  if (path === "customer.vatId") {
    return text.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  }
  if (path === "customer.country") {
    const countryAliases: Record<string, string> = {
      france: "FR",
      germany: "DE",
      serbia: "RS",
    };
    return countryAliases[text.toLowerCase()] ?? text.toUpperCase();
  }
  if (path === "customer.type") {
    const customerTypeAliases: Record<string, string> = {
      "private consumer": "consumer",
      "business customer": "business",
    };
    return customerTypeAliases[text.toLowerCase()] ?? text.toLowerCase();
  }
  return text.toLowerCase();
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

  const freeTextFacts = uniqueExtractedFacts(
    input.freeTextDescription.trim().length > 0
      ? payload.extractedFreeTextFacts
      : [],
  ).map((fact) => ({
    path: fact.path,
    value: fact.value,
    label: `Description fact: ${fact.path}`,
    provenance: provenance("free-text", fact.sourcePointer),
  }));
  const contractFactPayload = uniqueExtractedFacts(
    input.contractExcerpt.trim().length > 0
      ? payload.extractedContractFacts
      : [],
  );
  const contractFacts = contractFactPayload.map((fact) => ({
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

  const contradictionCandidates = [
    ...(input.contractExcerpt.trim().length > 0
      ? payload.contradictions.map((item) => ({
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
        }))
      : []),
    ...contractFactPayload.flatMap((fact) => {
      const value = formValueForPath(input, fact.path);
      if (
        value === undefined ||
        comparableFactValue(fact.path, value) ===
          comparableFactValue(fact.path, fact.value)
      ) {
        return [];
      }
      return [
        {
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
  const seenContradictions = new Set<string>();
  const contradictions = contradictionCandidates
    .filter((item) => {
      const firstValue = comparableFactValue(item.factPath, item.firstValue);
      const secondValue = comparableFactValue(item.factPath, item.secondValue);
      if (firstValue === secondValue) return false;
      const key = [item.factPath, firstValue, secondValue].join("\u0000");
      if (seenContradictions.has(key)) return false;
      seenContradictions.add(key);
      return true;
    })
    .map((item, index) => ({
      ...item,
      id: `contract-form-contradiction-${index + 1}`,
    }));

  const type = input.structuredForm.customerType;
  const country = input.structuredForm.customerCountry;
  const vatId = input.structuredForm.customerVatId;
  const knownFacts = [
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
    ...freeTextFacts,
    ...contractFacts,
  ];
  const provenanceByPath = new Map<string, FactProvenance[]>();
  for (const fact of knownFacts) {
    provenanceByPath.set(fact.path, [
      ...(provenanceByPath.get(fact.path) ?? []),
      fact.provenance,
    ]);
  }

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
    knownFacts,
    inferredFacts,
    missingFacts: payload.missingFacts,
    contradictions,
    missingFactQuestions: payload.missingFactQuestions,
    provenance: Object.fromEntries(provenanceByPath),
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
Put facts supported by freeTextDescription only in extractedFreeTextFacts, with a character range or short exact fragment from freeTextDescription as sourcePointer.
Put facts supported by contractExcerpt only in extractedContractFacts, with a character range or short exact fragment from contractExcerpt as sourcePointer.
Never copy a structured-form value into either extracted array unless the same fact is explicitly stated in that corresponding text. When contractExcerpt is empty, extractedContractFacts and contradictions must be empty.
Create only typed missing-fact questions that could affect R1-R12 or the checklist.
Question focus: for a French consumer, identify whether two independent and non-conflicting customer-location evidence items are known; for a German business, identify missing customer VAT/VIES, taxable-person, business-location and fixed-establishment facts; for software rights, identify the reproduction, modification, exclusivity and beneficial-ownership facts; for mixed services, identify unresolved automation, human-delivery and physical-presence facts.
For every material unresolved focus, include both a concise missingFacts entry and a typed missingFactQuestions item. Do not ask for facts that the input already supplies.
Do not state tax law, rates, obligations, treaty conclusions, or create rule/source IDs.
Do not decide single or composite supply treatment.
Use empty arrays when the input does not support a field.`;
