# X 未回关按钮高亮 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在用户自己的 X Following 列表中，只为已确认未回关账号的原生 Following 控件增加醒目样式，同时保持控件行为、权限和只读安全边界不变。

**Architecture:** 在 `content.js` 中增加三个可独立测试的 DOM 辅助函数，精确识别 Following 控件、同步单卡片高亮并统一清理高亮。现有扫描循环在每次解析卡片时调用同步函数，现有停止生命周期负责清理；CSS 只覆盖专用类，不注册事件或改变点击区域。

**Tech Stack:** Chrome Extension Manifest V3、原生 JavaScript、原生 CSS、`MutationObserver`、Node.js `node:test`，无第三方依赖或构建步骤。

## Global Constraints

- 只处理当前登录账号自己的 `https://x.com/<handle>/following` 页面。
- 不自动点击、关注、取消关注或滚动。
- 不新增权限、后台脚本、X API、外部请求、遥测或远程资源。
- 不改变 X 控件的文字、事件监听器、可访问性属性、禁用状态或点击区域。
- 只接受完整控件文字匹配，不用子串或模糊匹配。
- 卡片无法解析、互相关注、暂停扫描或离开页面时不得残留高亮。
- 保持源码无构建步骤并可直接作为 unpacked extension 重新加载。

---

## File Map

- `x-non-followback/src/content.js`：新增 Following 控件识别、高亮同步和清理函数；接入扫描与运行时停止生命周期。
- `x-non-followback/src/styles.css`：新增 `.x-nfb-following-highlight` 的深浅主题样式，不改变布局和交互。
- `x-non-followback/tests/content.test.js`：覆盖精确文案、卡片复用、扫描同步、暂停与路由离开清理。
- `x-non-followback/tests/styles.test.js`：静态验证高亮样式存在且没有点击区域或交互覆盖属性。
- `x-non-followback/tests/manual-fixture.html`：加入真实按钮节点并在本地夹具中同步两枚未回关按钮高亮。
- `x-non-followback/manifest.json`：版本从 `0.1.0` 更新为 `0.2.0`，权限和内容脚本声明不变。
- `x-non-followback/README.md`：说明原列表高亮、手动点击边界和重新加载步骤。
- `x-non-followback/memory-bank/architecture.md`：记录卡片装饰与生命周期清理职责。
- `x-non-followback/memory-bank/progress.md`：记录实现和验证证据。

---

### Task 1: 精确识别并同步单卡片高亮

**Files:**
- Modify: `x-non-followback/src/content.js:1-111`
- Modify: `x-non-followback/tests/content.test.js:1-240`

**Interfaces:**
- Consumes: `coreApi.normalizeText(value): string` 与 `Account.followsBack: boolean`。
- Produces: `findFollowingControl(cell, coreApi): Element | null`。
- Produces: `clearFollowingHighlights(root): void`。
- Produces: `syncFollowingHighlight(cell, account, coreApi): Element | null`。
- Produces: exported constant value through behavior only; CSS class name remains exactly `x-nfb-following-highlight`.

- [ ] **Step 1: 在测试中增加可观察的假控件与假卡片**

在 `tests/content.test.js` 顶部辅助函数区域加入：

```js
function createClassList() {
  const values = new Set();
  return {
    add(value) { values.add(value); },
    remove(value) { values.delete(value); },
    contains(value) { return values.has(value); }
  };
}

function createFollowingCell(controlTexts) {
  const controls = controlTexts.map((innerText) => ({
    innerText,
    textContent: innerText,
    classList: createClassList()
  }));
  return {
    controls,
    querySelectorAll(selector) {
      if (selector === 'button,[role="button"]') return controls;
      if (selector === '.x-nfb-following-highlight') {
        return controls.filter((control) => control.classList.contains('x-nfb-following-highlight'));
      }
      return [];
    }
  };
}
```

- [ ] **Step 2: 写控件精确匹配的失败测试**

