import {
  normalizedTransactionSchema,
  scenarioInputSchema,
  viesCheckResultSchema,
  type FactProvenance,
  type NormalizedTransaction,
  type ScenarioInput,
  type ServiceComponent,
  type ViesCheckResult,
} from "@/lib/domain";
import { createMissingFactQuestion } from "@/lib/missing-facts";

const fixtureTime = "2026-07-19T00:00:00.000Z";

function fixtureProvenance(pointer: string): FactProvenance {
  return {
    sourceType: "demo-fixture",
    sourcePointer: pointer,
    capturedAt: fixtureTime,
  };
}

function component(
  value: Omit<
    ServiceComponent,
    "evidenceRefs" | "confidence" | "alternatives"
  > & {
    confidence?: number;
    alternatives?: string[];
  },
): ServiceComponent {
  return {
    ...value,
    evidenceRefs: [`demo-fixture:serviceComponents.${value.id}`],
    confidence: value.confidence ?? 0.95,
    alternatives: value.alternatives ?? [],
  };
}

const sharedComponents: ServiceComponent[] = [
  component({
    id: "saas",
    category: "saas-access",
    description: "Access to the managed AI customer-support application",
    deliveryMode: "online",
    automationLevel: "high",
    humanInvolvement: "minimal",
    recurring: true,
    separatelyPriced: false,
    commercialImportance: "primary",
    ipRightsTransferred: false,
    physicalPresenceRequired: false,
  }),
  component({
    id: "configuration",
    category: "configuration",
    description: "Initial chatbot configuration and knowledge-base setup",
    deliveryMode: "mixed",
    automationLevel: "medium",
    humanInvolvement: "limited",
    recurring: false,
    separatelyPriced: false,
    commercialImportance: "supporting",
    ipRightsTransferred: false,
    physicalPresenceRequired: false,
    confidence: 0.88,
    alternatives: ["implementation service"],
  }),
  component({
    id: "hosting",
    category: "hosting",
    description: "Cloud hosting required to operate the assistant",
    deliveryMode: "online",
    automationLevel: "high",
    humanInvolvement: "minimal",
    recurring: true,
    separatelyPriced: false,
    commercialImportance: "supporting",
    ipRightsTransferred: false,
    physicalPresenceRequired: false,
  }),
  component({
    id: "support",
    category: "human-support",
    description: "Ongoing technical support delivered by a human team",
    deliveryMode: "remote-human",
    automationLevel: "low",
    humanInvolvement: "substantial",
    recurring: true,
    separatelyPriced: false,
    commercialImportance: "supporting",
    ipRightsTransferred: false,
    physicalPresenceRequired: false,
    confidence: 0.96,
  }),
  component({
    id: "training",
    category: "training",
    description: "Remote training for customer staff",
    deliveryMode: "remote-human",
    automationLevel: "low",
    humanInvolvement: "substantial",
    recurring: false,
    separatelyPriced: false,
    commercialImportance: "supporting",
    ipRightsTransferred: false,
    physicalPresenceRequired: false,
  }),
];

export const franceInput: ScenarioInput = scenarioInputSchema.parse({
  structuredForm: {
    sellerCountry: "RS",
    customerCountry: "FR",
    customerType: "consumer",
    deliveryChannel: "online-subscription",
    automationLevel: "high",
    humanInvolvement: "limited",
    recurring: true,
    customerVatId: "",
    ipRightsTransferred: false,
  },
  freeTextDescription:
    "Standard managed AI assistant subscription with limited setup, hosting, support and staff training.",
  contractExcerpt: "",
  demoScenarioId: "france-b2c",
});

export const germanyInput: ScenarioInput = scenarioInputSchema.parse({
  structuredForm: {
    sellerCountry: "RS",
    customerCountry: "DE",
    customerType: "business",
    deliveryChannel: "negotiated-contract",
    automationLevel: "medium",
    humanInvolvement: "substantial",
    recurring: true,
    customerVatId: "DE•••••••••",
    ipRightsTransferred: true,
  },
  freeTextDescription:
    "Negotiated managed AI deployment with custom systems integration, implementation work, recurring support and a limited software licence.",
  contractExcerpt: "",
  demoScenarioId: "germany-b2b",
});

