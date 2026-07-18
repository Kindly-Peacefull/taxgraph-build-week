import {
  scenarioDiffSchema,
  type AnalysisResult,
  type RuleId,
  type ScenarioDiff,
} from "@/lib/domain";

const pathRules: Record<string, RuleId[]> = {
  "customer.country": ["R1", "R3", "R4", "R5", "R6", "R7", "R11", "R12"],
  "customer.type": ["R1", "R3", "R6", "R7", "R9", "R10", "R11"],
  "customer.vatId": ["R7", "R8", "R9"],
  "commercialArrangement.deliveryChannel": ["R2", "R4"],
  "commercialArrangement.standardPackage": ["R2", "R10"],
  serviceComponents: ["R1", "R2", "R3", "R6", "R7", "R10", "R11", "R12"],
};

function comparable(result: AnalysisResult, path: string): unknown {
  if (path === "customer.country")
    return result.normalizedTransaction.customer.country;
  if (path === "customer.type")
    return result.normalizedTransaction.customer.type;
  if (path === "customer.vatId")
    return result.normalizedTransaction.customer.vatId;
  if (path === "commercialArrangement.deliveryChannel") {
    return result.normalizedTransaction.commercialArrangement.deliveryChannel;
  }
  if (path === "commercialArrangement.standardPackage") {
    return result.normalizedTransaction.commercialArrangement.standardPackage;
  }
  if (path === "serviceComponents") {
    return result.normalizedTransaction.serviceComponents.map((item) => ({
      id: item.id,
      category: item.category,
      automationLevel: item.automationLevel,
      humanInvolvement: item.humanInvolvement,
      ipRightsTransferred: item.ipRightsTransferred,
    }));
  }
  return undefined;
}

export function compareAnalyses(
  oldResult: AnalysisResult,
  newResult: AnalysisResult,
): ScenarioDiff {
  const changedInputs = Object.entries(pathRules).flatMap(([path, rules]) => {
    const oldValue = comparable(oldResult, path);
    const newValue = comparable(newResult, path);
    return JSON.stringify(oldValue) === JSON.stringify(newValue)
      ? []
      : [{ path, oldValue, newValue, affectedRuleIds: rules }];
  });

  const oldTouchpoints = new Map(
    oldResult.taxTouchpoints.map((item) => [item.id, item]),
  );
  const changedTouchpoints: ScenarioDiff["changedTouchpoints"] = [];
  const unchangedTouchpoints: string[] = [];

  for (const current of newResult.taxTouchpoints) {
    const previous = oldTouchpoints.get(current.id);
    if (!previous || previous.status !== current.status) {
      changedTouchpoints.push({
        id: current.id,
        topic: current.topic,
        oldStatus: previous?.status ?? "Insufficient information",
        newStatus: current.status,
        affectedRuleIds: Array.from(
          new Set([
            ...(previous?.triggeredRuleIds ?? []),
            ...current.triggeredRuleIds,
          ]),
        ),
      });
    } else {
      unchangedTouchpoints.push(current.id);
    }
  }

  const affectedRules = Array.from(
    new Set([
      ...changedInputs.flatMap((item) => item.affectedRuleIds),
      ...changedTouchpoints.flatMap((item) => item.affectedRuleIds),
    ]),
  );

  return scenarioDiffSchema.parse({
    changedInputs,
    affectedRules,
    changedTouchpoints,
    unchangedTouchpoints,
    claims: [
      {
        id: "scenario-diff-summary",
        text: `${changedInputs.length} material input groups change ${changedTouchpoints.length} touchpoint statuses between the two fixtures.`,
        sourceIds: [],
        evidenceRefs: [
          `analysis:${oldResult.normalizedTransaction.id}`,
          `analysis:${newResult.normalizedTransaction.id}`,
        ],
        unsourced: true,
      },
    ],
    generatedAt: "2026-07-19T00:00:00.000Z",
  });
}
