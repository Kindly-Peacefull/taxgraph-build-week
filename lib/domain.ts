import { z } from "zod";

export const ruleIdSchema = z.enum([
  "R1",
  "R2",
  "R3",
  "R4",
  "R5",
  "R6",
  "R7",
  "R8",
  "R9",
  "R10",
  "R11",
  "R12",
]);

export const sourceStatusSchema = z.enum([
  "found",
  "access_failed",
  "not_found",
]);

export const humanReviewStatusSchema = z.enum([
  "pending",
  "reviewed",
  "approved",
  "rejected",
  "needs_changes",
]);

export const sourceReferenceSchema = z.object({
  id: z.string().regex(/^S\d+$/),
  title: z.string().min(1),
  issuingAuthority: z.string().min(1),
  jurisdiction: z.string().min(1),
  sourceType: z.string().min(1),
  url: z.string().url(),
  pinpoint: z.string().min(1),
  excerpt: z.string().min(1),
  translationEn: z.string(),
  retrievedAt: z.string().min(1),
  confirms: z.string().min(1),
  linkedRules: z.array(ruleIdSchema).min(1),
  illustrative: z.boolean(),
  status: sourceStatusSchema,
  humanReviewStatus: humanReviewStatusSchema,
  notes: z.string(),
});

export const sourcePackSchema = z.array(sourceReferenceSchema).min(1);

export const taxRuleSchema = z.object({
  id: ruleIdSchema,
  title: z.string().min(1),
  jurisdiction: z.string().min(1),
  topic: z.string().min(1),
  scenario: z.string().min(1),
  conditionSummary: z.string().min(1),
  outputStatus: z.string().min(1),
  sourceIds: z.array(z.string().regex(/^S\d+$/)).min(1),
  humanReviewStatus: humanReviewStatusSchema,
  notes: z.string().optional(),
});

export const rulePackSchema = z.array(taxRuleSchema).length(12);

export const factProvenanceSchema = z.object({
  sourceType: z.enum([
    "form",
    "free-text",
    "contract",
    "model-inference",
    "user-answered",
    "demo-fixture",
  ]),
  sourcePointer: z.string().min(1),
  capturedAt: z.string().datetime(),
  previousValue: z.unknown().optional(),
});

export const factRecordSchema = z.object({
  path: z.string().min(1),
  value: z.unknown(),
  label: z.string().min(1),
  provenance: factProvenanceSchema,
});

export const contradictionSchema = z.object({
  id: z.string().min(1),
  factPath: z.string().min(1),
  firstValue: z.unknown(),
  secondValue: z.unknown(),
  firstProvenance: factProvenanceSchema,
  secondProvenance: factProvenanceSchema,
  explanation: z.string().min(1),
});

export const missingFactQuestionSchema = z.object({
  id: z.string().min(1),
  factPath: z.string().min(1),
  prompt: z.string().min(1),
  answerType: z.enum(["boolean", "single_select", "short_text"]),
  options: z.array(z.string()).optional(),
  affectedRuleIds: z.array(ruleIdSchema).min(1),
  reason: z.string().min(1),
});

export const serviceComponentSchema = z.object({
  id: z.string().min(1),
  category: z.enum([
    "saas-access",
    "configuration",
    "custom-integration",
    "hosting",
    "human-support",
    "training",
    "software-licence",
  ]),
  description: z.string().min(1),
  deliveryMode: z.enum(["online", "remote-human", "onsite", "mixed"]),
  automationLevel: z.enum(["high", "medium", "low", "unknown"]),
  humanInvolvement: z.enum(["minimal", "limited", "substantial", "unknown"]),
  recurring: z.boolean(),
  separatelyPriced: z.boolean().nullable(),
  commercialImportance: z.enum(["primary", "supporting", "unknown"]),
  ipRightsTransferred: z.boolean().nullable(),
  physicalPresenceRequired: z.boolean().nullable(),
  evidenceRefs: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  alternatives: z.array(z.string()),
});

