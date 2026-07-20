import {
  API_REQUEST_TYPE,
  isApiResponse,
  type ApiMethod,
  type ApiPath,
  type ApiRequest,
} from "./api-protocol.ts";

export type RuntimeMessageSender = (message: ApiRequest) => Promise<unknown>;

const sendWithChrome: RuntimeMessageSender = (message) =>
  chrome.runtime.sendMessage(message);

export async function runtimeApiFetch<T>(
  method: ApiMethod,
  path: ApiPath,
  body?: unknown,
  sendMessage: RuntimeMessageSender = sendWithChrome
): Promise<T> {
  console.log(`[KeepMark runtime] sending ${method} ${path}`);
  const response = await sendMessage({
    type: API_REQUEST_TYPE,
    method,
    path,
    body,
  });
  console.log(`[KeepMark runtime] received response`, response);

  if (!isApiResponse(response)) {
    throw new Error("KeepMark API proxy returned an invalid response");
  }
  if (!response.ok) throw new Error(response.error);
  return response.data as T;
}