```js
test('finds exact English and Chinese following controls only', () => {
  for (const label of ['Following', '正在关注', '已关注', '正在跟隨', '跟隨中']) {
    const cell = createFollowingCell(['More', label]);
    assert.equal(content.findFollowingControl(cell, core), cell.controls[1]);
  }

  for (const label of ['Follow', '关注', '跟随', 'Following account details', '']) {
    assert.equal(content.findFollowingControl(createFollowingCell([label]), core), null);
  }
});
```

- [ ] **Step 3: 写同步与虚拟节点复用的失败测试**

```js
test('adds highlight only for non-followbacks and removes stale highlight', () => {
  const cell = createFollowingCell(['Following']);
  const control = cell.controls[0];

  assert.equal(content.syncFollowingHighlight(cell, { followsBack: false }, core), control);
  assert.equal(control.classList.contains('x-nfb-following-highlight'), true);

  content.syncFollowingHighlight(cell, { followsBack: true }, core);
  assert.equal(control.classList.contains('x-nfb-following-highlight'), false);

  content.syncFollowingHighlight(cell, { followsBack: false }, core);
  content.syncFollowingHighlight(cell, null, core);
  assert.equal(control.classList.contains('x-nfb-following-highlight'), false);
});
```

- [ ] **Step 4: 运行定向测试并确认 API 缺失失败**

Run:

```bash
cd x-non-followback
node --test --test-name-pattern="following controls|adds highlight" tests/content.test.js
```

Expected: FAIL，提示 `findFollowingControl` 或 `syncFollowingHighlight` 不是函数。

- [ ] **Step 5: 在 `content.js` 实现最小纯 DOM API**

在常量区域和 `createStorageAdapter` 之前加入：

```js
  const FOLLOWING_HIGHLIGHT_CLASS = 'x-nfb-following-highlight';
  const FOLLOWING_CONTROL_LABELS = new Set([
    'following',
    '正在关注',
    '已关注',
    '正在跟隨',
    '跟隨中'
  ]);

  function clearFollowingHighlights(root) {
    const highlighted = root?.querySelectorAll?.(`.${FOLLOWING_HIGHLIGHT_CLASS}`) || [];
    for (const control of highlighted) control.classList?.remove(FOLLOWING_HIGHLIGHT_CLASS);
  }

  function findFollowingControl(cell, coreApi) {
    const controls = cell?.querySelectorAll?.('button,[role="button"]') || [];
    for (const control of controls) {
      const text = coreApi?.normalizeText(control?.innerText ?? control?.textContent ?? '');
      if (FOLLOWING_CONTROL_LABELS.has(text)) return control;
    }
    return null;
  }

  function syncFollowingHighlight(cell, account, coreApi) {
    clearFollowingHighlights(cell);
    if (!account || account.followsBack !== false) return null;
    const control = findFollowingControl(cell, coreApi);
    control?.classList?.add(FOLLOWING_HIGHLIGHT_CLASS);
    return control || null;
  }
```

把三个函数加入 `publicApi`：

```js
    findFollowingControl,
    clearFollowingHighlights,
    syncFollowingHighlight,
```

- [ ] **Step 6: 运行定向测试和内容脚本测试**

Run:

```bash
node --test --test-name-pattern="following controls|adds highlight" tests/content.test.js
node --test tests/content.test.js
node --check src/content.js
```

Expected: 定向测试和全部内容脚本测试 PASS，语法检查退出 0。

- [ ] **Step 7: 提交纯 DOM API**

```bash
git add x-non-followback/src/content.js x-non-followback/tests/content.test.js
git commit -m "feat(x-non-followback): identify following controls"
```

---

### Task 2: 接入扫描与运行时清理生命周期

**Files:**
- Modify: `x-non-followback/src/content.js:130-545`
- Modify: `x-non-followback/tests/content.test.js:40-503`

**Interfaces:**
- Consumes: `syncFollowingHighlight(cell, account, coreApi)` 与 `clearFollowingHighlights(root)` from Task 1。
- Produces: 扫描时同步按钮高亮；`stopCellObserver(current)` 保证暂停、错误、清空、主节点替换和路由离开时清理高亮。

