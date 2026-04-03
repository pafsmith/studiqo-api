/** Normalized API error matching OpenAPI `Error` (`{ error: string }`) when present. */

export class StudiqoApiError extends Error {
  override readonly name = "StudiqoApiError";

  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
  }
}

export function isStudiqoApiError(value: unknown): value is StudiqoApiError {
  return value instanceof StudiqoApiError;
}

function messageFromErrorField(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "error" in error &&
    typeof (error as { error: unknown }).error === "string"
  ) {
    return (error as { error: string }).error;
  }
  if (typeof error === "string" && error.length > 0) {
    return error;
  }
  return fallback || "Request failed";
}

/** Throws {@link StudiqoApiError} when `response` is not OK (openapi-fetch already consumed the body into `error`). */
export function throwIfStudiqoError(result: {
  data?: unknown;
  error?: unknown;
  response: Response;
}): void {
  if (result.response.ok) {
    return;
  }
  const message = messageFromErrorField(
    result.error,
    result.response.statusText,
  );
  throw new StudiqoApiError(result.response.status, message, result.error);
}

export function unwrapStudiqoResponse<T>(result: {
  data?: T;
  error?: unknown;
  response: Response;
}): T {
  throwIfStudiqoError(result);
  return result.data as T;
}

export function unwrapStudiqoVoid(result: {
  data?: unknown;
  error?: unknown;
  response: Response;
}): void {
  throwIfStudiqoError(result);
}
