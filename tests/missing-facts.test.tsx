import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MissingFactAnswerControl } from "@/components/taxgraph-app";
import {
  answerableFactPathSchema,
  normalizedTransactionSchema,
  type MissingFactQuestion,
} from "@/lib/domain";
import { evaluateTransaction } from "@/lib/engine";
import {
  createGermanyTransaction,
  createGermanyViesResult,
  germanyInput,
} from "@/lib/fixtures";
import {
  createMissingFactQuestion,
  modelMissingFactQuestionSchema,
  reconcileMissingFactQuestions,
} from "@/lib/missing-facts";
import { answerMissingFact } from "@/lib/rerun";

function withQuestion(question: MissingFactQuestion) {
  const transaction = createGermanyTransaction();
  transaction.missingFactQuestions = [question];
  return normalizedTransactionSchema.parse(transaction);
}

function rule(result: ReturnType<typeof evaluateTransaction>, id: string) {
  return result.analysisTrace.ruleEvaluations.find(
    (item) => item.ruleId === id,
  );
}

describe("missing-fact workflow", () => {
  it("accepts and persists an answer for every factPath the model may generate", () => {
    for (const factPath of answerableFactPathSchema.options) {
      const question = createMissingFactQuestion({
        id: `question-${factPath}`,
        factPath,
        prompt: `Answer ${factPath}`,
        reason: "This fact can change the deterministic review path.",
      });
      const initial = evaluateTransaction(
        germanyInput,
        withQuestion(question),
        createGermanyViesResult(),
      );
      const answer =
        question.answerType === "boolean"
          ? true
          : question.answerType === "single_select"
            ? (question.options?.[0] ?? "unknown")
            : factPath === "customer.vatId"
              ? "DE811907980"
              : factPath.includes("Location") || factPath.includes("Country")
                ? "DE"
                : "seller";
      const { result } = answerMissingFact(initial, question.id, answer);

      expect(result.normalizedTransaction.missingFactQuestions).toHaveLength(0);
      expect(
        result.normalizedTransaction.knownFacts.find(
          (fact) => fact.path === factPath,
        )?.provenance.sourceType,
      ).toBe("user-answered");
      expect(result.analysisTrace.rerunWithoutGpt).toBe(true);
    }
  });

  it("moves R9 and its downstream live business rules after VAT verification", () => {
    const question = createMissingFactQuestion({
      id: "live-vat-verification",
      factPath: "customer.vatIdVerified",
      prompt: "Has the VAT ID been verified in VIES?",
      reason: "Verification affects the B2B evidence path.",
    });
    const unavailableVies = {
      ...createGermanyViesResult(),
      status: "unavailable" as const,
      liveOrFixture: "unavailable" as const,
    };
    const initial = evaluateTransaction(
      { ...germanyInput, demoScenarioId: null },
      withQuestion(question),
      unavailableVies,
    );
    const { result, diff } = answerMissingFact(initial, question.id, true);

    expect(rule(initial, "R7")?.triggered).toBe(false);
    expect(rule(result, "R7")?.triggered).toBe(true);
    expect(rule(initial, "R9")?.outputStatus).toBe("Requires verification");
    expect(rule(result, "R9")?.outputStatus).not.toBe("Requires verification");
    expect(diff.affectedRules).toEqual(expect.arrayContaining(["R7", "R9"]));
  });

  it("synthesizes omitted live B2B questions and can close the R6/R7/R9 path", () => {
    const transaction = createGermanyTransaction();
    transaction.customer.taxablePersonActingAsSuch = null;
    transaction.customer.businessLocation = null;
    transaction.customer.fixedEstablishmentCleared = false;
    transaction.seller.germanEstablishment = null;
    transaction.missingFactQuestions = [];
    const unavailableVies = {
      ...createGermanyViesResult(),
      status: "unavailable" as const,
      liveOrFixture: "unavailable" as const,
    };
    const reconciled = reconcileMissingFactQuestions(
      normalizedTransactionSchema.parse(transaction),
      unavailableVies.status,
    );
    const paths = reconciled.missingFactQuestions.map(
      (question) => question.factPath,
    );
    expect(paths).toEqual(
      expect.arrayContaining([
        "customer.vatIdVerified",
        "customer.taxablePersonActingAsSuch",
        "customer.businessLocation",
        "customer.fixedEstablishmentCleared",
        "seller.germanEstablishment",
      ]),
    );

    let current = evaluateTransaction(
      { ...germanyInput, demoScenarioId: null },
      reconciled,
      unavailableVies,
    );
    const applyByPath = (
      factPath: MissingFactQuestion["factPath"],
      answer: string | boolean,
    ) => {
      const question = current.normalizedTransaction.missingFactQuestions.find(
        (item) => item.factPath === factPath,
      );
      expect(question, `missing ${factPath}`).toBeDefined();
      current = answerMissingFact(current, question!.id, answer).result;
    };
    applyByPath("customer.vatIdVerified", true);
    applyByPath("customer.taxablePersonActingAsSuch", true);
    applyByPath("customer.businessLocation", "DE");
    applyByPath("customer.fixedEstablishmentCleared", true);
    applyByPath("seller.germanEstablishment", false);

    expect(rule(current, "R6")?.triggered).toBe(true);
    expect(rule(current, "R7")?.triggered).toBe(true);
    expect(rule(current, "R9")?.outputStatus).not.toBe("Requires verification");
    expect(
      current.normalizedTransaction.knownFacts.filter(
        (fact) => fact.provenance.sourceType === "user-answered",
      ),
    ).toHaveLength(5);
  });

  it("moves R12 when the Germany fixture rights answer closes the fact", () => {
    const initial = evaluateTransaction(
      germanyInput,
      createGermanyTransaction(),
      createGermanyViesResult(),
    );
    const { result } = answerMissingFact(initial, "de-rights-scope", false);
    const before = initial.taxTouchpoints.find(
      (item) => item.id === "withholding-treaty",
    );
    const after = result.taxTouchpoints.find(
      (item) => item.id === "withholding-treaty",
    );

    expect(rule(initial, "R12")?.triggered).toBe(true);
    expect(rule(result, "R12")?.triggered).toBe(false);
    expect(before?.status).toBe("Professional review required");
    expect(after?.status).toBe("Not covered by the current MVP rule pack");
  });

  it("assigns rule IDs after parsing model output", () => {
    const parsed = modelMissingFactQuestionSchema.parse({
      id: "rights",
      factPath: "serviceComponents.ipRightsTransferred",
      prompt: "Are rights transferred?",
      reason: "Rights affect the treaty review.",
      affectedRuleIds: ["R1"],
    });
    expect(parsed).not.toHaveProperty("affectedRuleIds");
    expect(createMissingFactQuestion(parsed).affectedRuleIds).toEqual(["R12"]);

    expect(
      createMissingFactQuestion({
        id: "business-location",
        factPath: "customer.businessLocation",
        prompt: "Where is the business located?",
        reason: "Location affects the B2B route.",
      }).affectedRuleIds,
    ).toEqual(expect.arrayContaining(["R6", "R7", "R9"]));
  });

  it("renders short text, select and boolean controls by answerType", () => {
    const make = (
      factPath:
        | "customer.vatId"
        | "customer.locationEvidence"
        | "customer.vatIdVerified",
    ) =>
      createMissingFactQuestion({
        id: factPath,
        factPath,
        prompt: factPath,
        reason: "Test",
      });
    const render = (question: MissingFactQuestion) =>
      renderToStaticMarkup(
        <MissingFactAnswerControl
          question={question}
          value=""
          onChange={() => undefined}
          onApply={() => undefined}
        />,
      );

    expect(render(make("customer.vatId"))).toContain('type="text"');
    expect(render(make("customer.locationEvidence"))).toContain("<select");
    expect(render(make("customer.vatIdVerified"))).toContain(">Yes</button>");
    expect(render(make("customer.vatIdVerified"))).toContain(">No</button>");
  });

  it("keeps a short-text question open when the answer does not close the fact", () => {
    const question = createMissingFactQuestion({
      id: "business-location",
      factPath: "customer.businessLocation",
      prompt: "Where is the business established?",
      reason: "The country is required.",
    });
    const initial = evaluateTransaction(
      germanyInput,
      withQuestion(question),
      createGermanyViesResult(),
    );

    expect(() =>
      answerMissingFact(initial, question.id, "not-a-country"),
    ).toThrow(/two-letter country code/i);
    expect(
      initial.normalizedTransaction.missingFactQuestions.map((item) => item.id),
    ).toContain(question.id);
  });
});