- [ ] **Step 1: 扩展运行时假文档以支持高亮查询**

把 `createRuntimeHarness()` 的 `document.querySelectorAll` 改为按选择器返回：

```js
    querySelectorAll(selector) {
      if (selector === 'main [data-testid="UserCell"]') return this.cells;
      if (selector === '.x-nfb-following-highlight') {
        return this.cells.flatMap((cell) => cell.querySelectorAll?.(selector) || []);
      }
      throw new Error(`unexpected selector: ${selector}`);
    }
```

为本任务新增运行时卡片辅助函数：

```js
function createRuntimeCell({ name, handle, followsYou = false, controlText = 'Following' }) {
  const base = createFollowingCell([controlText]);
  return {
    ...base,
    innerText: `${name}\n@${handle}\n${followsYou ? 'Follows you\n' : ''}${controlText}`,
    querySelectorAll(selector) {
      if (selector === 'a[href]') return [{ getAttribute: () => `/${handle}` }];
      return base.querySelectorAll(selector);
    },
    querySelector() { return null; }
  };
}
```

- [ ] **Step 2: 写扫描同步和虚拟节点复用失败测试**

```js
test('runtime highlights non-followbacks and clears reused mutual cells', async () => {
  const harness = createRuntimeHarness();
  const cell = createRuntimeCell({ name: 'Ada', handle: 'ada' });
  harness.document.cells = [cell];

  await harness.controller.reconcileRoute();
  await harness.timers.runNextBatch();
  assert.equal(cell.controls[0].classList.contains('x-nfb-following-highlight'), true);

  cell.innerText = 'Grace\n@grace\nFollows you\nFollowing';
  cell.querySelectorAll = (selector) => {
    if (selector === 'a[href]') return [{ getAttribute: () => '/grace' }];
    return selector === 'button,[role="button"]' ? cell.controls
      : cell.controls.filter((control) => control.classList.contains('x-nfb-following-highlight'));
  };
  FakeMutationObserver.instances[0].callback();
  await harness.timers.runNextBatch();

  assert.equal(cell.controls[0].classList.contains('x-nfb-following-highlight'), false);
});
```

- [ ] **Step 3: 写暂停和路由离开清理失败测试**

```js
test('runtime clears highlights on pause and route departure', async () => {
  const harness = createRuntimeHarness();
  const cell = createRuntimeCell({ name: 'Ada', handle: 'ada' });
  harness.document.cells = [cell];

  await harness.controller.reconcileRoute();
  await harness.timers.runNextBatch();
  assert.equal(cell.controls[0].classList.contains('x-nfb-following-highlight'), true);

  harness.panelActions.onToggleEnabled(false);
  assert.equal(cell.controls[0].classList.contains('x-nfb-following-highlight'), false);

  harness.panelActions.onToggleEnabled(true);
  await harness.timers.runNextBatch();
  assert.equal(cell.controls[0].classList.contains('x-nfb-following-highlight'), true);

  harness.location.href = 'https://x.com/home';
  await harness.controller.reconcileRoute();
  assert.equal(cell.controls[0].classList.contains('x-nfb-following-highlight'), false);
});
```

- [ ] **Step 4: 运行测试并确认扫描和清理断言失败**

Run:

```bash
node --test --test-name-pattern="runtime highlights|clears highlights" tests/content.test.js
```

Expected: FAIL，因为运行时尚未调用同步和清理函数。

- [ ] **Step 5: 把高亮同步接入完整卡片批次**

在 `scanVisibleCells(current)` 的解析调用之后、无效卡片分支之前加入：

```js
        const account = core.parseUserSnapshot(snapshot);
        syncFollowingHighlight(cell, account, core);
        if (!account) {
```

同步必须位于内容签名的 `continue` 之前，确保相同文本的可见卡片也能恢复正确样式。

- [ ] **Step 6: 把统一清理接入停止观察器**

