import {
  analysisResultSchema,
  type AnalysisResult,
  type Claim,
  type NormalizedTransaction,
  type RuleEvaluation,
  type RuleId,
  type ScenarioInput,
  type ServiceComponent,
  type SourceReference,
  type TaxTouchpoint,
  type TouchpointStatus,
  type ViesCheckResult,
} from "@/lib/domain";
import { validateTouchpointClaims } from "@/lib/citations";
import { loadRulePack, loadSourcePack } from "@/lib/source-pack";

type Classification = AnalysisResult["serviceClassifications"][number];

const fixedFixtureTime = "2026-07-19T00:00:00.000Z";

function classifyComponent(component: ServiceComponent): Classification {
  const supportingFacts: string[] = [];
  const conflictingFacts: string[] = [];

  if (component.deliveryMode === "online") {
    supportingFacts.push(
      "Delivered over the internet or an electronic network",
    );
  }
  if (component.automationLevel === "high") {
    supportingFacts.push("High automation");
  }
  if (component.humanInvolvement === "minimal") {
    supportingFacts.push("Minimal human intervention");
  }
  if (component.humanInvolvement === "substantial") {
    conflictingFacts.push("Substantial human involvement");
  }
  if (component.automationLevel === "low") {
    conflictingFacts.push("Low automation");
  }

  let result: Classification["result"] = "Requires verification";
  if (
    component.deliveryMode === "online" &&
    component.automationLevel === "high" &&
    component.humanInvolvement === "minimal"
  ) {
    result = "Likely ESS";
  } else if (
    component.automationLevel === "low" &&
    component.humanInvolvement === "substantial"
  ) {
    result = "Likely not ESS";
  }

  return {
    componentId: component.id,
    result,
    supportingFacts,
    conflictingFacts,
    professionalReviewRequired:
      result !== "Likely ESS" ||
      component.commercialImportance === "supporting",
  };
}

function getReviewState(sourceIds: string[], sources: SourceReference[]) {
  if (sourceIds.length === 0) return "No legal claim" as const;
  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  const linked = sourceIds.map((id) => sourceMap.get(id));
  if (linked.some((source) => !source || source.status !== "found")) {
    return "Source unavailable" as const;
  }
  if (
    linked.some(
      (source) =>
        source?.humanReviewStatus !== "reviewed" &&
        source?.humanReviewStatus !== "approved",
    )
  ) {
    return "Pending human review" as const;
  }
  return "Reviewed" as const;
}

function reviewAwareStatus(
  desired: TouchpointStatus,
  sourceIds: string[],
  sources: SourceReference[],
): TouchpointStatus {
  const reviewState = getReviewState(sourceIds, sources);
  if (reviewState === "Source unavailable") return "Insufficient information";
  if (
    reviewState === "Pending human review" &&
    (desired === "Likely applicable" || desired === "Likely not applicable")
  ) {
    return "Pending human review";
  }
  return desired;
}

function claim(
  id: string,
  text: string,
  sourceIds: string[],
  evidenceRefs?: string[],
): Claim {
  return { id, text, sourceIds, evidenceRefs };
}

function serviceClaim(id: string, text: string, evidenceRefs: string[]): Claim {
  return { id, text, sourceIds: [], evidenceRefs, unsourced: true };
}

function userAnsweredBoolean(
  transaction: NormalizedTransaction,
  path: string,
): boolean | undefined {
  const fact = transaction.knownFacts.findLast(
    (item) =>
      item.path === path && item.provenance.sourceType === "user-answered",
  );
  return typeof fact?.value === "boolean" ? fact.value : undefined;
}

function evaluation(
  ruleId: RuleId,
  conditions: string[],
  matched: string[],
  unresolved: string[],
  triggered: boolean,
  desiredStatus: TouchpointStatus,
  sources: SourceReference[],
): RuleEvaluation {
  const rule = loadRulePack(sources).find((item) => item.id === ruleId);
  if (!rule) throw new Error(`Missing rule ${ruleId}.`);
  const unavailable = rule.sourceIds.filter((sourceId) => {
    const source = sources.find((item) => item.id === sourceId);
    return !source || source.status !== "found";
  });
  const enabled = unavailable.length === 0;

  return {
    ruleId,
    evaluatedConditions: conditions,
    matchedConditions: matched,
    unresolvedConditions: unresolved,
    triggered: enabled && triggered,
    sourceIds: rule.sourceIds,
    outputStatus: enabled
      ? reviewAwareStatus(desiredStatus, rule.sourceIds, sources)
      : "Insufficient information",
    enabled,
    disabledReason: enabled
      ? undefined
      : `Mandatory source unavailable: ${unavailable.join(", ")}`,
  };
}

