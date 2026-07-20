# KeepMark HTTP API Background Proxy Design

## Context

KeepMark currently defaults to `http://43.165.167.70:8080` and allows the API base URL to be changed in the extension popup. Requests initiated by the content script are forwarded to a hidden `chrome-extension://` iframe. When that iframe is embedded in an HTTPS page, its HTTP `fetch()` is still subject to mixed-content checks inherited from the secure ancestor, so Chrome blocks the request before it reaches the API.

## Goals

- Allow KeepMark to call the configured API from HTTPS pages when the API is available only over HTTP.
- Keep the API base URL configurable to any `http://` or `https://` address.
- Keep `http://43.165.167.70:8080` as the default.
- Route translation, grammar, word-marking, and health-check requests through the extension Service Worker.
- Prevent page-triggered messages from turning the extension into an arbitrary URL fetch proxy.
- Preserve the existing popup, content-script, and side-panel behavior outside the request transport.

## Non-goals

- Provisioning TLS, a domain name, or a reverse proxy for the API server.
- Supporting URL schemes other than HTTP and HTTPS.
- Changing API request or response payloads.
- Refactoring unrelated KeepMark UI and state code.

## Chosen Architecture

Use the Manifest V3 Service Worker as the only component that performs API network requests.

The content script, popup, and side panel send a structured `KEEPMARK_API_REQUEST` message through `chrome.runtime.sendMessage()`. The Service Worker validates the method/path pair, reads the user-configured API base URL from `chrome.storage.local`, performs `fetch()`, and sends a serializable success or error response.

The client message contains only a method, a known relative API path, and an optional JSON body. It never contains the API base URL or a complete target URL. The Service Worker accepts only these pairs:

- `POST /v1/translate`
- `POST /v1/grammar`
- `PUT /v1/words/mark`
- `GET /healthz`

The manifest retains `http://*/*` and `https://*/*` host permissions because the API address is intentionally user-configurable.

## Components

### API protocol

A small shared module defines the request/response message types and validates the method/path allowlist. Its validation functions do not depend on browser globals, so Node's built-in test runner can exercise them directly.

### Runtime API client

A shared client converts the existing typed API calls into runtime messages. It unwraps successful responses and throws an `Error` for rejected requests, network failures, non-2xx responses, and malformed background responses. Both content-script and extension-page API wrappers use this client, giving every UI surface one transport.

### Service Worker handler

`background.ts` registers a `chrome.runtime.onMessage` handler for API messages in addition to its existing side-panel handler. The API branch validates the request before performing network I/O, returns `true` to keep the asynchronous response channel open, and converts thrown errors to plain error strings.

The fetch implementation constructs the final URL from the stored base plus a validated relative path, sends JSON for non-GET methods, checks `response.ok`, and parses a non-empty JSON response. The configured base continues to be normalized by the existing configuration module.

### Removed iframe transport

The hidden iframe client and the `proxy.html` entrypoint are removed after all consumers use runtime messaging. The manifest no longer exposes `proxy.html` or generated chunks as web-accessible resources.

## Data Flow

1. A user selects English text on an HTTP or HTTPS page.
2. The content script calls the typed translation API wrapper.
3. The runtime client sends `KEEPMARK_API_REQUEST` to the extension Service Worker.
4. The Service Worker validates `POST /v1/translate`.
5. The Service Worker reads the configured base URL, currently defaulting to `http://43.165.167.70:8080`.
6. The Service Worker performs the HTTP request from the extension background context.
7. The result is returned through the runtime message response and rendered by the content script.

## Error Handling

- Unsupported method/path pairs fail before network access.
- Runtime messaging failures surface as normal `Error` instances to existing UI catch blocks.
- Non-2xx API responses include the endpoint path, status code, and response text in the error.
- Empty successful responses resolve to an empty object, matching the current behavior.
- A previously saved API base remains authoritative over the default; the popup can overwrite it.

## Testing and Verification

Use Node 22's built-in test runner against TypeScript files, avoiding a new test dependency. Tests cover:

- accepting every supported method/path pair;
- rejecting arbitrary paths, full URLs, and mismatched methods;
- sending requests through runtime messaging instead of a DOM iframe;
- unwrapping success responses and propagating background errors.

Run these checks after implementation:

1. `npm test`
2. `npm run typecheck`
3. `npm run build`
4. Inspect the built manifest to confirm host permissions remain and `proxy.html` is no longer web-accessible.
5. Inspect built content-script output to confirm the iframe transport and direct HTTP URL are absent.

Manual browser verification loads the unpacked build, keeps the default API base, opens an HTTPS English page, selects text, and confirms the translation request succeeds without a Mixed Content console error.

## Security Considerations

Broad host permissions are necessary for a user-configurable API host and will produce the corresponding Chrome permission warning. The background handler limits the resulting privilege by accepting only known relative endpoints and by reading the base URL from extension storage rather than from content-script messages. HTTPS remains preferable when the server can eventually provide it, because HTTP responses can be observed or modified on the network.