export const viesCheckResultSchema = z.object({
  countryCode: z.string().length(2),
  vatNumberMaskedOrSafe: z.string(),
  status: z.enum(["valid", "invalid", "unavailable", "not_checked", "fixture"]),
  checkedAt: z.string().datetime(),
  liveOrFixture: z.enum(["live", "fixture", "unavailable"]),
  requestIdentifier: z.string().optional(),
  errorCode: z.string().optional(),
  evidenceRef: z.string().min(1),
});

export const scenarioInputSchema = z.object({
  structuredForm: z.object({
    sellerCountry: z.literal("RS"),
    customerCountry: z.string().length(2),
    customerType: z.enum(["consumer", "business", "unknown"]),
    deliveryChannel: z.enum([
      "online-subscription",
      "negotiated-contract",
      "other",
    ]),
    automationLevel: z.enum(["high", "medium", "low", "unknown"]),
    humanInvolvement: z.enum(["minimal", "limited", "substantial", "unknown"]),
    recurring: z.boolean(),
    customerVatId: z.string(),
    ipRightsTransferred: z.boolean().nullable(),
  }),
  freeTextDescription: z.string(),
  contractExcerpt: z.string(),
  demoScenarioId: z.enum(["france-b2c", "germany-b2b"]).nullable(),
});

export const normalizedTransactionSchema = z.object({
  id: z.string().min(1),
  seller: z.object({
    country: z.literal("RS"),
    legalForm: z.string().min(1),
    euFixedEstablishment: z.boolean().nullable(),
    germanEstablishment: z.boolean().nullable(),
  }),
  customer: z.object({
    country: z.string().length(2),
    type: z.enum(["consumer", "business", "unknown"]),
    taxablePersonActingAsSuch: z.boolean().nullable(),
    businessLocation: z.string().nullable(),
    fixedEstablishmentCountry: z.string().nullable(),
    fixedEstablishmentCleared: z.boolean(),
    vatId: z.string(),
    locationEvidence: z.array(
      z.object({
        type: z.enum([
          "billing_address",
          "ip_address",
          "bank_location",
          "sim_country",
          "landline",
          "other",
        ]),
        country: z.string().length(2),
        reference: z.string().min(1),
      }),
    ),
  }),
  jurisdictions: z.array(z.string().min(1)),
  commercialArrangement: z.object({
    deliveryChannel: z.enum([
      "online-subscription",
      "negotiated-contract",
      "other",
    ]),
    recurring: z.boolean(),
    standardPackage: z.boolean(),
  }),
  serviceComponents: z.array(serviceComponentSchema).min(1),
  paymentFlow: z.object({
    payer: z.string().min(1),
    invoiceRecipient: z.string().min(1),
    recurring: z.boolean(),
  }),
  contractFlow: z.object({
    directContract: z.boolean(),
    intermediary: z.boolean(),
    contractExcerptProvided: z.boolean(),
  }),
  knownFacts: z.array(factRecordSchema),
  inferredFacts: z.array(factRecordSchema),
  missingFacts: z.array(z.string()),
  contradictions: z.array(contradictionSchema),
  missingFactQuestions: z.array(missingFactQuestionSchema),
  provenance: z.record(z.string(), z.array(factProvenanceSchema)),
  normalizationMetadata: z.object({
    mode: z.enum(["fixture", "live", "deterministic-fallback"]),
    model: z.string().nullable(),
    attempts: z.number().int().nonnegative(),
    normalizedAt: z.string().datetime(),
  }),
});

export const claimSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  sourceIds: z.array(z.string()),
  evidenceRefs: z.array(z.string()).optional(),
  unsourced: z.boolean().optional(),
});

export const touchpointStatusSchema = z.enum([
  "Likely applicable",
  "Likely not applicable",
  "Requires verification",
  "Insufficient information",
  "Professional review required",
  "Illustrative only",
  "Pending human review",
  "Not covered by the current MVP rule pack",
]);

