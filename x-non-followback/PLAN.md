# Historical X Non-Followback Panel Implementation Plan (Superseded)

> **Status:** This is the completed `0.1.0` panel implementation history. Its visible-panel, pause, clear, and panel-based acceptance requirements were superseded on 2026-08-02. Do not use them as the current product contract.
>
> Current requirements: [`../docs/superpowers/specs/2026-08-02-x-non-followback-silent-highlight-design.md`](../docs/superpowers/specs/2026-08-02-x-non-followback-silent-highlight-design.md).
> Current implementation plan: [`../docs/superpowers/plans/2026-08-02-x-non-followback-silent-highlight.md`](../docs/superpowers/plans/2026-08-02-x-non-followback-silent-highlight.md).

The historical plan below is preserved only as an implementation record.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local, read-only Chrome extension that collects accounts loaded on the logged-in user's X Following page and presents non-followbacks in a cached panel above the list.

**Architecture:** A Manifest V3 content script runs only on `x.com`, separates pure relationship/state logic from DOM extraction and panel rendering, and persists versioned per-account scan state in `chrome.storage.local`. It observes user cards already loaded by the user's scrolling and never triggers scrolling, network requests, follows, or unfollows.

**Tech Stack:** Manifest V3, dependency-free JavaScript, CSS, Chrome Storage API, Node.js built-in test runner.

## Global Constraints

- Only run on the logged-in user's own `https://x.com/<handle>/following` page.
- Request only `storage` and `https://x.com/*`; do not add `tabs`, cookies, OAuth, background workers, remote scripts, analytics, or external network access.
- Do not automate scrolling, clicking, following, or unfollowing.
- Persist only display name, handle, avatar URL, profile URL, relationship result, scan timestamp, and schema version in local extension storage.
- Treat results as partial until the user has manually scrolled through the desired portion of the Following list.
- Keep source dependency-free and directly inspectable; no build step.

---

## File Map

- `manifest.json`: Chrome extension metadata, minimal permissions, ordered content scripts.
- `src/core.js`: Pure route, normalization, parsing, deduplication, and cache validation functions shared by runtime and tests.
- `src/panel.js`: Creates and updates the isolated fixed panel; exposes a small controller API to `content.js`.
- `src/content.js`: Own-page guard, SPA route lifecycle, X user-card snapshot extraction, observation, persistence, and panel coordination.
- `src/styles.css`: Fixed panel, collapsed/expanded states, account rows, notices, and X light/dark theme styling.
- `tests/core.test.js`: Node tests for every pure decision that could misclassify or mix account data.
- `tests/manual-fixture.html`: Static X-like cards for manual panel and scanner smoke testing without account actions.
- `README.md`: Installation, usage, permissions, limitations, and troubleshooting.
- `AGENTS.md`: Project-local working rules and verification commands.
- `memory-bank/README.md`: Documentation index and source-of-truth map.
- `memory-bank/architecture.md`: Final component/data-flow contract derived from `memory-bank/design.md`.
- `memory-bank/tech-stack.md`: Runtime and dependency constraints.
- `memory-bank/implementation-plan.md`: Milestone state linked to this plan.
- `memory-bank/progress.md`: Completed work and verification evidence.
- `../README.md`: Add `x-non-followback` to the `ai-toys` project table.

---

### Task 1: Pure relationship and cache core

**Files:**
- Create: `src/core.js`
- Create: `tests/core.test.js`

**Interfaces:**
- `Account = { displayName: string, handle: string, avatarUrl: string, profileUrl: string, followsBack: boolean, seenAt?: number }`
- `ScanState = { version: 1, ownerHandle: string, accounts: Record<string, Account>, updatedAt: number }`
- Produces: `XNonFollowbackCore.normalizeText(value: unknown): string`
- Produces: `XNonFollowbackCore.getFollowingHandle(url: string): string | null`
- Produces: `XNonFollowbackCore.getHandleFromProfileHref(href: string): string | null`
- Produces: `XNonFollowbackCore.hasFollowBackMarker(text: string): boolean`
- Produces: `XNonFollowbackCore.parseUserSnapshot(snapshot): Account | null`
- Produces: `XNonFollowbackCore.mergeAccount(state, account, now): ScanState`
- Produces: `XNonFollowbackCore.sanitizeCache(value, expectedHandle): ScanState`

- [x] **Step 1: Write failing tests for routing, supported labels, parsing, deduplication, and cache isolation**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/core.js');

test('recognizes only a following route', () => {
  assert.equal(core.getFollowingHandle('https://x.com/0xpeterlee/following'), '0xpeterlee');
  assert.equal(core.getFollowingHandle('https://x.com/0xpeterlee/followers'), null);
});

test('recognizes English, simplified Chinese, and traditional Chinese followback labels', () => {
  assert.equal(core.hasFollowBackMarker('Follows you'), true);
  assert.equal(core.hasFollowBackMarker('关注了你'), true);
  assert.equal(core.hasFollowBackMarker('跟隨你'), true);
  assert.equal(core.hasFollowBackMarker('Following'), false);
});

