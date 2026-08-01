# X 未回关静默高亮 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完全隐藏 X Following 页面右侧的扩展悬浮面板，同时保留静默扫描、本地缓存和未回关账号原生 Following 按钮高亮。

**Architecture:** 现有 `content.js`、`panel.js` 和缓存状态机保持不变；只在 `styles.css` 中让面板根节点 `#x-non-followback-root.x-nfb` 使用 `display: none !important`。静态测试锁定“面板不可见、按钮高亮规则仍存在”，README 与 memory-bank 同步描述静默模式。

**Tech Stack:** Chrome Extension Manifest V3、原生 JavaScript、原生 CSS、Node.js `node:test`，无第三方依赖或构建步骤。

## Global Constraints

- 只处理当前登录账号自己的 `https://x.com/<handle>/following` 页面。
- 不自动滚动、点击、关注或取消关注。
- 不新增权限、后台脚本、X API、外部网络请求、遥测或远程资源。
- 不改变 X 原生按钮的文字、事件监听器、可访问性属性、禁用状态或点击区域。
- 页面不显示扩展面板、徽标或额外操作控件，只显示未回关按钮高亮。
- 保持源码无构建步骤，可直接作为 unpacked extension 重新加载。

---

## File Map

- `x-non-followback/tests/styles.test.js`：锁定面板根节点不可见，继续验证按钮高亮不改变交互区域。
- `x-non-followback/src/styles.css`：隐藏面板根节点，保留原生按钮高亮规则。
- `x-non-followback/README.md`：改为静默扫描和 Chrome 重新加载说明。
- `x-non-followback/memory-bank/architecture.md`：记录面板控制器保留但根节点不可见的职责边界。
- `x-non-followback/memory-bank/progress.md`：记录静默模式实现与验证证据。

---

### Task 1: 隐藏悬浮面板并保持按钮高亮

**Files:**
- Modify: `x-non-followback/tests/styles.test.js`
- Modify: `x-non-followback/src/styles.css`
- Modify: `x-non-followback/README.md`
- Modify: `x-non-followback/memory-bank/architecture.md`
- Modify: `x-non-followback/memory-bank/progress.md`

**Interfaces:**
- Consumes: `panel.js` 已创建的 `<aside id="x-non-followback-root" class="x-nfb">` 根节点。
- Produces: CSS 规则 `#x-non-followback-root.x-nfb { display: none !important; }`；`.x-nfb-following-highlight` 规则保持可见且不改变点击区域。

- [ ] **Step 1: 写面板不可见的失败测试**

在 `tests/styles.test.js` 末尾加入：

```js
test('floating panel is hidden while silent button highlighting stays available', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');
  const panelRule = css.match(/#x-non-followback-root\.x-nfb\s*\{([^}]+)\}/);
  assert.ok(panelRule, 'panel root rule must exist');
  assert.match(panelRule[1], /display:\s*none\s*!important/);
  assert.match(css, /\.x-nfb-following-highlight\s*\{/);
});
```

- [ ] **Step 2: 运行定向测试并确认因缺少隐藏规则而失败**

Run:

```bash
cd x-non-followback
node --test --test-name-pattern="floating panel is hidden" tests/styles.test.js
```

Expected: FAIL，`display: none !important` 断言不匹配；失败原因不是语法或文件读取错误。

- [ ] **Step 3: 实现最小 CSS 隐藏规则**

在 `src/styles.css` 的 `#x-non-followback-root.x-nfb` 规则中，把 `display` 放在变量和定位规则之前：

```css
#x-non-followback-root.x-nfb {
  display: none !important;
  --x-nfb-bg: rgba(255, 255, 255, 0.96);
```

不修改 `.x-nfb-following-highlight`、`content.js` 或 `panel.js`。

- [ ] **Step 4: 运行定向测试并确认转绿**

Run:

```bash
node --test --test-name-pattern="floating panel is hidden" tests/styles.test.js
node --test tests/styles.test.js
```

Expected: 定向测试 PASS；两个样式测试全部 PASS。

- [ ] **Step 5: 同步用户文档与架构记录**

把 README 开头改为：

```markdown
一个本地、只读的 Chrome 扩展。你在自己的 X Following 页面正常向下滚动时，它会静默收集已经加载的账号，并把没有“关注了你 / Follows you”标记的账号原生 Following 按钮点亮；页面不会显示额外面板。
```

把 README“使用”段落改为：

```markdown
1. 打开自己账号的 Following 页面；扩展会在页面内静默运行，不显示悬浮面板。
2. 正常向下滚动列表；扩展只扫描 X 已经加载的账号。
3. 已确认未回关账号的原生 `Following / 正在关注` 按钮会显示橙红色描边、浅色背景和光晕；按钮行为仍完全由 X 处理。
4. 页面不再提供暂停或清空控件。离开 Following 页面或刷新页面时，运行时会自行停止和重建。
```

把“页面没有出现面板”常见问题替换为：

```markdown
### 页面没有出现悬浮面板

这是静默模式的预期行为。确认扩展版本为 `0.2.0`，然后观察未回关账号原生 Following 按钮是否出现橙红色高亮。
```

在 `memory-bank/architecture.md` 中明确 `panel.js` 仍维护内部状态 DOM，但其根节点由 CSS 隐藏；在 `memory-bank/progress.md` 中新增 2026-08-02 静默模式条目，并把本地夹具验收预期改为“0 个可见面板、2 个高亮按钮”。

- [ ] **Step 6: 运行完整验证**

Run:

```bash
node --test tests/*.test.js
node --check src/core.js
node --check src/panel.js
node --check src/content.js
node -e "JSON.parse(require('node:fs').readFileSync('manifest.json', 'utf8'))"
git diff --check
rg -n "fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|chrome\.tabs|chrome\.cookies|\.click\s*\(|scroll(?:To|By|IntoView)?\s*\(" src manifest.json
```

Expected: 41 项测试通过；三个语法检查、manifest 解析和 `git diff --check` 退出 0；禁止能力搜索无匹配并以状态 1 退出。

- [ ] **Step 7: 提交静默高亮实现**

```bash
git add x-non-followback/tests/styles.test.js x-non-followback/src/styles.css x-non-followback/README.md x-non-followback/memory-bank/architecture.md x-non-followback/memory-bank/progress.md
git commit -m "feat(x-non-followback): hide floating scan panel"
```

