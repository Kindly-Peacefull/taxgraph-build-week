import rawRules from "@/data/rules/rules.json";
import rawSources from "@/data/sources/sources.json";
import {
  rulePackSchema,
  sourcePackSchema,
  type RuleId,
  type SourceReference,
  type TaxRule,
} from "@/lib/domain";

const expectedRuleIds: RuleId[] = [
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
];

export function loadSourcePack(): SourceReference[] {
  const sources = sourcePackSchema.parse(rawSources);
  const ids = new Set<string>();

  for (const source of sources) {
    if (ids.has(source.id)) {
      throw new Error(`Duplicate source ID: ${source.id}`);
    }
    ids.add(source.id);
  }

  return sources;
}

export function loadRulePack(sources = loadSourcePack()): TaxRule[] {
  const rules = rulePackSchema.parse(rawRules);
  const actualRuleIds = rules.map((rule) => rule.id).sort();
  const requiredRuleIds = [...expectedRuleIds].sort();

  if (JSON.stringify(actualRuleIds) !== JSON.stringify(requiredRuleIds)) {
    throw new Error("The rule pack must contain R1–R12 exactly once.");
  }

  const sourceMap = new Map(sources.map((source) => [source.id, source]));
  for (const rule of rules) {
    for (const sourceId of rule.sourceIds) {
      const source = sourceMap.get(sourceId);
      if (!source) {
        throw new Error(`Rule ${rule.id} links unknown source ${sourceId}.`);
      }
      if (!source.linkedRules.includes(rule.id)) {
        throw new Error(
          `Source ${sourceId} does not link back to rule ${rule.id}.`,
        );
      }
    }
  }

  return rules;
}

export function getSourceMap(sources = loadSourcePack()) {
  return new Map(sources.map((source) => [source.id, source]));
}

export function isReviewedSource(source: SourceReference) {
  return (
    source.status === "found" &&
    (source.humanReviewStatus === "reviewed" ||
      source.humanReviewStatus === "approved")
  );
}

export function isAvailableSource(source: SourceReference) {
  return source.status === "found";
}