test('parses an account and classifies absence of a marker as non-followback', () => {
  assert.deepEqual(core.parseUserSnapshot({
    text: 'Ada @ada Following',
    links: ['/ada'],
    imageUrl: 'https://pbs.twimg.com/profile_images/ada.jpg'
  }), {
    displayName: 'Ada', handle: 'ada', avatarUrl: 'https://pbs.twimg.com/profile_images/ada.jpg',
    profileUrl: 'https://x.com/ada', followsBack: false
  });
});
```

- [x] **Step 2: Run the tests and verify the missing module failure**

Run: `node --test tests/core.test.js`

Expected: FAIL because `src/core.js` does not exist.

- [x] **Step 3: Implement the dependency-free core API**

```js
(function exposeCore(global) {
  const CACHE_VERSION = 1;
  const FOLLOWBACK_MARKERS = ['follows you', '关注了你', '跟隨你'];

  function normalizeText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  }

  function hasFollowBackMarker(text) {
    return String(text ?? '')
      .split('\n')
      .map(normalizeText)
      .some((line) => FOLLOWBACK_MARKERS.includes(line));
  }

  const api = {
    CACHE_VERSION,
    normalizeText,
    getFollowingHandle,
    getHandleFromProfileHref,
    hasFollowBackMarker,
    parseUserSnapshot,
    mergeAccount,
    sanitizeCache
  };
  global.XNonFollowbackCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
```

Implement profile-link filtering so navigation/status/settings paths cannot become handles. `sanitizeCache` must return an empty state when the schema version or owner handle differs. `mergeAccount` must preserve one record per lowercase handle and update `updatedAt`.

- [x] **Step 4: Run the core tests**

Run: `node --test tests/core.test.js`

Expected: all tests PASS.

- [x] **Step 5: Run the syntax check and commit**

Run: `node --check src/core.js`

Commit: `feat(x-non-followback): add relationship scan core`

---

### Task 2: Fixed panel and scanner lifecycle

**Files:**
- Create: `src/panel.js`
- Create: `src/content.js`
- Create: `src/styles.css`
- Create: `tests/manual-fixture.html`
- Modify: `tests/core.test.js`

**Interfaces:**
- Consumes: every `XNonFollowbackCore` interface from Task 1.
- Produces: `XNonFollowbackPanel.mount(actions): PanelController`
- Produces: `PanelController.render({ ownerHandle, enabled, status, state, warning }): void`
- Produces: `PanelController.destroy(): void`
- Produces: runtime functions `reconcileRoute()`, `scanVisibleCells()`, `schedulePersist()`, and `stopRuntime()` inside `content.js`.

- [x] **Step 1: Extend pure tests for panel sorting and status summaries**

```js
test('sorts non-followbacks newest-first without mutating input', () => {
  const accounts = [
    { handle: 'old', followsBack: false, seenAt: 1 },
    { handle: 'mutual', followsBack: true, seenAt: 3 },
    { handle: 'new', followsBack: false, seenAt: 2 }
  ];
  assert.deepEqual(core.listNonFollowbacks(accounts).map((item) => item.handle), ['new', 'old']);
  assert.equal(accounts.length, 3);
});
```

- [x] **Step 2: Run the test and verify the new API failure**

Run: `node --test tests/core.test.js`

Expected: FAIL because `listNonFollowbacks` is not defined.

- [x] **Step 3: Implement the panel model helper and make the test pass**

Add `listNonFollowbacks(accounts)` to `src/core.js`; filter `followsBack === false`, copy the array, and sort descending by `seenAt`.

Run: `node --test tests/core.test.js`

Expected: all tests PASS.

- [x] **Step 4: Implement the panel controller**

`mount(actions)` must create one root node with id `x-non-followback-root`, use DOM methods and `textContent` rather than interpolating profile data into HTML, and wire only these explicit actions:

```js
const actions = {
  onToggleEnabled(nextEnabled) {},
  onToggleExpanded() {},
  onClearCurrentOwner() {}
};
```

The rendered panel must show `已扫描 N`、`未回关 M`, a partial-result notice, pause/continue, clear, collapse/expand, timestamp, warnings, and profile links using `target="_blank"` plus `rel="noreferrer"`. It must not render an unfollow button.

- [x] **Step 5: Implement own-page guarded DOM scanning**

Use `a[data-testid="AppTabBar_Profile_Link"]` to discover the logged-in handle and compare it case-insensitively with `getFollowingHandle(location.href)`. Observe `main` with `MutationObserver`, select `[data-testid="UserCell"]`, and convert each cell into this snapshot before calling the core parser:

```js
{
  text: cell.innerText,
  links: [...cell.querySelectorAll('a[href]')].map((link) => link.getAttribute('href')),
  imageUrl: cell.querySelector('img[src*="profile_images"]')?.src ?? ''
}
```

Use a `WeakMap` of DOM node to content signature so X can reuse virtual-list nodes and hydrate relationship text later. Debounce writes to `chrome.storage.local`, and stop/disconnect observers whenever the SPA route leaves the owner's Following page. Detect route changes without patching X functions by observing `document.documentElement` and comparing `location.href` on scheduled reconciliation.

- [x] **Step 6: Add resilient warnings and the local manual fixture**

After three consecutive scan rounds each contain at least five user cells and zero parseable handles, pause writes and render `页面结构可能已变化，已停止记录新结果`. Finish each batch and schedule any valid pending result before pausing. The fixture must contain one English mutual card, one simplified-Chinese mutual card, one traditional-Chinese mutual card, and two non-followback cards using `data-testid="UserCell"`.

- [x] **Step 7: Run automated and static checks, then commit**

Run:

```bash
node --test tests/core.test.js
node --check src/core.js
node --check src/panel.js
node --check src/content.js
```

Expected: all tests and syntax checks PASS.

Commit: `feat(x-non-followback): add read-only scan panel`

---

### Task 3: Manifest, project contract, and installation docs

**Files:**
- Create: `manifest.json`
- Create: `README.md`
- Create: `AGENTS.md`
- Create: `memory-bank/README.md`
- Create: `memory-bank/architecture.md`
- Create: `memory-bank/tech-stack.md`
- Create: `memory-bank/implementation-plan.md`
- Create: `memory-bank/progress.md`
- Modify: `../README.md`

**Interfaces:**
- Consumes: content-script order `src/core.js`, `src/panel.js`, `src/content.js` and stylesheet `src/styles.css`.
- Produces: a directly loadable extension directory and project-local maintenance instructions.

- [x] **Step 1: Create the minimal Manifest V3 definition**

```json
{
  "manifest_version": 3,
  "name": "X 未回关置顶",
  "version": "0.1.0",
  "description": "只读收集已加载的 X Following 卡片，并集中显示未回关账号。",
  "permissions": ["storage"],
  "host_permissions": ["https://x.com/*"],
  "content_scripts": [{
    "matches": ["https://x.com/*"],
    "js": ["src/core.js", "src/panel.js", "src/content.js"],
    "css": ["src/styles.css"],
    "run_at": "document_idle"
  }]
}
```

- [x] **Step 2: Add project documentation and repository registration**

Document exact Chrome installation steps (`chrome://extensions` → Developer mode → Load unpacked → choose `ai-toys/x-non-followback`), the supported X routes/languages, manual-scroll limitation, cache-clear behavior, minimal permissions, and troubleshooting for X DOM changes. Add an `x-non-followback` row to the root project table.

The memory bank must make `memory-bank/design.md` the product contract, this `PLAN.md` the task checklist, and the verification commands below the quality gate.

- [x] **Step 3: Validate manifest and repository content**

Run:

```bash
node -e "JSON.parse(require('node:fs').readFileSync('manifest.json', 'utf8'))"
rg -n "fetch\(|XMLHttpRequest|WebSocket|sendBeacon|chrome\.tabs|chrome\.cookies|\.click\(|scroll(To|By|IntoView)?\(" src manifest.json
git diff --check
```

Expected: manifest parse succeeds; the forbidden-capability search returns no matches; `git diff --check` succeeds.

- [x] **Step 4: Commit project packaging and documentation**

Commit: `docs(x-non-followback): add install and maintenance guide`

---

### Task 4: End-to-end verification and progress closeout

**Files:**
- Modify: `memory-bank/implementation-plan.md`
- Modify: `memory-bank/progress.md`
- Modify: `PLAN.md`

**Interfaces:**
- Consumes: complete extension directory from Tasks 1–3.
- Produces: verified release candidate with recorded evidence.

- [x] **Step 1: Run the complete automated gate**

Run:

```bash
node --test tests/core.test.js
node --check src/core.js
node --check src/panel.js
node --check src/content.js
node -e "JSON.parse(require('node:fs').readFileSync('manifest.json', 'utf8'))"
git diff --check
```

Expected: tests PASS, syntax checks and manifest parsing exit 0, and no whitespace errors.

- [x] **Step 2: Inspect permission and forbidden-behavior boundaries**

Run:

```bash
rg -n "fetch\(|XMLHttpRequest|WebSocket|sendBeacon|chrome\.tabs|chrome\.cookies|\.click\(|scroll(To|By|IntoView)?\(" src manifest.json
rg -n '"permissions"|"host_permissions"|"matches"' manifest.json
```

Expected: the first command has no matches; the second shows only `storage` and `https://x.com/*`.

- [ ] **Step 3: Perform manual Chrome acceptance**

Load the unpacked extension, open the logged-in user's own Following page, and verify: panel mount, count increases while the user scrolls, mutual accounts stay out of results, non-followbacks appear once, pause/resume works, refresh restores cache, clear removes only the current owner's cache, navigating away stops scanning, and no network request or account action is initiated by the extension.

- [x] **Step 4: Record evidence and close the plan**

Update `memory-bank/progress.md` with command outputs and any manual-test limitation. Mark completed checkboxes in `memory-bank/implementation-plan.md` and this file only for steps actually verified.

- [x] **Step 5: Commit verification closeout**

Commit: `chore(x-non-followback): record verification results`
