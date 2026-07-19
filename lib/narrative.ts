import { z } from "zod";
import {
  analysisResultSchema,
  narrativeSentenceSchema,
  type AnalysisResult,
  type SourceReference,
} from "@/lib/domain";
import { validateClaim, validateTouchpointClaims } from "@/lib/citations";
import { loadSourcePack } from "@/lib/source-pack";

export const narrativeModelPayloadSchema = z.object({
  sentences: z.array(narrativeSentenceSchema).min(1),
});

export const narrativeSystemPrompt = `You explain a completed deterministic TaxGraph analysis as a concise adviser-style summary.
Write 150–250 words total as a coherent sequence of complete sentences.
Use only the normalized facts, triggered rules, source-backed claims and missing facts supplied by the user message.
Do not generate a new tax rule, tax conclusion, rate, obligation or recommendation.
Preserve uncertainty and pending-review language. Explain what the mapped touchpoints mean and which missing facts could change the review.
Every sentence must include one or more sourceIds drawn only from the supplied triggered rules or source-backed claims. Never invent a source ID.
Return the schema-constrained sentences only.`;

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function validateNarrativePayload(
  rawPayload: unknown,
  sources: SourceReference[] = loadSourcePack(),
) {
  const payload = narrativeModelPayloadSchema.parse(rawPayload);

  for (const [index, sentence] of payload.sentences.entries()) {
    validateClaim(
      {
        id: `narrative-sentence-${index + 1}`,
        text: sentence.text,
        sourceIds: sentence.sourceIds,
      },
      sources,
      { substantive: true },
    );
  }

  const wordCount = countWords(
    payload.sentences.map((sentence) => sentence.text).join(" "),
  );
  if (wordCount < 150 || wordCount > 250) {
    throw new Error(
      `Narrative summary must contain 150–250 words; received ${wordCount}.`,
    );
  }

  return payload;
}

export function buildNarrativeInput(rawAnalysis: unknown) {
  const analysis: AnalysisResult = analysisResultSchema.parse(rawAnalysis);
  const sources = loadSourcePack();
  if (!analysis.analysisTrace.citationGatePassed) {
    throw new Error("The analysis citation gate has not passed.");
  }
  for (const touchpoint of analysis.taxTouchpoints) {
    validateTouchpointClaims(touchpoint, sources);
  }

  const transaction = analysis.normalizedTransaction;
  const normalizedFacts = [
    { path: "seller.country", value: transaction.seller.country },
    {
      path: "seller.euFixedEstablishment",
      value: transaction.seller.euFixedEstablishment,
    },
    { path: "customer.country", value: transaction.customer.country },
    { path: "customer.type", value: transaction.customer.type },
    {
      path: "customer.taxablePersonActingAsSuch",
      value: transaction.customer.taxablePersonActingAsSuch,
    },
    {
      path: "customer.fixedEstablishmentCountry",
      value: transaction.customer.fixedEstablishmentCountry,
    },
    {
      path: "commercialArrangement.deliveryChannel",
      value: transaction.commercialArrangement.deliveryChannel,
    },
    {
      path: "commercialArrangement.recurring",
      value: transaction.commercialArrangement.recurring,
    },
    ...transaction.serviceComponents.map((component) => ({
      path: `serviceComponents.${component.id}`,
      value: {
        category: component.category,
        description: component.description,
        deliveryMode: component.deliveryMode,
        automationLevel: component.automationLevel,
        humanInvolvement: component.humanInvolvement,
        recurring: component.recurring,
        ipRightsTransferred: component.ipRightsTransferred,
        physicalPresenceRequired: component.physicalPresenceRequired,
      },
    })),
    ...transaction.knownFacts.map((fact) => ({
      path: fact.path,
      value: fact.value,
    })),
    ...transaction.inferredFacts.map((fact) => ({
      path: fact.path,
      value: fact.value,
    })),
  ];

  const triggeredRules = analysis.analysisTrace.ruleEvaluations
    .filter((rule) => rule.triggered)
    .map((rule) => ({
      ruleId: rule.ruleId,
      outputStatus: rule.outputStatus,
      sourceIds: rule.sourceIds,
    }));

  const sourceBackedClaims = analysis.taxTouchpoints.flatMap((touchpoint) =>
    touchpoint.claims
      .filter((claim) => claim.sourceIds.length > 0)
      .map((claim) => ({
        topic: touchpoint.topic,
        status: touchpoint.status,
        text: claim.text,
        sourceIds: claim.sourceIds,
      })),
  );

  return {
    normalizedFacts,
    triggeredRules,
    sourceBackedClaims,
    missingFacts: transaction.missingFacts,
  };
}
