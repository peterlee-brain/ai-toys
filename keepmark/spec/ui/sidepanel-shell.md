# 面：Side Panel 壳

> 版本：v0.5  
> 载体：Chrome Side Panel  
> 代码：`extension/entrypoints/sidepanel/main.ts`（外壳部分）  
> 真源：本文件；`spec/design/` 与之冲突时以本文件为准。

学习 / 词库两个 Tab 的 **内容** 见：

- [sidepanel-learning.md](./sidepanel-learning.md)  
- [sidepanel-bank.md](./sidepanel-bank.md)

---

## 1. 职责

常驻阅读侧栏的 **框架**：品牌、选中即翻译开关、关闭、Tab 切换。  
不解析页面 DOM；数据来自 `chrome.storage.local`。  
壳只负责框架切换，具体学习内容由两个 Tab 文档定义。

### 1.1 明确不做

- 不在此展示今日留标数等统计  
- 不做 Popup 替代入口  
- 不直接渲染学习/词库内容（渲染交给 Tab 文档）  

---

## 2. 展示内容

### 2.1 布局（DOM 与文案）

```text
┌─ KeepMark │ 选中即翻译 [toggle] │ × ─┐
├─ 学习 │ 词库 ────────────────────────┤
│                                      │
│         （Tab 内容区，可滚动）          │
│                                      │
└──────────────────────────────────────┘
```

| 区块 | 说明 | 类名 / 元素约束 |
|------|------|-----------------|
| 标题 | 文案固定 `KeepMark` | `.km-panel-header-title` |
| 选中即翻译 | 文案固定 + 开关按钮；开时按钮有 `on` 类 | `.km-panel-header-toggle-label` + `.km-toggle` |
| × | 关闭侧栏；`aria-label="关闭侧栏"` | `.km-btn-icon` |
| Tab「学习」 | 对应 `sidePanelTab="grammar"`；激活时 `active` 类 | `.km-tab[data-tab="grammar"]` |
| Tab「词库」 | 对应 `sidePanelTab="bank"`；激活时 `active` 类 | `.km-tab[data-tab="bank"]` |
| Body | 当前激活的面板 | `.km-tab-panel` |

**无**底部统计 footer。

### 2.2 状态

| 状态 | 展示 |
|------|------|
| 打开 | 侧栏可见；按 `sidePanelTab` 激活对应 Tab |
| 关闭 | 通过 `window.close()` 或 Chrome 原生行为 |
| 收到状态更新 | 自动重绘整个壳与内容 |

---

## 3. 交互

### 3.1 壳上的控件

| 触发 | 逻辑 | 效果 |
|------|------|------|
| 点 **选中即翻译** | 翻转 `autoTranslate` → `saveState` → `chrome.runtime.sendMessage({ type: "KEEPMARK_TOGGLE_AUTO" })` | 开关样式变化；content 关时收起 Popover |
| 点 **学习** Tab | 写 `sidePanelTab: "grammar"` 到 storage | 切换面板；持久化 |
| 点 **词库** Tab | 写 `sidePanelTab: "bank"` 到 storage | 切换面板；持久化 |
| 点 **×** | `window.close()` | 侧栏关闭 |

### 3.2 打开侧栏的来源

| 来源 | 触发条件 | 落到的 Tab | 说明 |
|------|----------|------------|------|
| 拖选完整句子 | content 判定整句 | `grammar` | 自动打开并发起 `grammar` |
| Popover 点 **学习** | 用户主动学习 | `grammar` | 先关 Popover，再开侧栏 |
| 按 `Alt+G` | 有选区时 | `grammar` | 等同于「学习」 |
| 右键「语法讲解」 | 强制补句 | `grammar` | 同上 |
| 工具栏 KeepMark 图标 | manifest `openPanelOnActionClick: true` | 上次 `sidePanelTab` | 重新打开侧栏 |
| content 发 `KEEPMARK_OPEN_SIDE_PANEL` | background 调用 `chrome.sidePanel.open` | 消息中带 `tab` | 例如从 `grammar` 进入 |
| 收到 `KEEPMARK_STATE_UPDATED` | `loadState()` → `renderAll()` | — | 与 content 同步内容 |

---

## 4. 依赖

| 类型 | 项 |
|------|-----|
| State | `autoTranslate`、`sidePanelTab` |
| 消息 | 收：`KEEPMARK_STATE_UPDATED`；发：`KEEPMARK_TOGGLE_AUTO` |
| 样式 | `.km-panel-header*`、`.km-tabs`、`.km-tab`、`.km-toggle` |

---

## 5. 验收清单（改完需确认）

### 标题与布局

- [ ] 标题文案固定为 `KeepMark`。
- [ ] 标题栏顺序：标题 → 选中即翻译开关 → × 关闭按钮。
- [ ] 两个 Tab 标签为「学习」「词库」；激活项带 `active` 类。
- [ ] 无底部统计 footer。

### 开关

- [ ] 开关状态与 `autoTranslate` 一致；开时按钮带 `on` 类。
- [ ] 点击开关后 `chrome.storage.local` 更新，`KEEPMARK_TOGGLE_AUTO` 通知 content。
- [ ] 关闭开关时，若 Popover 正开着，content 侧应自动关闭 Popover。

### Tab 切换与打开

- [ ] 切换 Tab 后写入 `sidePanelTab`，刷新后仍保持当前 Tab。
- [ ] 点击 × 调用 `window.close()` 关闭侧栏。
- [ ] 工具栏图标点击可重新打开侧栏，并落在上次 `sidePanelTab`。
- [ ] content 触发 `OPEN_SIDE_PANEL` 时，侧栏打开并切到对应 Tab（如 `grammar`）。
- [ ] 拖选完整句子自动打开侧栏，并激活「学习」Tab。
- [ ] Popover 点「学习」打开侧栏，并激活「学习」Tab。
- [ ] 侧栏打开时若收到 `STATE_UPDATED`，自动重绘当前内容。
