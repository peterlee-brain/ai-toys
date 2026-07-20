import assert from "node:assert/strict";
import test from "node:test";
import { API_REQUEST_TYPE, type ApiRequest } from "../shared/api-protocol.ts";
import { runtimeApiFetch } from "../shared/runtime-api-client.ts";

test("sends a structured request through extension runtime messaging", async () => {
  let captured: ApiRequest | undefined;
  const result = await runtimeApiFetch<{ translation: string }>(
    "POST",
    "/v1/translate",
    { selection: "word", sentence: "A word." },
    async (message) => {
      captured = message;
      return { ok: true, data: { translation: "词" } };
    }
  );

  assert.deepEqual(captured, {
    type: API_REQUEST_TYPE,
    method: "POST",
    path: "/v1/translate",
    body: { selection: "word", sentence: "A word." },
  });
  assert.deepEqual(result, { translation: "词" });
});

test("throws a background error as an Error", async () => {
  await assert.rejects(
    runtimeApiFetch(
      "GET",
      "/healthz",
      undefined,
      async () => ({ ok: false, error: "backend unavailable" })
    ),
    /backend unavailable/
  );
});

test("rejects malformed runtime responses", async () => {
  await assert.rejects(
    runtimeApiFetch(
      "GET",
      "/healthz",
      undefined,
      async () => ({ status: "ok" })
    ),
    /invalid response/
  );
});
