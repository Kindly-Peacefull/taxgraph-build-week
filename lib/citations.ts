import type {
  Claim,
  SourceReference,
  TaxTouchpoint,
  TouchpointStatus,
} from "@/lib/domain";
import { isReviewedSource } from "@/lib/source-pack";

const substantiveStatus = new Set<TouchpointStatus>([
  "Likely applicable",
  "Likely not applicable",
  "Illustrative only",
]);

const prohibitedUnsourcedPatterns = [
  /\bvat (?:is|shall|must|applies|payable)\b/i,
  /\breverse charge (?:applies|is required)\b/i,
  /\bplace of supply (?:is|shall be)\b/i,
  /\bwithholding (?:tax )?(?:is|applies|rate)\b/i,
  /\btax rate\b/i,
  /\bmust register\b/i,
];

export function canonicalizeQuote(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateRenderedQuote(
  renderedQuote: string,
  source: SourceReference,
) {
  if (canonicalizeQuote(renderedQuote) !== canonicalizeQuote(source.excerpt)) {
    throw new Error(`Rendered quote does not match ${source.id} exactly.`);
  }
  return true;
}

export function validateClaim(
  claim: Claim,
  sources: SourceReference[],
  options: { substantive?: boolean; authoritative?: boolean } = {},
) {
  const sourceMap = new Map(sources.map((source) => [source.id, source]));

  if (options.substantive && claim.sourceIds.length === 0) {
    throw new Error(`Substantive claim ${claim.id} has no legal source.`);
  }

  if (claim.unsourced) {
    if (claim.sourceIds.length > 0) {
      throw new Error(`Unsourced claim ${claim.id} cannot have source IDs.`);
    }
    if (
      prohibitedUnsourcedPatterns.some((pattern) => pattern.test(claim.text))
    ) {
      throw new Error(
        `Unsourced claim ${claim.id} contains a prohibited tax conclusion.`,
      );
    }
  }

  for (const sourceId of claim.sourceIds) {
    const source = sourceMap.get(sourceId);
    if (!source) {
      throw new Error(
        `Claim ${claim.id} refers to unknown source ${sourceId}.`,
      );
    }
    if (source.status !== "found") {
      throw new Error(
        `Claim ${claim.id} cannot use unavailable source ${sourceId}.`,
      );
    }
    if (options.authoritative && !isReviewedSource(source)) {
      throw new Error(
        `Claim ${claim.id} cannot be authoritative while ${sourceId} is pending.`,
      );
    }
  }

  return true;
}

export function validateTouchpointClaims(
  touchpoint: TaxTouchpoint,
  sources: SourceReference[],
) {
  const isSubstantive =
    substantiveStatus.has(touchpoint.status) ||
    touchpoint.sourceIds.length > 0 ||
    touchpoint.triggeredRuleIds.length > 0;
  const authoritative =
    touchpoint.reviewState === "Reviewed" &&
    touchpoint.status !== "Pending human review";

  for (const claim of touchpoint.claims) {
    validateClaim(claim, sources, {
      substantive: isSubstantive && !claim.unsourced,
      authoritative,
    });
  }

  if (
    (touchpoint.status === "Likely applicable" ||
      touchpoint.status === "Likely not applicable") &&
    touchpoint.sourceIds.length === 0
  ) {
    throw new Error(
      `${touchpoint.status} requires a valid source on ${touchpoint.id}.`,
    );
  }

  return true;
}