在 `stopCellObserver(current)` 的最后加入：

```js
      clearFollowingHighlights(document);
```

现有调用链会覆盖暂停、存储错误、结构异常、清空、`<main>` 替换、路由离开和 `pagehide`。不要新增按钮事件监听器。

- [ ] **Step 7: 运行内容脚本完整测试并提交**

Run:

```bash
node --test tests/content.test.js
node --check src/content.js
```

Expected: 全部 PASS。

```bash
git add x-non-followback/src/content.js x-non-followback/tests/content.test.js
git commit -m "feat(x-non-followback): highlight non-followback controls"
```

---

### Task 3: 添加视觉样式、夹具和用户文档

**Files:**
- Modify: `x-non-followback/src/styles.css:1-203`
- Create: `x-non-followback/tests/styles.test.js`
- Modify: `x-non-followback/tests/manual-fixture.html:1-63`
- Modify: `x-non-followback/manifest.json:1-28`
- Modify: `x-non-followback/README.md:1-82`
- Modify: `x-non-followback/memory-bank/architecture.md:1-37`
- Modify: `x-non-followback/memory-bank/progress.md:1-24`

**Interfaces:**
- Consumes: `.x-nfb-following-highlight` class from Task 1。
- Produces: 不改变布局或点击区域的橙红色视觉高亮；直接重新加载的扩展版本 `0.2.0`。

- [ ] **Step 1: 写 CSS 安全边界失败测试**

创建 `tests/styles.test.js`：

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('following highlight is visible without changing hit area or interaction', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');
  const match = css.match(/\.x-nfb-following-highlight\s*\{([^}]+)\}/);
  assert.ok(match, 'highlight rule must exist');
  assert.match(match[1], /outline:/);
  assert.match(match[1], /box-shadow:/);
  assert.match(match[1], /background-color:/);
  assert.doesNotMatch(match[1], /pointer-events|position|transform|width|height/);
});
```

- [ ] **Step 2: 运行样式测试并确认规则缺失失败**

Run: `node --test tests/styles.test.js`

Expected: FAIL with `highlight rule must exist`。

- [ ] **Step 3: 添加不改变布局的高亮 CSS**

在 `src/styles.css` 面板规则之前加入：

```css
.x-nfb-following-highlight {
  color: rgb(180, 69, 0) !important;
  background-color: rgba(255, 122, 0, 0.14) !important;
  border-color: rgb(255, 122, 0) !important;
  outline: 3px solid rgba(255, 122, 0, 0.9) !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 4px rgba(255, 122, 0, 0.18), 0 0 18px rgba(255, 122, 0, 0.38) !important;
}

.x-nfb-following-highlight:focus-visible {
  outline-color: rgb(29, 155, 240) !important;
  box-shadow: 0 0 0 5px rgba(29, 155, 240, 0.28), 0 0 18px rgba(255, 122, 0, 0.38) !important;
}

@media (prefers-color-scheme: dark) {
  .x-nfb-following-highlight {
    color: rgb(255, 183, 107) !important;
    background-color: rgba(255, 122, 0, 0.2) !important;
  }
}
```

- [ ] **Step 4: 把手工夹具改成带真实按钮的卡片并调用同步 API**

每个夹具卡片使用个人主页链接和按钮，例如：

```html
<div data-testid="UserCell">
  <a href="/one_way">One Way<br>@one_way</a>
  <button type="button">Following</button>
</div>
```

在 `core.js` 与 `panel.js` 之间加载 `content.js`：

```html
<script src="../src/content.js"></script>
```

面板首次渲染后同步夹具卡片：

```js
for (const cell of document.querySelectorAll('[data-testid="UserCell"]')) {
  const snapshot = XNonFollowbackContent.snapshotFromCell(cell);
  const account = XNonFollowbackCore.parseUserSnapshot(snapshot);
  XNonFollowbackContent.syncFollowingHighlight(cell, account, XNonFollowbackCore);
}
```

夹具中三个互关按钮不得高亮，`one_way` 与 `another` 两个按钮必须高亮。

- [ ] **Step 5: 更新版本、README 和 memory bank**

把 `manifest.json` 的版本改为：

```json
"version": "0.2.0"
```

README 使用步骤增加：未回关账号的原生 Following 按钮会呈橙红色高亮，点击仍由用户和 X 原页面处理；修改后需要在 `chrome://extensions` 刷新扩展并刷新 X 页面。

