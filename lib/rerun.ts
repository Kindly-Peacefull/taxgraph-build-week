import {
  normalizedTransactionSchema,
  type AnalysisResult,
  type AnswerableFactPath,
  type MissingFactQuestion,
  type NormalizedTransaction,
  type ScenarioDiff,
} from "@/lib/domain";
import { compareAnalyses } from "@/lib/diff";
import { evaluateTransaction } from "@/lib/engine";
import {
  missingFactTermsForPath,
  reconcileMissingFactQuestions,
} from "@/lib/missing-facts";

function normalizeAnswer(
  question: MissingFactQuestion,
  answer: string | boolean,
): string | boolean {
  if (question.answerType === "boolean") {
    if (typeof answer !== "boolean") {
      throw new Error(`A Yes/No answer is required for ${question.factPath}.`);
    }
    return answer;
  }
  if (typeof answer !== "string" || answer.trim().length === 0) {
    throw new Error(`A text answer is required for ${question.factPath}.`);
  }
  const value = answer.trim();
  if (question.factPath === "customer.vatId" && value.length > 20) {
    throw new Error("The VAT ID must be 20 characters or fewer.");
  }
  if (
    (question.factPath === "customer.businessLocation" ||
      question.factPath === "customer.fixedEstablishmentCountry") &&
    !/^[a-z]{2}$/i.test(value) &&
    !["none", "n/a", "no"].includes(value.toLowerCase())
  ) {
    throw new Error("Enter a two-letter country code, or 'none'.");
  }
  if (
    question.answerType === "single_select" &&
    !question.options?.includes(value)
  ) {
    throw new Error(`The answer is not allowed for ${question.factPath}.`);
  }
  return value;
}

function componentField(
  transaction: NormalizedTransaction,
  path: AnswerableFactPath,
  answer: string | boolean,
) {
  const key = path.slice("serviceComponents.".length);
  if (key === "automationLevel" && typeof answer === "string") {
    return transaction.serviceComponents.map((item) => ({
      ...item,
      automationLevel: answer as "high" | "medium" | "low" | "unknown",
    }));
  }
  if (key === "humanInvolvement" && typeof answer === "string") {
    return transaction.serviceComponents.map((item) => ({
      ...item,
      humanInvolvement: answer as
        "minimal" | "limited" | "substantial" | "unknown",
    }));
  }
  if (key === "physicalPresenceRequired" && typeof answer === "boolean") {
    return transaction.serviceComponents.map((item) => ({
      ...item,
      physicalPresenceRequired: answer,
    }));
  }
  if (key === "ipRightsTransferred" && typeof answer === "boolean") {
    const hasLicence = transaction.serviceComponents.some(
      (item) => item.category === "software-licence",
    );
    return transaction.serviceComponents.map((item) =>
      hasLicence && item.category !== "software-licence"
        ? item
        : { ...item, ipRightsTransferred: answer },
    );
  }
  return transaction.serviceComponents;
}

function applyAnswerToTransaction(
  transaction: NormalizedTransaction,
  question: MissingFactQuestion,
  answer: string | boolean,
  capturedAt: string,
): NormalizedTransaction {
  const path = question.factPath;
  const sourcePointer = `missingFactQuestions.${question.id}`;
  const priorKnownFact = transaction.knownFacts.findLast(
    (fact) => fact.path === path,
  );
  const provenance = {
    sourceType: "user-answered" as const,
    sourcePointer,
    capturedAt,
    previousValue: priorKnownFact?.value,
  };
  let next: NormalizedTransaction = transaction;

  if (path === "customer.vatId" && typeof answer === "string") {
    next = {
      ...next,
      customer: { ...next.customer, vatId: answer.toUpperCase() },
    };
  } else if (
    path === "customer.taxablePersonActingAsSuch" &&
    typeof answer === "boolean"
  ) {
    next = {
      ...next,
      customer: { ...next.customer, taxablePersonActingAsSuch: answer },
    };
  } else if (
    path === "customer.businessLocation" &&
    typeof answer === "string"
  ) {
    next = {
      ...next,
      customer: { ...next.customer, businessLocation: answer.toUpperCase() },
    };
  } else if (
    path === "customer.fixedEstablishmentCountry" &&
    typeof answer === "string"
  ) {
    const country = ["none", "n/a", "no"].includes(answer.toLowerCase())
      ? null
      : answer.toUpperCase();
    next = {
      ...next,
      customer: { ...next.customer, fixedEstablishmentCountry: country },
    };
  } else if (
    path === "customer.fixedEstablishmentCleared" &&
    typeof answer === "boolean"
  ) {
    next = {
      ...next,
      customer: { ...next.customer, fixedEstablishmentCleared: answer },
    };
  } else if (
    path === "customer.locationEvidence" &&
    typeof answer === "string"
  ) {
    const type = answer as
      "ip_address" | "bank_location" | "sim_country" | "other";
    next = {
      ...next,
      customer: {
        ...next.customer,
        locationEvidence: [
          ...next.customer.locationEvidence,
          {
            type,
            country: next.customer.country,
            reference: `user-answered:${question.id}:${type}`,
          },
        ],
      },
    };
  } else if (
    path === "seller.germanEstablishment" &&
    typeof answer === "boolean"
  ) {
    next = { ...next, seller: { ...next.seller, germanEstablishment: answer } };
  } else if (path.startsWith("serviceComponents.")) {
    next = {
      ...next,
      serviceComponents: componentField(next, path, answer),
    };
  }

  const terms = missingFactTermsForPath(path);
  return normalizedTransactionSchema.parse({
    ...next,
    knownFacts: [
      ...next.knownFacts.filter((fact) => fact.path !== path),
      { path, value: answer, label: question.prompt, provenance },
    ],
    missingFacts: next.missingFacts.filter((fact) => {
      const lower = fact.toLowerCase();
      return !terms.some((term) => lower.includes(term));
    }),
    missingFactQuestions: next.missingFactQuestions.filter(
      (item) => item.id !== question.id,
    ),
    provenance: {
      ...next.provenance,
      [path]: [...(next.provenance[path] ?? []), provenance],
    },
  });
}

export function answerMissingFact(
  previous: AnalysisResult,
  questionId: string,
  rawAnswer: string | boolean,
): { result: AnalysisResult; diff: ScenarioDiff } {
  const question = previous.normalizedTransaction.missingFactQuestions.find(
    (item) => item.id === questionId,
  );
  if (!question)
    throw new Error(`Unknown missing-fact question: ${questionId}`);

  const answer = normalizeAnswer(question, rawAnswer);
  const transaction = reconcileMissingFactQuestions(
    applyAnswerToTransaction(
      previous.normalizedTransaction,
      question,
      answer,
      new Date().toISOString(),
    ),
    previous.viesCheck.status,
  );
  const result = evaluateTransaction(
    previous.input,
    transaction,
    previous.viesCheck,
    { rerunWithoutGpt: true },
  );
  return { result, diff: compareAnalyses(previous, result) };
}
