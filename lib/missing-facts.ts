import { z } from "zod";
import {
  answerableFactPathSchema,
  missingFactQuestionSchema,
  type AnswerableFactPath,
  type MissingFactQuestion,
  type NormalizedTransaction,
  type RuleId,
} from "@/lib/domain";

export const modelMissingFactQuestionSchema = z.object({
  id: z.string().min(1),
  factPath: answerableFactPathSchema,
  prompt: z.string().min(1),
  reason: z.string().min(1),
});

type QuestionConfig = Pick<
  MissingFactQuestion,
  "answerType" | "options" | "affectedRuleIds"
> & { missingFactTerms: string[] };

const config: Record<AnswerableFactPath, QuestionConfig> = {
  "customer.vatId": {
    answerType: "short_text",
    affectedRuleIds: ["R6", "R7", "R8", "R9"],
    missingFactTerms: ["vat id", "vat number"],
  },
  "customer.vatIdVerified": {
    answerType: "boolean",
    affectedRuleIds: ["R6", "R7", "R8", "R9"],
    missingFactTerms: ["vies", "vat verification", "customer-status evidence"],
  },
  "customer.taxablePersonActingAsSuch": {
    answerType: "boolean",
    affectedRuleIds: ["R6", "R7", "R8", "R9", "R11"],
    missingFactTerms: ["taxable person", "taxable-person"],
  },
  "customer.businessLocation": {
    answerType: "short_text",
    affectedRuleIds: ["R6", "R7", "R9", "R11"],
    missingFactTerms: ["business location"],
  },
  "customer.fixedEstablishmentCountry": {
    answerType: "short_text",
    affectedRuleIds: ["R6", "R7", "R8"],
    missingFactTerms: [
      "fixed establishment country",
      "fixed-establishment country",
    ],
  },
  "customer.fixedEstablishmentCleared": {
    answerType: "boolean",
    affectedRuleIds: ["R6", "R7", "R8"],
    missingFactTerms: ["fixed establishment", "fixed-establishment"],
  },
  "customer.locationEvidence": {
    answerType: "single_select",
    options: ["ip_address", "bank_location", "sim_country", "other"],
    affectedRuleIds: ["R4"],
    missingFactTerms: ["location evidence", "non-conflicting"],
  },
  "seller.germanEstablishment": {
    answerType: "boolean",
    affectedRuleIds: ["R7", "R8"],
    missingFactTerms: ["supplier establishment", "seller establishment"],
  },
  "serviceComponents.automationLevel": {
    answerType: "single_select",
    options: ["high", "medium", "low", "unknown"],
    affectedRuleIds: ["R1", "R2", "R3", "R6", "R7", "R10", "R11"],
    missingFactTerms: ["automation"],
  },
  "serviceComponents.humanInvolvement": {
    answerType: "single_select",
    options: ["minimal", "limited", "substantial", "unknown"],
    affectedRuleIds: ["R1", "R2", "R3", "R6", "R7", "R10", "R11"],
    missingFactTerms: ["human involvement", "human delivery"],
  },
  "serviceComponents.physicalPresenceRequired": {
    answerType: "boolean",
    affectedRuleIds: ["R2", "R10"],
    missingFactTerms: ["physical presence", "on-site", "onsite"],
  },
  "serviceComponents.ipRightsTransferred": {
    answerType: "boolean",
    affectedRuleIds: ["R12"],
    missingFactTerms: ["rights transfer", "rights transferred", "ip rights"],
  },
  "serviceComponents.reproductionRights": {
    answerType: "boolean",
    affectedRuleIds: ["R12"],
    missingFactTerms: ["reproduction rights"],
  },
  "serviceComponents.modificationRights": {
    answerType: "boolean",
    affectedRuleIds: ["R12"],
    missingFactTerms: ["modification rights"],
  },
  "serviceComponents.exclusiveRights": {
    answerType: "boolean",
    affectedRuleIds: ["R12"],
    missingFactTerms: ["exclusive rights", "exclusivity"],
  },
  "serviceComponents.beneficialOwner": {
    answerType: "short_text",
    affectedRuleIds: ["R12"],
    missingFactTerms: ["beneficial owner", "beneficial ownership"],
  },
};

export function createMissingFactQuestion(
  raw: z.infer<typeof modelMissingFactQuestionSchema>,
): MissingFactQuestion {
  const question = modelMissingFactQuestionSchema.parse(raw);
  return missingFactQuestionSchema.parse({
    ...question,
    ...config[question.factPath],
  });
}

export function affectedRulesForFactPath(path: AnswerableFactPath): RuleId[] {
  return [...config[path].affectedRuleIds];
}

export function missingFactTermsForPath(path: AnswerableFactPath): string[] {
  return config[path].missingFactTerms;
}

const mandatoryQuestions: Partial<
  Record<
    AnswerableFactPath,
    Pick<MissingFactQuestion, "prompt" | "reason"> & { missingFact: string }
  >
