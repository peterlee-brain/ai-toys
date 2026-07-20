import { getApiBase } from "./config.ts";
import {
  API_REQUEST_TYPE,
  isApiRequestMessage,
  type ApiRequest,
  type ApiResponse,
} from "./api-protocol.ts";

export interface ApiFetchDependencies {
  getBase: () => Promise<string>;
  fetchImpl: typeof fetch;
}

const defaultDependencies: ApiFetchDependencies = {
  getBase: getApiBase,
  fetchImpl: fetch.bind(globalThis),
};

export async function performApiRequest(
  request: ApiRequest,
  dependencies: ApiFetchDependencies = defaultDependencies
): Promise<unknown> {
  const start = performance.now();
  const base = await dependencies.getBase();
  const init: RequestInit = { method: request.method, headers: {} };
  if (request.method !== "GET") {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(request.body ?? {});
  }

  console.log(`[KeepMark background] fetching ${request.method} ${request.path}`);
  const response = await dependencies.fetchImpl(`${base}${request.path}`, init);
  const text = await response.text().catch(() => "");
  const elapsed = Math.round(performance.now() - start);
  console.log(`[KeepMark background] fetch ${request.path} took ${elapsed}ms, status ${response.status}`);
  if (!response.ok) {
    throw new Error(
      `KeepMark API ${request.path} failed: ${response.status} ${text}`
    );
  }
  return text ? JSON.parse(text) : {};
}

type SendResponse = (response: ApiResponse) => void;
type ExecuteRequest = (request: ApiRequest) => Promise<unknown>;

export function handleApiMessage(
  message: unknown,
  sendResponse: SendResponse,
  executeRequest: ExecuteRequest = performApiRequest
): boolean {
  const isApiType =
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === API_REQUEST_TYPE;
  if (!isApiType) return false;

  console.log(`[KeepMark background] got API message`, message);
  if (!isApiRequestMessage(message)) {
    sendResponse({ ok: false, error: "Unsupported KeepMark API request" });
    return false;
  }

  void executeRequest(message)
    .then((data) => {
      console.log(`[KeepMark background] request success`, data);
      sendResponse({ ok: true, data });
    })
    .catch((error) => {
      console.error(`[KeepMark background] request failed`, error);
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  return true;
}