export function createFranceTransaction(): NormalizedTransaction {
  const facts = [
    ["seller.country", "RS", "Seller jurisdiction"],
    ["customer.country", "FR", "Customer jurisdiction"],
    ["customer.type", "consumer", "Customer status"],
    ["commercialArrangement.recurring", true, "Recurring payment"],
  ] as const;

  return normalizedTransactionSchema.parse({
    id: "fixture-france-b2c",
    seller: {
      country: "RS",
      legalForm: "Serbian company",
      euFixedEstablishment: false,
      germanEstablishment: false,
    },
    customer: {
      country: "FR",
      type: "consumer",
      taxablePersonActingAsSuch: false,
      businessLocation: null,
      fixedEstablishmentCountry: null,
      fixedEstablishmentCleared: true,
      vatId: "",
      locationEvidence: [
        {
          type: "billing_address",
          country: "FR",
          reference: "demo-fixture:billing-country",
        },
      ],
    },
    jurisdictions: ["RS", "EU", "FR"],
    commercialArrangement: {
      deliveryChannel: "online-subscription",
      recurring: true,
      standardPackage: true,
    },
    serviceComponents: sharedComponents,
    paymentFlow: {
      payer: "French consumer",
      invoiceRecipient: "French consumer",
      recurring: true,
    },
    contractFlow: {
      directContract: true,
      intermediary: false,
      contractExcerptProvided: false,
    },
    knownFacts: facts.map(([path, value, label]) => ({
      path,
      value,
      label,
      provenance: fixtureProvenance(`france-b2c:${path}`),
    })),
    inferredFacts: [],
    missingFacts: ["A second non-conflicting customer-location evidence item"],
    contradictions: [],
    missingFactQuestions: [
      createMissingFactQuestion({
        id: "fr-location-evidence",
        factPath: "customer.locationEvidence",
        prompt: "Which second customer-location evidence item is available?",
        reason:
          "The residual Article 24b presumption may require two non-conflicting evidence items.",
      }),
    ],
    provenance: Object.fromEntries(
      facts.map(([path]) => [path, [fixtureProvenance(`france-b2c:${path}`)]]),
    ),
    normalizationMetadata: {
      mode: "fixture",
      model: null,
      attempts: 0,
      normalizedAt: fixtureTime,
    },
  });
}

export function createGermanyTransaction(): NormalizedTransaction {
  const customComponents = sharedComponents.map((item) =>
    item.id === "configuration"
      ? {
          ...item,
          id: "custom-integration",
          category: "custom-integration" as const,
          description:
            "Substantial custom integration with the customer's systems",
          automationLevel: "low" as const,
          humanInvolvement: "substantial" as const,
          commercialImportance: "primary" as const,
          confidence: 0.97,
        }
      : item,
  );
  customComponents.push(
    component({
      id: "software-licence",
      category: "software-licence",
      description: "Limited rights to use integration software",
      deliveryMode: "online",
      automationLevel: "unknown",
      humanInvolvement: "unknown",
      recurring: true,
      separatelyPriced: null,
      commercialImportance: "supporting",
      ipRightsTransferred: true,
      physicalPresenceRequired: false,
      confidence: 0.76,
      alternatives: ["service access without a rights transfer"],
    }),
  );

  const facts = [
    ["seller.country", "RS", "Seller jurisdiction"],
    ["customer.country", "DE", "Customer jurisdiction"],
    ["customer.type", "business", "Customer status"],
    ["customer.vatId", "DE•••••••••", "Customer VAT ID"],
    ["customer.fixedEstablishmentCleared", true, "Fixed-establishment check"],
  ] as const;

  return normalizedTransactionSchema.parse({
    id: "fixture-germany-b2b",
    seller: {
      country: "RS",
      legalForm: "Serbian company",
      euFixedEstablishment: false,
      germanEstablishment: false,
    },
    customer: {
      country: "DE",
      type: "business",
      taxablePersonActingAsSuch: true,
      businessLocation: "DE",
      fixedEstablishmentCountry: null,
      fixedEstablishmentCleared: true,
      vatId: "DE•••••••••",
      locationEvidence: [],
    },
    jurisdictions: ["RS", "EU", "DE"],
    commercialArrangement: {
      deliveryChannel: "negotiated-contract",
      recurring: true,
      standardPackage: false,
    },
    serviceComponents: customComponents,
    paymentFlow: {
      payer: "German business",
      invoiceRecipient: "German business",
      recurring: true,
    },
    contractFlow: {
      directContract: true,
      intermediary: false,
      contractExcerptProvided: false,
    },
    knownFacts: facts.map(([path, value, label]) => ({
      path,
      value,
      label,
      provenance: fixtureProvenance(`germany-b2b:${path}`),
    })),
    inferredFacts: [],
    missingFacts: [
      "Scope, exclusivity and modification rights for the software licence",
      "Beneficial ownership facts for any rights-related payment",
    ],
    contradictions: [],
    missingFactQuestions: [
      createMissingFactQuestion({
        id: "de-rights-scope",
        factPath: "serviceComponents.ipRightsTransferred",
        prompt:
          "Does the customer receive reproduction or modification rights?",
        reason:
          "The exact rights and payment structure affect the treaty-classification review question.",
      }),
    ],
    provenance: Object.fromEntries(
      facts.map(([path]) => [path, [fixtureProvenance(`germany-b2b:${path}`)]]),
    ),
    normalizationMetadata: {
      mode: "fixture",
      model: null,
      attempts: 0,
      normalizedAt: fixtureTime,
    },
  });
}

export function createFranceViesResult(): ViesCheckResult {
  return viesCheckResultSchema.parse({
    countryCode: "FR",
    vatNumberMaskedOrSafe: "Not provided",
    status: "not_checked",
    checkedAt: fixtureTime,
    liveOrFixture: "fixture",
    evidenceRef: "demo-fixture:france-b2c:vies-not-applicable",
  });
}

export function createGermanyViesResult(): ViesCheckResult {
  return viesCheckResultSchema.parse({
    countryCode: "DE",
    vatNumberMaskedOrSafe: "DE•••••••••",
    status: "fixture",
    checkedAt: fixtureTime,
    liveOrFixture: "fixture",
    requestIdentifier: "fixture-de-b2b-valid",
    evidenceRef: "demo-fixture:germany-b2b:vies",
  });
}
