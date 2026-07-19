function errorStatus(error: unknown) {
  if (!error || typeof error !== "object" || !("status" in error)) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

type CodedOpenAIError = Error & {
  taxGraphCode: string;
  taxGraphRetryable: boolean;
};

export function createCodedOpenAIError(code: string, retryable: boolean) {
  return Object.assign(new Error(code), {
    taxGraphCode: code,
    taxGraphRetryable: retryable,
  }) as CodedOpenAIError;
}

export function isOpenAITimeoutError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const constructorName = error.constructor?.name;
  return (
    error.name === "AbortError" ||
    error.name === "APIConnectionTimeoutError" ||
    error.name === "APIUserAbortError" ||
    constructorName === "APIConnectionTimeoutError" ||
    constructorName === "APIUserAbortError" ||
    /timed?\s*out/i.test(error.message)
  );
}

export function classifyOpenAIError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "taxGraphCode" in error &&
    typeof (error as { taxGraphCode?: unknown }).taxGraphCode === "string"
  ) {
    return (error as { taxGraphCode: string }).taxGraphCode;
  }
  if (error instanceof Error && error.name === "ZodError") {
    return "OPENAI_NORMALIZATION_VALIDATION_ERROR";
  }
  if (isOpenAITimeoutError(error)) return "OPENAI_TIMEOUT_ERROR";
  const status = errorStatus(error);
  if (status === 401) return "OPENAI_AUTHENTICATION_ERROR";
  if (status === 403) return "OPENAI_PERMISSION_ERROR";
  if (status === 404) return "OPENAI_MODEL_OR_ENDPOINT_NOT_FOUND";
  if (status === 429) return "OPENAI_RATE_LIMIT_ERROR";
  if (status !== null && status >= 500) return "OPENAI_SERVICE_ERROR";
  if (status !== null && status >= 400) return "OPENAI_REQUEST_ERROR";
  return "OPENAI_STRUCTURED_OUTPUT_ERROR";
}

export function shouldRetryOpenAIError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "taxGraphRetryable" in error &&
    typeof (error as { taxGraphRetryable?: unknown }).taxGraphRetryable ===
      "boolean"
  ) {
    return (error as { taxGraphRetryable: boolean }).taxGraphRetryable;
  }
  if (isOpenAITimeoutError(error)) return false;
  const status = errorStatus(error);
  if (status === null) return true;
  return status === 408 || status >= 500;
}
