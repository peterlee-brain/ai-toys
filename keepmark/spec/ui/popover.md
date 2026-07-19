# 面：Popover（快译浮层）

> 版本：v0.5  
> 载体：Content Script · Shadow DOM  
> 代码：`extension/entrypoints/content.ts`  
> 真源：本文件；`spec/design/` 与之冲突时以本文件为准。

---

## 1. 职责

在英文网页上，对用户拖选的 **单词或短语** 做轻量释义，不打断阅读。  
**完整句子不进本面**（直接进 [学习 Tab](./sidepanel-learning.md)）。

### 1.1 明确不做

- 不展示完整语法表、仿写例句（属于学习 Tab）  
- 不做全页翻译  
- 不显示「今日新增/已留标」等统计  

---

## 2. 展示内容

### 2.1 布局（DOM 与文案）

```text
┌─ [选中词标题]          [学习] [☆] [×] ─┐
│  [词性标签] 释义……                     │
│  搭配（可选）                           │
│  全库出现 N 次 · 缓存（可选）            │
└────────────────────────────────────────┘
```

| 区块 | 内容来源 | 类名 / 元素约束 |
|------|----------|-----------------|
| 标题 | `selection`；超过 28 字符尾部截断加 `…` | `.word-title` |
| 词性 + 释义 | `translate` 响应 `pos` / `meaning` | `.km-pos-tag` + `.km-meaning` |
| 搭配 | `collocation`（可为空） | `.km-collocation` |
| 出现次数 | `seen_count`；`from_cache` 为 `true` 时附加「 · 缓存」 | `.km-seen-count` |
| 加载 | 两条骨架线 | `.km-skeleton` + `.km-skeleton-line` |
| 错误 | `formatApiError(err)` 文案，红色 | `.km-error` |

### 2.2 位置

| 场景 | 行为 |
|------|------|
| 默认 | 贴选区下方 `8px` |
| 下方空间不足 | 翻到选区上方，仍距 `8px` |
| 水平 | 以选区中心居中；钳制在视口左右 `12px` 内 |
| 宽度 | 固定 `300px` |
| 滚动 | 页面滚动时 `positionPopover()` 重算，保持贴着选区 |

### 2.3 状态与展示

| 状态 | 触发条件 | 展示 |
|------|----------|------|
| 加载中 | 请求已发出 | skeleton；标题预填 `selection` |
| 成功 | API 返回 | 释义正文；按 `savedKeys` 更新 ☆/★ |
| 失败 | API 抛错 | `.km-error` 文案；标题保留 |
| 已留标 | `getSaveKey(state)` 命中 `savedKeys` | 按钮从 `☆` 变 `★`，加 `saved` 类 |
| 关闭 | 点 × / Esc / 切到侧栏 | `.km-hidden` 隐藏 |

---

## 3. 交互

### 3.1 谁触发 Popover

| 来源 | 触发条件 | 主要逻辑 | 效果 |
|------|----------|----------|------|
| 网页拖选 | 词/短语 + `autoTranslate=true` | 防抖 280ms → 非整句判定 → `POST /v1/translate` | 打开并填充释义 |
| 网页拖选 | 词/短语 + `autoTranslate=false` | 只写 `KeepMarkState`（无 `translate`） | **不弹** Popover |
| 网页拖选 | 完整句子 | 分流到学习 Tab | **不弹** Popover |
| 右键菜单 | 翻译选中文本 | 强制 `translate`（忽略 `autoTranslate`） | 打开本面 |
| 快捷键 | `Alt+S` | 等同于点击 ☆ | 留标或警告 |

### 3.2 Popover 内部操作

| 触发 | 逻辑 | 效果 |
|------|------|------|
| 点 **学习** | `hidePopover()` → 开侧栏 → `POST /v1/grammar` | 侧栏切到「学习」加载 |
| 点 **☆** | 同句已留（`savedKeys`）则警告；否则 `PUT /v1/words/mark` + 本地记键 | Toast；☆→★ |
| 点 **×** / `Esc` | `closeAll()`：关浮层 + 清选区 | Popover 消失 |
| 页面滚动 | 用 `lastRect` 重新定位 | 浮层跟随 |
| 同请求键重复 | `requestKey = selection::sentence前80字` 命中且已打开 | 不重复请求，只刷新 ☆ 状态 |

### 3.3 请求键去重

```text
requestKey = `${selection.trim()}::${sentence.slice(0, 80)}`
```

仅用于避免重复请求；不改变用户操作响应。

---

## 4. 依赖

| 类型 | 项 |
|------|-----|
| API | `POST /v1/translate`；☆ → `PUT /v1/words/mark` |
| State 读 | `selection`、`sentence`、`autoTranslate`、`savedKeys` |
| State 写 | `lemma`（来自 translate）、`sentenceId`、留标相关 |
| 消息 | 学习时 `KEEPMARK_OPEN_SIDE_PANEL` |
| 样式 | `.km-popover*`、`.km-skeleton*`、`.km-error` |

---

## 5. 验收清单（改完需确认）

### 基础展示

- [ ] 拖选单词后，约 280ms 内出现 Popover（加载 → 成功/失败）。
- [ ] Popover 标题不超过 28 字符，超长截断。
- [ ] 释义区包含：词性标签、释义、可选搭配、出现次数。
- [ ] `from_cache` 为 true 时，次数后附加「 · 缓存」。
- [ ] Popover 贴选区下方；空间不足时翻到上方；水平居中且不出视口。
- [ ] 页面滚动时 Popover 跟随选区。
- [ ] 点 × 或 Esc 关闭 Popover 并清除选区。

### 分流与开关

- [ ] 拖选完整句子**不**出现 Popover，直接打开侧栏「学习」并加载。
- [ ] 关闭「选中即翻译」后拖选词/短语，不弹 Popover。
- [ ] 右键「翻译选中文本」即使开关关也能打开 Popover。
- [ ] 同 `requestKey` 重复时不重复发 `translate` 请求。

### 操作

- [ ] 点「学习」后 Popover 关闭，侧栏切到「学习」Tab 并加载。
- [ ] 点 ☆ 首次留标 → Toast「已留标」；按钮变 ★；同句再次点 → 警告 Toast。
- [ ] 按 `Alt+S` 等同于点击 ☆，行为一致。
- [ ] 切到侧栏（学习/词库）后，Popover 应被关闭。