> = {
  "customer.vatId": {
    prompt: "What is the customer's VAT ID?",
    reason: "The VAT ID is needed for the customer-status evidence path.",
    missingFact: "Customer VAT ID",
  },
  "customer.vatIdVerified": {
    prompt: "Has the customer's VAT ID been verified in VIES?",
    reason: "Verification affects the B2B customer-status evidence path.",
    missingFact: "VIES verification of the customer VAT ID",
  },
  "customer.taxablePersonActingAsSuch": {
    prompt:
      "Is the customer a taxable person acting as such for this purchase?",
    reason: "Business status alone does not settle the Article 44 review path.",
    missingFact: "Taxable-person status for this purchase",
  },
  "customer.businessLocation": {
    prompt: "In which country is the customer's relevant business established?",
    reason:
      "The relevant business location is required for the B2B place-of-supply review.",
    missingFact: "Customer's relevant business location",
  },
  "customer.fixedEstablishmentCleared": {
    prompt:
      "Has customer fixed-establishment involvement been checked and cleared?",
    reason:
      "The B2B review remains unresolved until fixed-establishment involvement is checked.",
    missingFact: "Customer fixed-establishment involvement",
  },
  "seller.germanEstablishment": {
    prompt:
      "Does the seller have a German establishment involved in this supply?",
    reason:
      "Supplier establishment involvement affects the reverse-charge review path.",
    missingFact: "Seller establishment involvement in Germany",
  },
  "customer.locationEvidence": {
    prompt: "Which second customer-location evidence item is available?",
    reason:
      "The residual presumption review needs two non-conflicting evidence items.",
    missingFact: "A second non-conflicting customer-location evidence item",
  },
};

function hasUserAnswer(transaction: NormalizedTransaction, path: string) {
  return transaction.knownFacts.some(
    (fact) =>
      fact.path === path && fact.provenance.sourceType === "user-answered",
  );
}

function isClosed(
  transaction: NormalizedTransaction,
  path: AnswerableFactPath,
  viesStatus: string,
) {
  if (hasUserAnswer(transaction, path)) return true;
  if (path === "customer.vatId") return transaction.customer.vatId.length > 0;
  if (path === "customer.vatIdVerified") {
    return viesStatus === "valid" || viesStatus === "fixture";
  }
  if (path === "customer.taxablePersonActingAsSuch") {
    return transaction.customer.taxablePersonActingAsSuch !== null;
  }
  if (path === "customer.businessLocation") {
    return transaction.customer.businessLocation !== null;
  }
  if (path === "customer.fixedEstablishmentCountry") {
    return (
      transaction.customer.fixedEstablishmentCountry !== null ||
      transaction.customer.fixedEstablishmentCleared
    );
  }
  if (path === "customer.fixedEstablishmentCleared") {
    return transaction.customer.fixedEstablishmentCleared;
  }
  if (path === "customer.locationEvidence") {
    return transaction.customer.locationEvidence.length >= 2;
  }
  if (path === "seller.germanEstablishment") {
    return transaction.seller.germanEstablishment !== null;
  }
  if (path === "serviceComponents.automationLevel") {
    return transaction.serviceComponents.every(
      (item) => item.automationLevel !== "unknown",
    );
  }
  if (path === "serviceComponents.humanInvolvement") {
    return transaction.serviceComponents.every(
      (item) => item.humanInvolvement !== "unknown",
    );
  }
  if (path === "serviceComponents.physicalPresenceRequired") {
    return transaction.serviceComponents.every(
      (item) => item.physicalPresenceRequired !== null,
    );
  }
  if (path === "serviceComponents.ipRightsTransferred") {
    return transaction.serviceComponents.every(
      (item) => item.ipRightsTransferred !== null,
    );
  }
  return false;
}

export function reconcileMissingFactQuestions(
  transaction: NormalizedTransaction,
  viesStatus: string,
): NormalizedTransaction {
  const questions = transaction.missingFactQuestions.filter(
    (question) => !isClosed(transaction, question.factPath, viesStatus),
  );
  const missingFacts = [...transaction.missingFacts];
  const requiredPaths: AnswerableFactPath[] = [];

  if (
    transaction.customer.country === "FR" &&
    transaction.customer.type === "consumer"
  ) {
    requiredPaths.push("customer.locationEvidence");
  }
  if (
    transaction.customer.country === "DE" &&
    transaction.customer.type === "business"
  ) {
    requiredPaths.push(
      "customer.vatId",
      "customer.vatIdVerified",
      "customer.taxablePersonActingAsSuch",
      "customer.businessLocation",
      "customer.fixedEstablishmentCleared",
      "seller.germanEstablishment",
    );
  }

  for (const factPath of requiredPaths) {
    if (
      isClosed(transaction, factPath, viesStatus) ||
      questions.some((question) => question.factPath === factPath)
    ) {
      continue;
    }
    const required = mandatoryQuestions[factPath];
    if (!required) continue;
    questions.push(
      createMissingFactQuestion({
        id: `engine-${factPath.replaceAll(".", "-")}`,
        factPath,
        prompt: required.prompt,
        reason: required.reason,
      }),
    );
    if (!missingFacts.includes(required.missingFact)) {
      missingFacts.push(required.missingFact);
    }
  }

  return {
    ...transaction,
    missingFacts,
    missingFactQuestions: questions,
  };
}
