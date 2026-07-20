export const API_REQUEST_TYPE = "KEEPMARK_API_REQUEST" as const;

export type ApiMethod = "GET" | "POST" | "PUT";
export type ApiPath =
  | "/healthz"
  | "/v1/translate"
  | "/v1/grammar"
  | "/v1/words/mark";

export interface ApiRequest {
  type: typeof API_REQUEST_TYPE;
  method: ApiMethod;
  path: ApiPath;
  body?: unknown;
}

export type ApiResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const ALLOWED_REQUESTS = new Set([
  "POST /v1/translate",
  "POST /v1/grammar",
  "PUT /v1/words/mark",
  "GET /healthz",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isApiRequestMessage(value: unknown): value is ApiRequest {
  if (!isRecord(value)) return false;
  if (value.type !== API_REQUEST_TYPE) return false;
  if (typeof value.method !== "string" || typeof value.path !== "string") {
    return false;
  }
  return ALLOWED_REQUESTS.has(`${value.method} ${value.path}`);
}

export function isApiResponse(value: unknown): value is ApiResponse {
  if (!isRecord(value) || typeof value.ok !== "boolean") return false;
  if (value.ok) return Object.hasOwn(value, "data");
  return typeof value.error === "string";
}
