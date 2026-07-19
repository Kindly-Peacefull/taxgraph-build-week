import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdviserBrief, validateAdviserBrief } from "@/components/adviser-brief";
import { evaluateTransaction } from "@/lib/engine";
import {
  createFranceTransaction,
  createFranceViesResult,
  createGermanyTransaction,
  createGermanyViesResult,
  franceInput,
  germanyInput,
} from "@/lib/fixtures";

const fixtures = [
  {
    label: "France B2C",
    analysis: evaluateTransaction(
      franceInput,
      createFranceTransaction(),
      createFranceViesResult(),
    ),
  },
  {
    label: "Germany B2B",
    analysis: evaluateTransaction(
      germanyInput,
      createGermanyTransaction(),
      createGermanyViesResult(),
    ),
  },
];

describe("adviser brief", () => {
  it.each(fixtures)("renders the $label fixture", ({ label, analysis }) => {
    const html = renderToStaticMarkup(
      createElement(AdviserBrief, { analysis }),
    );

    expect(html).toContain("TaxGraph Adviser Brief");
    expect(html).toContain(label);
    expect(html).toContain("Component decomposition");
    expect(html).toContain("Tax touchpoints");
  });

  it("contains the research disclaimer and complete source register", () => {
    const html = renderToStaticMarkup(
      createElement(AdviserBrief, { analysis: fixtures[0].analysis }),
    );

    expect(html).toContain("This brief is not a tax opinion");
    expect(html).toContain("Source register");
    for (const source of fixtures[0].analysis.sourceReferences) {
      expect(html).toContain(source.id);
      expect(html).toContain(source.title);
    }
  });

  it("keeps source IDs on every substantive touchpoint claim", () => {
    for (const { analysis } of fixtures) {
      expect(validateAdviserBrief(analysis)).toBe(true);
      for (const touchpoint of analysis.taxTouchpoints) {
        const substantive =
          touchpoint.sourceIds.length > 0 ||
          touchpoint.triggeredRuleIds.length > 0;
        if (!substantive) continue;
        for (const claim of touchpoint.claims.filter(
          (item) => !item.unsourced,
        )) {
          expect(claim.sourceIds.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
