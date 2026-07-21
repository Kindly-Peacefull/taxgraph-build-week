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
const exportedAt = "2026-07-20T14:37:00.000Z";

describe("adviser brief", () => {
  it.each(fixtures)("renders the $label fixture", ({ label, analysis }) => {
    const html = renderToStaticMarkup(
      createElement(AdviserBrief, { analysis, exportedAt }),
    );

    expect(html).toContain("TaxGraph Adviser Brief");
    expect(html).toContain(label);
    expect(html).toContain("Component decomposition");
    expect(html).toContain("Tax touchpoints");
  });

  it("contains the research disclaimer and complete source register", () => {
    const html = renderToStaticMarkup(
      createElement(AdviserBrief, {
        analysis: fixtures[0].analysis,
        exportedAt,
      }),
    );

    expect(html).toContain("This brief is not a tax opinion");
    expect(html).toContain("Source register");
    expect(html).toContain("Sources reviewed · non-binding");
    expect(html).not.toContain("Pending human review");
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

  it("includes a validated narrative summary only when one is cached", () => {
    const narrativeText = Array.from(
      { length: 150 },
      (_, index) => `summary${index + 1}`,
    ).join(" ");
    const analysis = {
      ...fixtures[0].analysis,
      narrativeSummary: {
        sentences: [{ text: narrativeText, sourceIds: ["S1"] }],
        generatedAt: "2026-07-20T00:00:00.000Z",
        model: "configured-model",
      },
    };
    const html = renderToStaticMarkup(
      createElement(AdviserBrief, { analysis, exportedAt }),
    );

    expect(html).toContain("Narrative summary");
    expect(html).toContain("summary150");
    expect(html).toContain("[S1]");
  });

  it("uses export time and sentence-case component labels", () => {
    const analysis = {
      ...fixtures[0].analysis,
      generatedAt: "2026-07-20T00:00:00.000Z",
    };
    const html = renderToStaticMarkup(
      createElement(AdviserBrief, { analysis, exportedAt }),
    );

    expect(html).toContain("20 Jul 2026, 14:37 UTC");
    expect(html).not.toContain("20 Jul 2026, 00:00 UTC");
    expect(html).toContain("SaaS access");
    expect(html).not.toContain("Saas Access");
  });
});
