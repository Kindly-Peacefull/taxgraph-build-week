import { describe, expect, it } from "vitest";
import {
  canonicalizeQuote,
  validateClaim,
  validateRenderedQuote,
  validateTouchpointClaims,
} from "@/lib/citations";
import type { TaxTouchpoint } from "@/lib/domain";
import { loadSourcePack } from "@/lib/source-pack";

const sources = loadSourcePack();

describe("citation gate", () => {
  it("rejects a substantive claim without a legal source", () => {
    expect(() =>
      validateClaim(
        { id: "bad", text: "A tax conclusion", sourceIds: [] },
        sources,
        { substantive: true },
      ),
    ).toThrow(/no legal source/);
  });

  it("allows transaction facts to use evidence references", () => {
    expect(
      validateClaim(
        {
          id: "fact",
          text: "The scenario records a French consumer.",
          sourceIds: [],
          evidenceRefs: ["form:customer.type"],
          unsourced: true,
        },
        sources,
      ),
    ).toBe(true);
  });

  it("rejects an unknown source ID", () => {
    expect(() =>
      validateClaim(
        { id: "unknown", text: "Claim", sourceIds: ["S999"] },
        sources,
      ),
    ).toThrow(/unknown source/);
  });

  it("rejects authoritative use of a pending source", () => {
    expect(() =>
      validateClaim(
        { id: "pending", text: "Claim", sourceIds: ["S1"] },
        sources,
        { substantive: true, authoritative: true },
      ),
    ).toThrow(/cannot be authoritative/);
  });

  it("rejects Likely applicable without a valid source", () => {
    const touchpoint: TaxTouchpoint = {
      id: "bad-touchpoint",
      topic: "Bad output",
      jurisdiction: "EU",
      status: "Likely applicable",
      claims: [
        {
          id: "fact-only",
          text: "A scenario observation.",
          sourceIds: [],
          evidenceRefs: ["form:test"],
          unsourced: true,
        },
      ],
      triggeredRuleIds: [],
      sourceIds: [],
      missingFacts: [],
      confidence: 0.5,
      professionalReviewRequired: false,
      reviewState: "No legal claim",
    };
    expect(() => validateTouchpointClaims(touchpoint, sources)).toThrow(
      /requires a valid source/,
    );
  });

  it("passes canonical exact quote matching after whitespace normalization", () => {
    const source = sources[0];
    expect(
      validateRenderedQuote(
        `  ${source.excerpt.replaceAll(" ", "  ")}  `,
        source,
      ),
    ).toBe(true);
    expect(canonicalizeQuote("A\u00a0B")).toBe("A B");
  });

  it("rejects an altered quote", () => {
    const source = sources[0];
    expect(() =>
      validateRenderedQuote(`${source.excerpt} altered`, source),
    ).toThrow(/does not match/);
  });

  it("rejects an unsourced substantive tax phrase", () => {
    expect(() =>
      validateClaim(
        {
          id: "unsafe-ui-text",
          text: "VAT is payable in France.",
          sourceIds: [],
          unsourced: true,
        },
        sources,
      ),
    ).toThrow(/prohibited tax conclusion/);
  });
});
