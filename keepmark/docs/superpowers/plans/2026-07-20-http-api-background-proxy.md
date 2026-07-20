# KeepMark HTTP API Background Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every KeepMark API call work from HTTPS pages when the configured server is available only over HTTP by moving network I/O into the Manifest V3 Service Worker.

**Architecture:** UI contexts send a typed, allowlisted `KEEPMARK_API_REQUEST` through `chrome.runtime.sendMessage()`. The Service Worker validates the method/path pair, reads the configured base URL, performs `fetch()`, and returns a serializable result; no DOM iframe performs network access.

**Tech Stack:** TypeScript 5.7, WXT 0.20, Chrome Manifest V3 APIs, Node.js 22 built-in test runner.

## Global Constraints

- Keep the API base configurable to any `http://` or `https://` address.
- Keep `http://43.165.167.70:8080` as the default API base.
- Accept only `POST /v1/translate`, `POST /v1/grammar`, `PUT /v1/words/mark`, and `GET /healthz` through the background proxy.
- Keep `http://*/*` and `https://*/*` manifest host permissions.
- Do not change request payloads, response payloads, or unrelated UI/state behavior.
- Use no new npm test dependency; run TypeScript tests with Node.js 22.

---

### Task 1: Define and test the allowlisted runtime protocol

**Files:**
- Create: `keepmark/extension/shared/api-protocol.ts`
- Create: `keepmark/extension/tests/api-protocol.test.ts`
- Modify: `keepmark/extension/package.json`
- Modify: `keepmark/extension/tsconfig.json`

**Interfaces:**
- Consumes: no application interfaces; only serializable runtime-message values.
- Produces: `API_REQUEST_TYPE`, `ApiMethod`, `ApiPath`, `ApiRequest`, `ApiResponse<T>`, `isApiRequestMessage(value)`, and `isApiResponse(value)`.

- [ ] **Step 1: Write the failing protocol test**

Create `keepmark/extension/tests/api-protocol.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the protocol test and verify RED**

Working directory: `keepmark/extension`

Run: `node --test tests/api-protocol.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `shared/api-protocol.ts`.

- [ ] **Step 3: Implement the minimal protocol module**

Create `keepmark/extension/shared/api-protocol.ts`:

```ts
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
```

- [ ] **Step 4: Add the test command without adding dependencies**

In `keepmark/extension/package.json`, add this script while preserving all existing scripts:

```json
"test": "node --test tests/*.test.ts"
```

In `keepmark/extension/tsconfig.json`, keep browser typechecking focused on extension sources by changing `exclude` to:

```json
"exclude": ["dist", ".output", "node_modules", "tests"]
```

Also add this compiler option so Node-run TypeScript tests and WXT can share explicit source imports:

```json
"allowImportingTsExtensions": true
```

- [ ] **Step 5: Run the protocol test and verify GREEN**

Working directory: `keepmark/extension`

Run: `npm test`

Expected: 3 tests pass, 0 fail.

- [ ] **Step 6: Commit the protocol boundary**

```bash
git add keepmark/extension/shared/api-protocol.ts keepmark/extension/tests/api-protocol.test.ts keepmark/extension/package.json keepmark/extension/tsconfig.json
git commit -m "test: define KeepMark API message protocol"
```

---

### Task 2: Replace iframe transport with a tested runtime client

**Files:**
- Create: `keepmark/extension/shared/runtime-api-client.ts`
- Create: `keepmark/extension/tests/runtime-api-client.test.ts`
- Modify: `keepmark/extension/shared/api-content.ts`
- Modify: `keepmark/extension/shared/api-extension.ts`

**Interfaces:**
- Consumes: `ApiMethod`, `ApiPath`, `ApiRequest`, `ApiResponse<T>`, `API_REQUEST_TYPE`, and `isApiResponse` from Task 1.
- Produces: `runtimeApiFetch<T>(method, path, body?, sendMessage?)`, used by all typed API wrappers.

- [ ] **Step 1: Write the failing runtime-client tests**

Create `keepmark/extension/tests/runtime-api-client.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the runtime-client test and verify RED**

Working directory: `keepmark/extension`

Run: `node --test tests/runtime-api-client.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `shared/runtime-api-client.ts`.

- [ ] **Step 3: Implement the runtime-message client**

Create `keepmark/extension/shared/runtime-api-client.ts`:

```ts
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
  const response = await sendMessage({
    type: API_REQUEST_TYPE,
    method,
    path,
    body,
  });

  if (!isApiResponse(response)) {
    throw new Error("KeepMark API proxy returned an invalid response");
  }
  if (!response.ok) throw new Error(response.error);
  return response.data as T;
}
```

- [ ] **Step 4: Switch both typed API wrappers to runtime messaging**

In `keepmark/extension/shared/api-content.ts`, replace the `proxy-client` import with:

```ts
import { runtimeApiFetch } from "./runtime-api-client.ts";
```

Replace all three `proxyFetch` calls with `runtimeApiFetch`, and update the transport comment to:

```ts
/** Content-script API: requests are executed by the extension Service Worker. */
```

In `keepmark/extension/shared/api-extension.ts`, remove the `getApiBase` import and the entire `directFetch` function. Import `runtimeApiFetch` and use it for `translate`, `explainGrammar`, `recordMark`, and `healthCheck`:

```ts
import { runtimeApiFetch } from "./runtime-api-client.ts";

export async function translate(input: TranslateInput): Promise<TranslateOutput> {
  return runtimeApiFetch<TranslateOutput>("POST", "/v1/translate", input);
}

export async function explainGrammar(input: GrammarInput): Promise<GrammarOutput> {
  return runtimeApiFetch<GrammarOutput>("POST", "/v1/grammar", input);
}

export async function recordMark(input: MarkInput): Promise<MarkOutput> {
  return runtimeApiFetch<MarkOutput>("PUT", "/v1/words/mark", input);
}

export async function healthCheck(): Promise<{ status: string }> {
  return runtimeApiFetch<{ status: string }>("GET", "/healthz");
}
```

- [ ] **Step 5: Run the runtime-client tests and verify GREEN**

Working directory: `keepmark/extension`

Run: `npm test`

Expected: 6 tests pass, 0 fail.

- [ ] **Step 6: Run browser-source typechecking**

Working directory: `keepmark/extension`

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 7: Commit the runtime client**

```bash
git add keepmark/extension/shared/runtime-api-client.ts keepmark/extension/tests/runtime-api-client.test.ts keepmark/extension/shared/api-content.ts keepmark/extension/shared/api-extension.ts
git commit -m "refactor: route KeepMark API calls through runtime messaging"
```

---

### Task 3: Execute validated requests in the Service Worker

**Files:**
- Create: `keepmark/extension/shared/api-background.ts`
- Create: `keepmark/extension/tests/api-background.test.ts`
- Modify: `keepmark/extension/entrypoints/background.ts`

**Interfaces:**
- Consumes: `ApiRequest`, `ApiResponse`, `API_REQUEST_TYPE`, and `isApiRequestMessage` from Task 1; `getApiBase()` from the existing configuration module.
- Produces: `performApiRequest(request, dependencies?)` and `handleApiMessage(message, sendResponse, execute?)`; `background.ts` registers `handleApiMessage` with `chrome.runtime.onMessage`.

- [ ] **Step 1: Write the failing Service Worker tests**

Create `keepmark/extension/tests/api-background.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the Service Worker tests and verify RED**

Working directory: `keepmark/extension`

Run: `node --test tests/api-background.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `shared/api-background.ts`.

- [ ] **Step 3: Implement background fetching and message handling**

Create `keepmark/extension/shared/api-background.ts`:

```ts
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
  fetchImpl: fetch,
};

export async function performApiRequest(
  request: ApiRequest,
  dependencies: ApiFetchDependencies = defaultDependencies
): Promise<unknown> {
  const base = await dependencies.getBase();
  const init: RequestInit = { method: request.method, headers: {} };
  if (request.method !== "GET") {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(request.body ?? {});
  }

  const response = await dependencies.fetchImpl(`${base}${request.path}`, init);
  const text = await response.text().catch(() => "");
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

  if (!isApiRequestMessage(message)) {
    sendResponse({ ok: false, error: "Unsupported KeepMark API request" });
    return false;
  }

  void executeRequest(message)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      })
    );
  return true;
}
```

- [ ] **Step 4: Register the API handler in the Service Worker**

At the top of `keepmark/extension/entrypoints/background.ts`, add:

```ts
import { handleApiMessage } from "../shared/api-background.ts";
```

At the start of the existing `chrome.runtime.onMessage` listener, add:

```ts
if (handleApiMessage(message, sendResponse)) return true;
```

Keep the existing side-panel message branch after the API branch.

- [ ] **Step 5: Run the Service Worker tests and verify GREEN**

Working directory: `keepmark/extension`

Run: `npm test`

Expected: 10 tests pass, 0 fail.

- [ ] **Step 6: Run typechecking after wiring the Service Worker**

Working directory: `keepmark/extension`

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 7: Commit the Service Worker implementation**

```bash
git add keepmark/extension/shared/api-background.ts keepmark/extension/tests/api-background.test.ts keepmark/extension/entrypoints/background.ts
git commit -m "fix: proxy KeepMark HTTP requests in service worker"
```

---

### Task 4: Remove the iframe proxy and verify the production build

