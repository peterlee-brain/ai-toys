import assert from "node:assert/strict";
import test from "node:test";
import { API_REQUEST_TYPE, type ApiResponse } from "../shared/api-protocol.ts";
import {
  handleApiMessage,
  performApiRequest,
} from "../shared/api-background.ts";

test("performs JSON requests against the configured API base", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const result = await performApiRequest(
    {
      type: API_REQUEST_TYPE,
      method: "POST",
      path: "/v1/translate",
      body: { selection: "word" },
    },
    {
      getBase: async () => "http://43.165.167.70:8080",
      fetchImpl: async (input, init) => {
        capturedUrl = String(input);
        capturedInit = init;
        return new Response(JSON.stringify({ translation: "词" }), {
          status: 200,
        });
      },
    }
  );

  assert.equal(capturedUrl, "http://43.165.167.70:8080/v1/translate");
  assert.equal(capturedInit?.method, "POST");
  assert.deepEqual(capturedInit?.headers, { "Content-Type": "application/json" });
  assert.equal(capturedInit?.body, JSON.stringify({ selection: "word" }));
  assert.deepEqual(result, { translation: "词" });
});

test("reports non-success API responses", async () => {
  await assert.rejects(
    performApiRequest(
      { type: API_REQUEST_TYPE, method: "GET", path: "/healthz" },
      {
        getBase: async () => "http://api.example",
        fetchImpl: async () => new Response("down", { status: 503 }),
      }
    ),
    /\/healthz failed: 503 down/
  );
});

test("keeps the message channel open and serializes success", async () => {
  const response = new Promise<ApiResponse>((resolve) => {
    const keepOpen = handleApiMessage(
      {
        type: API_REQUEST_TYPE,
        method: "GET",
        path: "/healthz",
      },
      resolve,
      async () => ({ status: "ok" })
    );
    assert.equal(keepOpen, true);
  });

  assert.deepEqual(await response, { ok: true, data: { status: "ok" } });
});

test("rejects a forged API path without executing it", () => {
  let executed = false;
  let response: ApiResponse | undefined;
  const keepOpen = handleApiMessage(
    { type: API_REQUEST_TYPE, method: "GET", path: "http://evil.example" },
    (value) => {
      response = value;
    },
    async () => {
      executed = true;
      return {};
    }
  );

  assert.equal(keepOpen, false);
  assert.equal(executed, false);
  assert.deepEqual(response, {
    ok: false,
    error: "Unsupported KeepMark API request",
  });
});
