import { describe, expect, it } from "vitest";
import {
  classifyOpenAIError,
  createCodedOpenAIError,
  shouldRetryOpenAIError,
} from "@/lib/openai-safety";

describe("OpenAI error safety", () => {
  it("classifies authentication failures without exposing provider details", () => {
    const error = Object.assign(new Error("credential detail"), {
      status: 401,
    });
    expect(classifyOpenAIError(error)).toBe("OPENAI_AUTHENTICATION_ERROR");
    expect(shouldRetryOpenAIError(error)).toBe(false);
  });

  it("does not immediately retry quota or bad-request failures", () => {
    expect(shouldRetryOpenAIError({ status: 429 })).toBe(false);
    expect(shouldRetryOpenAIError({ status: 400 })).toBe(false);
  });

  it("allows one route-level retry for validation and transient service failures", () => {
    expect(shouldRetryOpenAIError(new Error("invalid structured output"))).toBe(
      true,
    );
    expect(shouldRetryOpenAIError({ status: 503 })).toBe(true);
  });

  it("preserves only application-owned structured-output diagnostics", () => {
    const error = createCodedOpenAIError(
      "OPENAI_MAX_OUTPUT_TOKENS_REACHED",
      false,
    );
    expect(classifyOpenAIError(error)).toBe("OPENAI_MAX_OUTPUT_TOKENS_REACHED");
    expect(shouldRetryOpenAIError(error)).toBe(false);
  });
});
