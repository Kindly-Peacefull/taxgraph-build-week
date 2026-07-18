import {
  normalizedTransactionSchema,
  type AnalysisResult,
  type NormalizedTransaction,
  type ScenarioDiff,
} from "@/lib/domain";
import { compareAnalyses } from "@/lib/diff";
import { evaluateTransaction } from "@/lib/engine";

function updateLocationEvidence(
  transaction: NormalizedTransaction,
  answer: string,
  capturedAt: string,
) {
  const type = ["ip_address", "bank_location", "sim_country", "other"].includes(
    answer,
  )
    ? (answer as "ip_address" | "bank_location" | "sim_country" | "other")
    : "other";
  return {
    ...transaction,
    customer: {
      ...transaction.customer,
      locationEvidence: [
        ...transaction.customer.locationEvidence,
        {
          type,
          country: transaction.customer.country,
          reference: `user-answered:fr-location-evidence:${type}`,
        },
      ],
    },
    missingFacts: transaction.missingFacts.filter(
      (item) => !item.toLowerCase().includes("second non-conflicting"),
    ),
    missingFactQuestions: transaction.missingFactQuestions.filter(
      (item) => item.id !== "fr-location-evidence",
    ),
    provenance: {
      ...transaction.provenance,
      "customer.locationEvidence": [
        ...(transaction.provenance["customer.locationEvidence"] ?? []),
        {
          sourceType: "user-answered" as const,
          sourcePointer: "missingFactQuestions.fr-location-evidence",
          capturedAt,
          previousValue: transaction.customer.locationEvidence,
        },
      ],
    },
  };
}

export function answerMissingFact(
  previous: AnalysisResult,
  questionId: string,
  answer: string | boolean,
): { result: AnalysisResult; diff: ScenarioDiff } {
  const capturedAt = new Date().toISOString();
  let transaction: NormalizedTransaction = previous.normalizedTransaction;

  if (questionId === "fr-location-evidence" && typeof answer === "string") {
    transaction = normalizedTransactionSchema.parse(
      updateLocationEvidence(transaction, answer, capturedAt),
    );
  } else if (questionId === "de-rights-scope") {
    transaction = normalizedTransactionSchema.parse({
      ...transaction,
      missingFactQuestions: transaction.missingFactQuestions.filter(
        (item) => item.id !== questionId,
      ),
      provenance: {
        ...transaction.provenance,
        "serviceComponents.software-licence.rightsScopeAnswered": [
          {
            sourceType: "user-answered",
            sourcePointer: `missingFactQuestions.${questionId}`,
            capturedAt,
            previousValue: null,
          },
        ],
      },
      knownFacts: [
        ...transaction.knownFacts,
        {
          path: "serviceComponents.software-licence.rightsScopeAnswered",
          value: answer,
          label: "Reproduction or modification rights",
          provenance: {
            sourceType: "user-answered",
            sourcePointer: `missingFactQuestions.${questionId}`,
            capturedAt,
          },
        },
      ],
    });
  } else {
    throw new Error(`Unsupported missing-fact question: ${questionId}`);
  }

  const result = evaluateTransaction(
    previous.input,
    transaction,
    previous.viesCheck,
    { rerunWithoutGpt: true },
  );
  return { result, diff: compareAnalyses(previous, result) };
}
