import assert from "node:assert/strict";
import test from "node:test";
import {
  API_REQUEST_TYPE,
  isApiRequestMessage,
  isApiResponse,
} from "../shared/api-protocol.ts";

test("accepts every supported KeepMark API method and path", () => {
  const supported = [
    ["POST", "/v1/translate"],
    ["POST", "/v1/grammar"],
    ["PUT", "/v1/words/mark"],
    ["GET", "/healthz"],
  ];

  for (const [method, path] of supported) {
    assert.equal(
      isApiRequestMessage({
        type: API_REQUEST_TYPE,
        method,
        path,
        body: { sample: true },
      }),
      true
    );
  }
});

test("rejects arbitrary URLs, unknown paths, and mismatched methods", () => {
  const rejected = [
    { method: "POST", path: "http://evil.example/data" },
    { method: "GET", path: "/v1/translate" },
    { method: "POST", path: "/admin" },
    { method: "DELETE", path: "/v1/translate" },
  ];

  for (const candidate of rejected) {
    assert.equal(
      isApiRequestMessage({ type: API_REQUEST_TYPE, ...candidate }),
      false
    );
  }
});

test("recognizes only serializable success and error responses", () => {
  assert.equal(isApiResponse({ ok: true, data: { status: "ok" } }), true);
  assert.equal(isApiResponse({ ok: false, error: "network failed" }), true);
  assert.equal(isApiResponse({ ok: false }), false);
  assert.equal(isApiResponse({ data: {} }), false);
});
