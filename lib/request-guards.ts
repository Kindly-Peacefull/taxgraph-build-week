export class RequestGuardError extends Error {
  constructor(
    readonly status: 400 | 403 | 413 | 415,
    message: string,
  ) {
    super(message);
    this.name = "RequestGuardError";
  }
}

function isJsonContentType(value: string | null) {
  return value?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function readGuardedJson(request: Request, maximumBytes: number) {
  if (!isJsonContentType(request.headers.get("content-type"))) {
    throw new RequestGuardError(415, "Content-Type must be application/json.");
  }
  if (!hasSameOrigin(request)) {
    throw new RequestGuardError(403, "Cross-origin API requests are rejected.");
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > maximumBytes) {
    throw new RequestGuardError(
      413,
      `The request body exceeds the ${maximumBytes}-byte limit.`,
    );
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maximumBytes) {
    throw new RequestGuardError(
      413,
      `The request body exceeds the ${maximumBytes}-byte limit.`,
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RequestGuardError(400, "The request body must be valid JSON.");
  }
}

export function scenarioInputCharacterCount(value: unknown): number {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value)) {
    return value.reduce(
      (total, item) => total + scenarioInputCharacterCount(item),
      0,
    );
  }
  if (value && typeof value === "object") {
    return Object.values(value).reduce(
      (total, item) => total + scenarioInputCharacterCount(item),
      0,
    );
  }
  return 0;
}