function makeTouchpoint(
  input: Omit<TaxTouchpoint, "reviewState" | "status"> & {
    desiredStatus: TouchpointStatus;
  },
  sources: SourceReference[],
): TaxTouchpoint {
  return {
    ...input,
    status: reviewAwareStatus(input.desiredStatus, input.sourceIds, sources),
    reviewState: getReviewState(input.sourceIds, sources),
  };
}

export function evaluateTransaction(
  input: ScenarioInput,
  transaction: NormalizedTransaction,
  viesCheck: ViesCheckResult,
  options: {
    rerunWithoutGpt?: boolean;
    generatedAt?: string;
    sources?: SourceReference[];
  } = {},
): AnalysisResult {
  const sources = options.sources ?? loadSourcePack();
  const classifications = transaction.serviceComponents.map(classifyComponent);
  const likelyEss = classifications.filter(
    (item) => item.result === "Likely ESS",
  );
  const likelyHuman = classifications.filter(
    (item) => item.result === "Likely not ESS",
  );
  const unresolvedClassifications = classifications.filter(
    (item) => item.result === "Requires verification",
  );
  const isFranceConsumer =
    transaction.customer.country === "FR" &&
    transaction.customer.type === "consumer";
  const isGermanBusiness =
    transaction.customer.country === "DE" &&
    transaction.customer.type === "business";
  const locationCountries = new Set(
    transaction.customer.locationEvidence.map((item) => item.country),
  );
  const locationEvidenceSufficient =
    transaction.customer.locationEvidence.length >= 2 &&
    locationCountries.size === 1;
  const userConfirmedVatVerification =
    userAnsweredBoolean(transaction, "customer.vatIdVerified") === true;
  const viesSupportsBusiness =
    viesCheck.status === "valid" ||
    viesCheck.status === "fixture" ||
    userConfirmedVatVerification;
  const rightsTransferred = transaction.serviceComponents.some(
    (item) => item.ipRightsTransferred === true,
  );

  const r1Triggered = isFranceConsumer && likelyEss.length > 0;
  const r6Unresolved =
    isGermanBusiness &&
    (transaction.customer.taxablePersonActingAsSuch === null ||
      transaction.customer.businessLocation !== "DE" ||
      !transaction.customer.fixedEstablishmentCleared);
  const r6Triggered =
    isGermanBusiness &&
    transaction.customer.taxablePersonActingAsSuch === true &&
    transaction.customer.businessLocation === "DE" &&
    transaction.customer.fixedEstablishmentCleared;
  const r7Triggered =
    r6Triggered &&
    transaction.seller.germanEstablishment === false &&
    viesSupportsBusiness;

  const evaluations: RuleEvaluation[] = [
    evaluation(
      "R1",
      ["Consumer customer", "Customer located in France", "ESS component"],
      [
        ...(transaction.customer.type === "consumer"
          ? ["Consumer customer"]
          : []),
        ...(transaction.customer.country === "FR"
          ? ["Customer located in France"]
          : []),
        ...(likelyEss.length > 0 ? ["ESS component"] : []),
      ],
      isFranceConsumer && likelyEss.length === 0 ? ["ESS classification"] : [],
      r1Triggered,
      isFranceConsumer &&
        unresolvedClassifications.length > 0 &&
        likelyEss.length === 0
        ? "Requires verification"
        : "Likely applicable",
      sources,
    ),
    evaluation(
      "R2",
      ["Automation", "Human intervention", "IT dependence"],
      classifications.flatMap((item) => item.supportingFacts),
      unresolvedClassifications.map(
        (item) => `Classification unresolved for ${item.componentId}`,
      ),
      classifications.length > 0,
      unresolvedClassifications.length > 0
        ? "Requires verification"
        : "Likely applicable",
      sources,
    ),
    evaluation(
      "R3",
      ["Non-EU supplier", "No EU establishment", "EU B2C ESS"],
      [
        ...(transaction.seller.country === "RS" ? ["Non-EU supplier"] : []),
        ...(transaction.seller.euFixedEstablishment === false
          ? ["No EU establishment"]
          : []),
        ...(r1Triggered ? ["EU B2C ESS"] : []),
      ],
      transaction.seller.euFixedEstablishment === null
        ? ["EU fixed establishment"]
        : [],
      r1Triggered && transaction.seller.euFixedEstablishment === false,
      "Likely applicable",
      sources,
    ),
    evaluation(
      "R4",
      ["R1 relevant", "Residual presumption", "Two non-conflicting items"],
      [
        ...(r1Triggered ? ["R1 relevant", "Residual presumption"] : []),
        ...(locationEvidenceSufficient ? ["Two non-conflicting items"] : []),
      ],
      r1Triggered && !locationEvidenceSufficient
        ? ["Second non-conflicting location evidence item"]
        : [],
      r1Triggered,
      locationEvidenceSufficient
        ? "Likely applicable"
        : "Requires verification",
      sources,
    ),
    evaluation(
      "R5",
      ["France B2C ESS touchpoint"],
      r1Triggered ? ["France B2C ESS touchpoint"] : [],
      [],
      r1Triggered,
      "Illustrative only",
      sources,
    ),
    evaluation(
      "R6",
      [
        "Taxable business customer",
        "German business location",
        "No FE conflict",
      ],
      [
        ...(transaction.customer.taxablePersonActingAsSuch === true
          ? ["Taxable business customer"]
          : []),
        ...(transaction.customer.businessLocation === "DE"
          ? ["German business location"]
          : []),
        ...(transaction.customer.fixedEstablishmentCleared
          ? ["No FE conflict"]
          : []),
      ],
      r6Unresolved ? ["Taxable-person or fixed-establishment facts"] : [],
      r6Triggered,
      r6Unresolved ? "Requires verification" : "Likely applicable",
      sources,
    ),
    evaluation(
      "R7",
      [
        "R6 satisfied",
        "Supplier not established in Germany",
        "Qualifying recipient",
      ],
      [
        ...(r6Triggered ? ["R6 satisfied"] : []),
        ...(transaction.seller.germanEstablishment === false
          ? ["Supplier not established in Germany"]
          : []),
        ...(viesSupportsBusiness ? ["Qualifying recipient supported"] : []),
      ],
      isGermanBusiness && !viesSupportsBusiness
        ? ["Verified recipient status"]
        : [],
      r7Triggered,
      isGermanBusiness && !r7Triggered
        ? "Requires verification"
        : "Likely applicable",
      sources,
    ),
    evaluation(
      "R8",
      ["R7 satisfied"],
      r7Triggered ? ["R7 satisfied"] : [],
      [],
      r7Triggered,
      "Likely applicable",
      sources,
    ),
    evaluation(
      "R9",
      ["VAT ID provided", "VIES check available"],
      [
        ...(transaction.customer.vatId ? ["VAT ID provided"] : []),
        ...(viesSupportsBusiness ? ["VIES check available"] : []),
      ],
      isGermanBusiness && !viesSupportsBusiness ? ["Valid VIES evidence"] : [],
      isGermanBusiness && Boolean(transaction.customer.vatId),
      viesSupportsBusiness ? "Likely applicable" : "Requires verification",
      sources,
    ),
    evaluation(
      "R10",
      ["Consumer customer", "Preliminarily non-ESS human component"],
      [
        ...(transaction.customer.type === "consumer"
          ? ["Consumer customer"]
          : []),
        ...(likelyHuman.length > 0
          ? ["Preliminarily non-ESS human component"]
          : []),
      ],
      [],
      transaction.customer.type === "consumer" && likelyHuman.length > 0,
      "Professional review required",
      sources,
    ),
    evaluation(
      "R11",
      ["Serbian seller", "Represented B2B or B2C ESS branch"],
      [
        "Serbian seller",
        ...(r6Triggered || r1Triggered
          ? ["Represented B2B or B2C ESS branch"]
          : []),
      ],
      [],
      r6Triggered || r1Triggered,
      "Likely applicable",
      sources,
    ),
    evaluation(
      "R12",
      ["Germany B2B", "Software or IP rights transferred"],
      [
        ...(isGermanBusiness ? ["Germany B2B"] : []),
        ...(rightsTransferred ? ["Software or IP rights transferred"] : []),
      ],
      isGermanBusiness && !rightsTransferred ? ["Rights-transfer facts"] : [],
      isGermanBusiness && rightsTransferred,
      "Professional review required",
      sources,
    ),
  ];

  const evaluationMap = new Map(evaluations.map((item) => [item.ruleId, item]));
  const active = (...ids: RuleId[]) =>
    ids.filter((id) => evaluationMap.get(id)?.triggered);
  const sourceIds = (...ids: RuleId[]) =>
    Array.from(
      new Set(
        ids
          .filter((id) => evaluationMap.get(id)?.triggered)
          .flatMap((id) => evaluationMap.get(id)?.sourceIds ?? []),
      ),
    );

  const customerStatusSources = sourceIds("R9");
  const classificationSources = sourceIds("R2");
  const placeSources = sourceIds("R1", "R6", "R10", "R11");
  const reverseSources = sourceIds("R7");
  const registrationSources = r1Triggered
    ? (evaluationMap.get("R3")?.sourceIds ?? [])
    : [];
  const evidenceSources = sourceIds("R4");
  const invoiceSources = sourceIds("R8");
  const treatySources = sourceIds("R12");

  const touchpoints: TaxTouchpoint[] = [
    makeTouchpoint(
      {
        id: "customer-status",
        topic: "Customer status",
        jurisdiction: transaction.customer.country,
        desiredStatus: isGermanBusiness
          ? viesSupportsBusiness
            ? "Likely applicable"
            : "Requires verification"
          : "Not covered by the current MVP rule pack",
        claims: isGermanBusiness
          ? [
              claim(
                "customer-status-vies",
                userConfirmedVatVerification
                  ? "The user confirmed that the recorded VAT ID was verified; retain timestamped verification evidence before relying on the business-customer analysis."
                  : viesSupportsBusiness
                    ? "The recorded VIES result supports, but does not by itself conclusively establish, the business-customer analysis."
                    : "The customer VAT ID requires verification; an invalid or unavailable result does not automatically make the transaction B2C.",
                ["S10"],
                [
                  userConfirmedVatVerification
                    ? "user-answered:customer.vatIdVerified"
                    : viesCheck.evidenceRef,
                ],
              ),
            ]
          : [
              serviceClaim(
                "customer-status-fixture",
                "The scenario records the customer as a private consumer.",
                ["demo-fixture:customer.type"],
              ),
            ],
        triggeredRuleIds: active("R9"),
        sourceIds: customerStatusSources,
        missingFacts:
          isGermanBusiness && !viesSupportsBusiness
            ? ["Valid customer-status evidence"]
            : [],
        confidence: viesSupportsBusiness ? 0.85 : 0.65,
        professionalReviewRequired: isGermanBusiness,
      },
      sources,
    ),
    makeTouchpoint(
      {
        id: "service-classification",
        topic: "Service classification",
        jurisdiction: "EU",
        desiredStatus:
          unresolvedClassifications.length > 0
            ? "Requires verification"
            : "Likely applicable",
        claims: [
          claim(
            "ess-classification",
            "Automation, minimal human intervention and IT dependence are used as preliminary ESS signals; substantial human involvement is a review signal, not an automatic exclusion.",
            ["S7", "S6"],
            transaction.serviceComponents.flatMap((item) => item.evidenceRefs),
          ),
        ],
        triggeredRuleIds: active("R2"),
        sourceIds: classificationSources,
        missingFacts: unresolvedClassifications.map(
          (item) => `Clarify delivery for ${item.componentId}`,
        ),
        confidence: unresolvedClassifications.length > 0 ? 0.65 : 0.86,
        professionalReviewRequired: true,
      },
      sources,
    ),
    makeTouchpoint(
      {
        id: "place-of-supply",
        topic: "VAT place-of-supply question",
        jurisdiction: transaction.customer.country,
        desiredStatus:
          r1Triggered || r6Triggered
            ? "Likely applicable"
            : isFranceConsumer || isGermanBusiness
              ? "Requires verification"
              : "Not covered by the current MVP rule pack",
        claims: [
          ...(r1Triggered
            ? [
                claim(
                  "france-consumer-destination",
                  "For the preliminarily classified ESS component, the consumer-destination place-of-supply question points to France.",
                  ["S1"],
                  ["demo-fixture:customer.country", "demo-fixture:saas"],
                ),
              ]
            : []),
          ...(r6Triggered
            ? [
                claim(
                  "germany-business-location",
                  "The Article 44 general-rule touchpoint points to the German business location, subject to the fixed-establishment facts.",
                  ["S2"],
                  ["demo-fixture:customer.businessLocation"],
                ),
              ]
            : []),
          ...(evaluationMap.get("R11")?.triggered
            ? [
                claim(
                  "serbian-side-place",
                  "The represented Serbian Article 12 branch also points to the recipient location for this fixture, as draft research only.",
                  ["S13"],
                  ["demo-fixture:seller.country"],
                ),
              ]
            : []),
        ],
        triggeredRuleIds: active("R1", "R6", "R10", "R11"),
        sourceIds: placeSources,
        missingFacts: r6Unresolved
          ? ["Taxable-person and fixed-establishment facts"]
          : [],
        confidence: r1Triggered || r6Triggered ? 0.82 : 0.5,
        professionalReviewRequired: true,
      },
      sources,
    ),
    makeTouchpoint(
      {
        id: "reverse-charge",
        topic: "Reverse-charge question",
        jurisdiction: "DE",
        desiredStatus: isGermanBusiness
          ? r7Triggered
            ? "Likely applicable"
            : "Requires verification"
          : "Not covered by the current MVP rule pack",
        claims: r7Triggered
          ? [
              claim(
                "germany-reverse-charge",
                "A preliminary reverse-charge touchpoint is present for the qualifying Article 44 service from a supplier not established in Germany; every condition remains subject to review.",
                ["S4", "S12"],
                ["demo-fixture:seller", "demo-fixture:customer"],
              ),
            ]
          : [],
        triggeredRuleIds: active("R7"),
        sourceIds: reverseSources,
        missingFacts:
          isGermanBusiness && !r7Triggered
            ? ["Qualifying recipient and establishment conditions"]
            : [],
        confidence: r7Triggered ? 0.82 : 0.45,
        professionalReviewRequired: isGermanBusiness,
      },
      sources,
    ),
    makeTouchpoint(
      {
        id: "registration-reporting",
        topic: "Registration / reporting route",
        jurisdiction: "EU / FR",
        desiredStatus: r1Triggered
          ? evaluationMap.get("R3")?.triggered
            ? "Likely applicable"
            : "Requires verification"
          : "Not covered by the current MVP rule pack",
        claims: r1Triggered
          ? [
              claim(
                "non-union-oss-option",
                "The reporting route requires action: consider the optional non-Union OSS or verify the applicable national registration alternative; do not treat OSS itself as mandatory.",
                ["S9"],
                ["demo-fixture:seller.euFixedEstablishment"],
              ),
            ]
          : [],
        triggeredRuleIds: active("R3"),
        sourceIds: registrationSources,
        missingFacts: r1Triggered ? ["Selected reporting route"] : [],
        confidence: r1Triggered ? 0.8 : 0.4,
        professionalReviewRequired: r1Triggered,
      },
      sources,
    ),
    makeTouchpoint(
      {
        id: "location-evidence",
        topic: "Customer-location evidence",
        jurisdiction: "FR",
        desiredStatus: r1Triggered
          ? locationEvidenceSufficient
            ? "Likely applicable"
            : "Requires verification"
          : "Not covered by the current MVP rule pack",
        claims: r1Triggered
          ? [
              claim(
                "location-evidence-count",
                locationEvidenceSufficient
                  ? "Two non-conflicting customer-location evidence items are recorded for the residual presumption analysis."
                  : "The residual presumption analysis currently has fewer than two non-conflicting customer-location evidence items.",
                ["S8"],
                transaction.customer.locationEvidence.map(
                  (item) => item.reference,
                ),
              ),
            ]
          : [],
        triggeredRuleIds: active("R4"),
        sourceIds: evidenceSources,
        missingFacts:
          r1Triggered && !locationEvidenceSufficient
            ? ["Second non-conflicting customer-location evidence item"]
            : [],
        confidence: locationEvidenceSufficient ? 0.86 : 0.55,
        professionalReviewRequired: r1Triggered,
      },
      sources,
    ),
    makeTouchpoint(
      {
        id: "invoice-checklist",
        topic: "Invoice checklist",
        jurisdiction: "EU / DE",
        desiredStatus: r7Triggered
          ? "Likely applicable"
          : isGermanBusiness
            ? "Requires verification"
            : "Not covered by the current MVP rule pack",
        claims: r7Triggered
          ? [
              claim(
                "reverse-charge-invoice",
                "The draft invoice checklist includes the customer VAT identification number where required and the wording ‘Reverse charge’; it is not a legally final invoice.",
                ["S5"],
                [viesCheck.evidenceRef],
              ),
            ]
          : [],
        triggeredRuleIds: active("R8"),
        sourceIds: invoiceSources,
        missingFacts: [],
        confidence: r7Triggered ? 0.84 : 0.5,
        professionalReviewRequired: r7Triggered,
      },
      sources,
    ),
    makeTouchpoint(
      {
        id: "withholding-treaty",
        topic: "Withholding / treaty review",
        jurisdiction: "DE / RS",
        desiredStatus:
          isGermanBusiness && rightsTransferred
            ? "Professional review required"
            : "Not covered by the current MVP rule pack",
        claims:
          isGermanBusiness && rightsTransferred
            ? [
                claim(
                  "treaty-rights-review",
                  "The indicated software-rights transfer raises a possible royalty, withholding and Article 13 treaty-classification question; no conclusion is made that withholding applies or that every software payment is a royalty.",
                  ["S14"],
                  ["demo-fixture:software-licence.ipRightsTransferred"],
                ),
              ]
            : [],
        triggeredRuleIds: active("R12"),
        sourceIds: treatySources,
        missingFacts:
          isGermanBusiness && rightsTransferred
            ? [
                "Rights transferred and exclusivity",
                "Reproduction and modification rights",
                "Payment structure",
                "Beneficial ownership",
              ]
            : [],
        confidence: rightsTransferred ? 0.68 : 0.35,
        professionalReviewRequired: rightsTransferred,
      },
      sources,
    ),
    makeTouchpoint(
      {
        id: "professional-review",
        topic: "Professional-review requirement",
        jurisdiction: transaction.jurisdictions.join(" / "),
        desiredStatus: "Professional review required",
        claims: [
          serviceClaim(
            "mixed-supply-review",
            "Confirm whether the commercially mixed components form a single or composite supply before relying on component-level mapping.",
            transaction.serviceComponents.flatMap((item) => item.evidenceRefs),
          ),
        ],
        triggeredRuleIds: [],
        sourceIds: [],
        missingFacts: ["Single or composite supply treatment"],
        confidence: 0.7,
        professionalReviewRequired: true,
      },
      sources,
    ),
  ];

  for (const touchpoint of touchpoints) {
    validateTouchpointClaims(touchpoint, sources);
  }

  const result: AnalysisResult = {
    input,
    normalizedTransaction: transaction,
    serviceClassifications: classifications,
    diagramData: {
      seller: "Serbian seller",
      components: transaction.serviceComponents.map((item) => item.description),
      customer: `${transaction.customer.country} ${transaction.customer.type}`,
      jurisdictions: transaction.jurisdictions,
    },
    taxTouchpoints: touchpoints,
    checklist: {
      "Information to request": [
        ...transaction.missingFacts,
        "Confirm the customer and relevant establishment for the supply",
      ],
      "Evidence to retain": [
        "Structured input and answer provenance",
        ...(r1Triggered
          ? ["Two non-conflicting customer-location evidence items"]
          : []),
        ...(isGermanBusiness ? ["Timestamped VIES validation evidence"] : []),
      ],
      "Contract points to review": [
        "Service-component scope and pricing",
        "Single or composite supply treatment",
        ...(rightsTransferred
          ? [
              "Software rights, exclusivity, modification and beneficial ownership",
            ]
          : []),
      ],
      "Invoice points to review": r7Triggered
        ? [
            "Customer VAT ID",
            "‘Reverse charge’ wording",
            "All other applicable invoice fields",
          ]
        : ["Invoice recipient and applicable rule path"],
      "Questions for a qualified adviser": [
        "Does a special place-of-supply rule outside R1–R12 affect any component?",
        "Should the components be treated as one supply for VAT purposes?",
        ...(rightsTransferred
          ? [
              "How should the exact software rights and payment be classified under treaty Article 13?",
            ]
          : []),
      ],
    },
    analysisTrace: {
      ruleEvaluations: evaluations,
      citationGatePassed: true,
      rerunWithoutGpt: options.rerunWithoutGpt ?? false,
    },
    sourceReferences: sources,
    viesCheck,
    modelMetadata: {
      model: transaction.normalizationMetadata.model,
      mode: transaction.normalizationMetadata.mode,
    },
    generatedAt:
      options.generatedAt ??
      (transaction.normalizationMetadata.mode === "fixture"
        ? fixedFixtureTime
        : new Date().toISOString()),
    fixtureOrLive: transaction.normalizationMetadata.mode,
  };

  return analysisResultSchema.parse(result);
}
