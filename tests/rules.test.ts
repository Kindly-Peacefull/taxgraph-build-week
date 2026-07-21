import { describe, expect, it } from "vitest";
import type { SourceReference } from "@/lib/domain";
import { evaluateTransaction } from "@/lib/engine";
import {
  createFranceTransaction,
  createFranceViesResult,
  createGermanyTransaction,
  createGermanyViesResult,
  franceInput,
  germanyInput,
} from "@/lib/fixtures";
import { answerMissingFact } from "@/lib/rerun";
import { loadRulePack, loadSourcePack } from "@/lib/source-pack";

function getRule(result: ReturnType<typeof evaluateTransaction>, id: string) {
  return result.analysisTrace.ruleEvaluations.find(
    (rule) => rule.ruleId === id,
  );
}

describe("R1-R12 deterministic engine", () => {
  it("loads only R1-R12", () => {
    expect(loadRulePack().map((rule) => rule.id)).toEqual([
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
  });

  it("fires a rule only when conditions match", () => {
    const france = evaluateTransaction(
      franceInput,
      createFranceTransaction(),
      createFranceViesResult(),
    );
    const germany = evaluateTransaction(
      germanyInput,
      createGermanyTransaction(),
      createGermanyViesResult(),
    );

    expect(getRule(france, "R1")?.triggered).toBe(true);
    expect(getRule(germany, "R1")?.triggered).toBe(false);
    expect(getRule(germany, "R7")?.triggered).toBe(true);
    expect(getRule(france, "R7")?.triggered).toBe(false);
  });

  it("creates an unresolved condition when ESS facts are unknown", () => {
    const transaction = createFranceTransaction();
    transaction.serviceComponents = transaction.serviceComponents.map(
      (item) => ({
        ...item,
        automationLevel: "unknown",
        humanInvolvement: "unknown",
        deliveryMode: "mixed",
      }),
    );
    const result = evaluateTransaction(
      franceInput,
      transaction,
      createFranceViesResult(),
    );

    expect(getRule(result, "R1")?.triggered).toBe(false);
    expect(getRule(result, "R1")?.unresolvedConditions).toContain(
      "ESS classification",
    );
  });

  it("keeps the France reporting route verifiable when EU establishment is unknown", () => {
    const transaction = createFranceTransaction();
    transaction.seller.euFixedEstablishment = null;

    const result = evaluateTransaction(
      franceInput,
      transaction,
      createFranceViesResult(),
    );
    const reporting = result.taxTouchpoints.find(
      (item) => item.id === "registration-reporting",
    );

    expect(getRule(result, "R3")?.triggered).toBe(false);
    expect(reporting?.status).toBe("Requires verification");
    expect(reporting?.sourceIds).toContain("S9");
  });

  it("disables R11 and prevents it from firing when S13 is unavailable", () => {
    const sources: SourceReference[] = loadSourcePack().map((source) =>
      source.id === "S13"
        ? { ...source, status: "access_failed" as const }
        : source,
    );
    const result = evaluateTransaction(
      franceInput,
      createFranceTransaction(),
      createFranceViesResult(),
      { sources },
    );

    expect(getRule(result, "R11")?.enabled).toBe(false);
    expect(getRule(result, "R11")?.triggered).toBe(false);
    expect(getRule(result, "R11")?.disabledReason).toContain("S13");
  });

  it("allows reviewed S13 to support a non-draft R11 status", () => {
    const result = evaluateTransaction(
      franceInput,
      createFranceTransaction(),
      createFranceViesResult(),
    );
    expect(getRule(result, "R11")?.outputStatus).toBe("Likely applicable");
  });

  it("allows reviewed S4 and S12 to support a non-draft R7 status", () => {
    const result = evaluateTransaction(
      germanyInput,
      createGermanyTransaction(),
      createGermanyViesResult(),
    );
    expect(getRule(result, "R7")?.outputStatus).toBe("Likely applicable");
  });

  it("keeps found-but-pending S13 output draft-only", () => {
    const sources: SourceReference[] = loadSourcePack().map((source) =>
      source.id === "S13"
        ? { ...source, humanReviewStatus: "pending" as const }
        : source,
    );
    const result = evaluateTransaction(
      franceInput,
      createFranceTransaction(),
      createFranceViesResult(),
      { sources },
    );
    expect(getRule(result, "R11")?.outputStatus).toBe("Pending human review");
  });

  it("reruns without GPT and identifies a changed touchpoint", () => {
    const initial = evaluateTransaction(
      franceInput,
      createFranceTransaction(),
      createFranceViesResult(),
    );
    const { result, diff } = answerMissingFact(
      initial,
      "fr-location-evidence",
      "bank_location",
    );

    expect(result.analysisTrace.rerunWithoutGpt).toBe(true);
    expect(diff.changedTouchpoints.map((item) => item.id)).toContain(
      "location-evidence",
    );
    expect(
      result.taxTouchpoints.find((item) => item.id === "location-evidence")
        ?.status,
    ).toBe("Likely applicable");
  });
});