**Files:**
- Delete: `keepmark/extension/shared/proxy-client.ts`
- Delete: `keepmark/extension/entrypoints/proxy/main.ts`
- Delete: `keepmark/extension/entrypoints/proxy/index.html`
- Modify: `keepmark/extension/wxt.config.ts`
- Modify: `keepmark/extension/package.json`
- Modify: `keepmark/extension/package-lock.json`
- Include existing in-scope API integration: `keepmark/extension/entrypoints/content.ts`
- Include existing in-scope API integration: `keepmark/extension/entrypoints/popup/main.ts`
- Include existing in-scope API integration: `keepmark/extension/entrypoints/sidepanel/main.ts`
- Include existing in-scope API integration: `keepmark/extension/shared/state-logic.ts`
- Include existing in-scope API integration: `keepmark/extension/shared/types.ts`
- Regenerate if changed: `keepmark/extension/.wxt/types/paths.d.ts`

**Interfaces:**
- Consumes: the completed runtime client and Service Worker handler from Tasks 2 and 3.
- Produces: a production extension bundle with no iframe proxy entrypoint and no web-accessible proxy resources.

- [ ] **Step 1: Update metadata for the Service Worker transport**

In `keepmark/extension/package.json`, change the description to:

```json
"description": "KeepMark · 留标 — HTTP via extension Service Worker proxy"
```

Keep the root `version` and `packages[""]` version in `keepmark/extension/package-lock.json` aligned with the existing extension version `0.1.6`.

- [ ] **Step 2: Remove iframe-only manifest exposure**

Delete the entire `web_accessible_resources` property from `keepmark/extension/wxt.config.ts`. Preserve these host permissions unchanged:

```ts
host_permissions: ["http://*/*", "https://*/*"],
```

- [ ] **Step 3: Delete the unused iframe implementation**

Delete exactly these files:

```text
keepmark/extension/shared/proxy-client.ts
keepmark/extension/entrypoints/proxy/main.ts
keepmark/extension/entrypoints/proxy/index.html
```

- [ ] **Step 4: Run the full automated verification suite**

Working directory: `keepmark/extension`

Run: `npm test`

Expected: 10 tests pass, 0 fail.

Run: `npm run typecheck`

Expected: exit code 0 with no TypeScript errors.

Run: `npm run build`

Expected: WXT reports a successful Chrome MV3 build and exits with code 0.

- [ ] **Step 5: Verify the built manifest and content bundle**

Working directory: `keepmark/extension`

Run:

```bash
node -e 'const m=require("./dist/chrome-mv3/manifest.json"); if (!m.host_permissions?.includes("http://*/*") || !m.host_permissions?.includes("https://*/*")) process.exit(1); if (m.web_accessible_resources) process.exit(2)'
```

Expected: exit code 0.

Run:

```bash
rg -n "keepmark-api-proxy|proxy\.html|43\.165\.167\.70:8080/v1/translate" dist/chrome-mv3/content-scripts dist/chrome-mv3/chunks
```

Expected: no matches and `rg` exit code 1.

Run:

```bash
rg -n "KEEPMARK_API_REQUEST|43\.165\.167\.70:8080" dist/chrome-mv3/background.js dist/chrome-mv3/chunks
```

Expected: matches occur in background output/config chunks, confirming the runtime protocol and default base are bundled outside the content script.

- [ ] **Step 6: Inspect the final scoped diff**

Run from the repository root:

```bash
git diff --check -- keepmark/extension keepmark/docs/superpowers/plans/2026-07-20-http-api-background-proxy.md
git status --short -- keepmark/extension keepmark/docs/superpowers/plans/2026-07-20-http-api-background-proxy.md
```

Expected: no whitespace errors; only the planned KeepMark files plus pre-existing user changes are listed.

- [ ] **Step 7: Commit cleanup and the implementation plan**

```bash
git add keepmark/extension/wxt.config.ts keepmark/extension/package.json keepmark/extension/package-lock.json keepmark/extension/.wxt/types/paths.d.ts keepmark/extension/entrypoints/content.ts keepmark/extension/entrypoints/popup/main.ts keepmark/extension/entrypoints/sidepanel/main.ts keepmark/extension/shared/state-logic.ts keepmark/extension/shared/types.ts keepmark/docs/superpowers/plans/2026-07-20-http-api-background-proxy.md
git commit -m "chore: remove obsolete KeepMark iframe proxy"
```

## Manual Browser Check

1. Open `chrome://extensions`, reload the unpacked extension from `keepmark/extension/dist/chrome-mv3`, and refresh the HTTPS test page.
2. Open the KeepMark popup and confirm the API address is `http://43.165.167.70:8080` or save that value again if an older address is stored.
3. On an HTTPS English page, select a word and confirm the translation popover receives API data.
4. Confirm the page console has no Mixed Content error for `/v1/translate`.
5. Use “测试连接” in the popup and confirm `/healthz` succeeds through the same Service Worker transport.