`memory-bank/architecture.md` 增加“页面装饰”段落，记录精确按钮匹配、虚拟节点复用同步与停止时清理。`memory-bank/progress.md` 记录按钮高亮、测试数量和真实 X 验收仍待用户重新加载。

- [ ] **Step 6: 运行样式、Manifest 和全量测试**

Run:

```bash
node --test tests/styles.test.js
node --test tests/*.test.js
node --check src/core.js
node --check src/panel.js
node --check src/content.js
node -e "JSON.parse(require('node:fs').readFileSync('manifest.json', 'utf8'))"
```

Expected: 全部测试 PASS，语法与 Manifest 检查退出 0。

- [ ] **Step 7: 提交样式、夹具和文档**

```bash
git add x-non-followback/src/styles.css x-non-followback/tests/styles.test.js x-non-followback/tests/manual-fixture.html x-non-followback/manifest.json x-non-followback/README.md x-non-followback/memory-bank/architecture.md x-non-followback/memory-bank/progress.md
git commit -m "docs(x-non-followback): document highlighted controls"
```

---

### Task 4: 最终安全门禁与本地视觉验收

**Files:**
- Modify only if evidence changes: `x-non-followback/memory-bank/progress.md`

**Interfaces:**
- Consumes: 完整扩展 `0.2.0`。
- Produces: 可在 Chrome 中重新加载的已验证目录，不自动执行任何账号动作。

- [ ] **Step 1: 运行最终自动化门禁**

Run from `x-non-followback/`:

```bash
node --test tests/*.test.js
node --check src/core.js
node --check src/panel.js
node --check src/content.js
node -e "JSON.parse(require('node:fs').readFileSync('manifest.json', 'utf8'))"
git diff --check
```

Expected: 测试全部 PASS；语法、Manifest 与差异检查退出 0。

- [ ] **Step 2: 运行权限和禁止行为检查**

```bash
rg -n "fetch\(|XMLHttpRequest|WebSocket|sendBeacon|chrome\.tabs|chrome\.cookies|\.click\(|scroll(To|By|IntoView)?\(" src manifest.json
rg -n '"permissions"|"host_permissions"|"matches"|"version"' manifest.json
```

Expected: 第一条命令无匹配；第二条只显示版本 `0.2.0`、`storage` 和 `https://x.com/*` 所在字段。

- [ ] **Step 3: 在本地夹具做视觉验收**

使用本地静态服务器打开 `tests/manual-fixture.html`，验证：

- 5 个账号仍显示在页面中；
- 只有 `one_way` 与 `another` 的 Following 按钮呈橙红色高亮；
- 三个带 `Follows you / 关注了你 / 跟隨你` 标记的按钮保持原样；
- 按钮尺寸和位置不变；
- 面板仍显示已扫描 5、未回关 2；
- 浏览器控制台无错误。

- [ ] **Step 4: 记录证据并提交（仅在进度文档有变化时）**

在 `memory-bank/progress.md` 写入实际测试数量、静态检查和夹具结果，明确真实 X 页面需用户在 `chrome://extensions` 重新加载后验证。

```bash
git add x-non-followback/memory-bank/progress.md
git commit -m "chore(x-non-followback): record highlight verification"
```

- [ ] **Step 5: 交付重新加载步骤**

向用户提供：打开 `chrome://extensions`，点击“X 未回关置顶”的刷新图标，再刷新自己的 X Following 页面并手动向下滚动。明确高亮只改变外观，点击和取关请求仍由 X 原页面处理。