export const ruleEvaluationSchema = z.object({
  ruleId: ruleIdSchema,
  evaluatedConditions: z.array(z.string()),
  matchedConditions: z.array(z.string()),
  unresolvedConditions: z.array(z.string()),
  triggered: z.boolean(),
  sourceIds: z.array(z.string()),
  outputStatus: touchpointStatusSchema,
  enabled: z.boolean(),
  disabledReason: z.string().optional(),
});

export const taxTouchpointSchema = z.object({
  id: z.string().min(1),
  topic: z.string().min(1),
  jurisdiction: z.string().min(1),
  status: touchpointStatusSchema,
  claims: z.array(claimSchema),
  triggeredRuleIds: z.array(ruleIdSchema),
  sourceIds: z.array(z.string()),
  missingFacts: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  professionalReviewRequired: z.boolean(),
  reviewState: z.enum([
    "Pending human review",
    "Reviewed",
    "Source unavailable",
    "No legal claim",
  ]),
});

export const analysisResultSchema = z.object({
  input: scenarioInputSchema,
  normalizedTransaction: normalizedTransactionSchema,
  serviceClassifications: z.array(
    z.object({
      componentId: z.string(),
      result: z.enum(["Likely ESS", "Likely not ESS", "Requires verification"]),
      supportingFacts: z.array(z.string()),
      conflictingFacts: z.array(z.string()),
      professionalReviewRequired: z.boolean(),
    }),
  ),
  diagramData: z.object({
    seller: z.string(),
    components: z.array(z.string()),
    customer: z.string(),
    jurisdictions: z.array(z.string()),
  }),
  taxTouchpoints: z.array(taxTouchpointSchema),
  checklist: z.record(z.string(), z.array(z.string())),
  analysisTrace: z.object({
    ruleEvaluations: z.array(ruleEvaluationSchema),
    citationGatePassed: z.boolean(),
    rerunWithoutGpt: z.boolean(),
  }),
  sourceReferences: z.array(sourceReferenceSchema),
  viesCheck: viesCheckResultSchema,
  modelMetadata: z.object({
    model: z.string().nullable(),
    mode: z.enum(["fixture", "live", "deterministic-fallback"]),
  }),
  generatedAt: z.string().datetime(),
  fixtureOrLive: z.enum(["fixture", "live", "deterministic-fallback"]),
});

export const scenarioDiffSchema = z.object({
  changedInputs: z.array(
    z.object({
      path: z.string(),
      oldValue: z.unknown(),
      newValue: z.unknown(),
      affectedRuleIds: z.array(ruleIdSchema),
    }),
  ),
  affectedRules: z.array(ruleIdSchema),
  changedTouchpoints: z.array(
    z.object({
      id: z.string(),
      topic: z.string(),
      oldStatus: touchpointStatusSchema,
      newStatus: touchpointStatusSchema,
      affectedRuleIds: z.array(ruleIdSchema),
    }),
  ),
  unchangedTouchpoints: z.array(z.string()),
  claims: z.array(claimSchema),
  generatedAt: z.string().datetime(),
});

export type RuleId = z.infer<typeof ruleIdSchema>;
export type SourceReference = z.infer<typeof sourceReferenceSchema>;
export type TaxRule = z.infer<typeof taxRuleSchema>;
export type FactProvenance = z.infer<typeof factProvenanceSchema>;
export type FactRecord = z.infer<typeof factRecordSchema>;
export type MissingFactQuestion = z.infer<typeof missingFactQuestionSchema>;
export type ServiceComponent = z.infer<typeof serviceComponentSchema>;
export type ViesCheckResult = z.infer<typeof viesCheckResultSchema>;
export type ScenarioInput = z.infer<typeof scenarioInputSchema>;
export type NormalizedTransaction = z.infer<typeof normalizedTransactionSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type TouchpointStatus = z.infer<typeof touchpointStatusSchema>;
export type RuleEvaluation = z.infer<typeof ruleEvaluationSchema>;
export type TaxTouchpoint = z.infer<typeof taxTouchpointSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type ScenarioDiff = z.infer<typeof scenarioDiffSchema>;
