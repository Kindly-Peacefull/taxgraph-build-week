import { describe, expect, it } from "vitest";
import {
  componentCategoryLabel,
  componentCountLabel,
} from "@/components/taxgraph-app";

describe("component copy", () => {
  it("pluralizes transaction-flow and decomposition counts", () => {
    expect(componentCountLabel(1, true)).toBe("1 service component");
    expect(componentCountLabel(2, true)).toBe("2 service components");
    expect(componentCountLabel(1)).toBe("1 component");
    expect(componentCountLabel(2)).toBe("2 components");
  });

  it("preserves the SaaS acronym in component cards", () => {
    expect(componentCategoryLabel("saas-access")).toBe("SaaS access");
  });
});
