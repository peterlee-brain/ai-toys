# 面：Side Panel · 学习

> 版本：v0.5  
> Tab：`grammar`  
> 代码：`sidepanel/main.ts` → `renderGrammar`；HTML：`shared/render-learning.ts`  
> 真源：本文件；`spec/design/` 与之冲突时以本文件为准。

---

## 1. 职责

对当前语境（`sentence`）做 **深度讲解**：整句翻译、语法结构、写作意图、仿写例句。  
数据来自最近一次成功的 `POST /v1/grammar`（存于 `learning`）。

### 1.1 明确不做

- 不在本 Tab 放 ☆（留标在 Popover / 词库）  
- 不展示时间线 / 复习队列  
- 不提供 `force_refresh` UI（当前产品默认不暴露）  

---

## 2. 展示内容

### 2.1 有数据时（自上而下）

| 区块 | 内容 | 对应字段 |
|------|------|----------|
| 翻译 | 整句中文 | `learning.translation` |
| 语法结构 | 表格式：主句、主语、谓语、宾语/表语、从句、修饰成分 | `learning.grammar` |
| 补充要点 | 列表；可无 | `learning.grammar.details[]` |
| 为什么这样写 | 段落 | `learning.why_written` |
| 仿写例句 | 卡片组：英文 + 中文 | `learning.similar_sentences[]` |

### 2.2 空态与加载

| 状态 | 条件 | 展示文案 / 图标 |
|------|------|-----------------|
| 空 | 无选区或尚无 `learning` | `📖 在网页中选中英文后<br>点击 Popover「学习」或 <kbd>Alt+G</kbd>` |
| 加载中 | 有 `selection` 且 `!grammarReady` | `⏳ 正在加载学习内容…` |
| 就绪 | `grammarReady && learning` | 上述区块；可带入场动画（`.km-grammar-stream`、`.km-stream-line`） |
| 错误 | API 失败 | 红色错误文案；保留空态入口 |

### 2.3 引用区（对齐设计稿）

设计稿顶部有 `grammarQuote`：

```text
原文所在句（用户选中词/短语加粗）
```

插件实现已补齐：在「翻译」上方展示引用区，用 `<strong>` 高亮 `selection`。

---

## 3. 交互

### 3.1 进入本面的来源

本 Tab **自身几乎无按钮**；进入本面的动作发生在网页 / Popover / 快捷键：

| 来源 | 触发条件 | 落到 Tab | 副作用 |
|------|----------|----------|--------|
| 拖选完整句子 | `isFullSentenceSelection()` 为 true | `grammar` | `POST /v1/grammar`，重置 `grammarReady`/`learning`/`vocabulary` |
| Popover 点 **学习** | 用户主动学习 | `grammar` | 先关 Popover，再发起 `grammar` |
| 按 `Alt+G` | 有选区时 | `grammar` | 同上 |
| 右键「语法讲解」 | 强制补句 | `grammar` | 同上 |
| 壳上点 **学习** Tab | 仅切换 UI | 切换 `sidePanelTab` | 不发起新请求；展示已有 `learning` 或空态 |

### 3.2 状态变化对本面的影响

| 事件 | 对本面的影响 | 原因 |
|------|--------------|------|
| 新选区产生（非整句） | 回到空态 | `grammarReady` 被 content 重置 |
| 新选区产生（整句） | 进入加载态，然后展示新 `learning` | 内容自动发起 `grammar` |
| 新学习成功 | 展示最新 `learning` 与 `vocabulary` | 数据覆盖 |
| API 失败 | 侧栏保持空态/加载态，并显示 Toast 警告 | 可重试 |

---

## 4. 依赖

| 类型 | 项 |
|------|-----|
| API | `POST /v1/grammar`（由 content 发起） |
| State 读 | `selection`、`grammarReady`、`learning`、`sidePanelTab` |
| 渲染 | `renderLearningHtml(learning, { prefix: "km-", stream: true })` |
| 样式 | `.km-block-title`、`.km-grammar-*`、`.km-why-box`、`.km-similar-*`、`.km-empty` |

成功后副作用：词库 Tab 同时获得 `vocabulary[]`（见 [词库](./sidepanel-bank.md)）。

---

## 5. 验收清单（改完需确认）

### 展示

- [ ] 空态文案与图标：`📖 在网页中选中英文后… 点击 Popover「学习」或 Alt+G`。
- [ ] 加载态文案：`⏳ 正在加载学习内容…`。
- [ ] 有 `learning` 时展示：翻译、语法结构、why_written、仿写例句。
- [ ] 语法结构按表格式渲染：主句、主语、谓语、宾语/表语、从句、修饰成分。
- [ ] `grammar.details[]` 存在时以列表展示；不存在时不显示该区块。
- [ ] 仿写例句卡片按 `例句 1`、`例句 2` 编号；英文在上，中文在下。
- [ ] 建议补齐：引用区展示原文句，并用 `<strong>` 高亮当前 `selection`。

### 进入来源

- [ ] 整句选中后自动进入本 Tab 加载，不出现 Popover。
- [ ] Popover 点「学习」后，本 Tab 加载并展示。
- [ ] `Alt+G` 有选区时触发本 Tab 加载。
- [ ] 右键「语法讲解」打开侧栏并进入本 Tab。
- [ ] 壳上点「学习」Tab 仅展示已有内容，不重复发起 `grammar`。

### 状态

- [ ] 切换新选区后，原 `learning` 不再展示（`grammarReady` 已重置）。
- [ ] 新学习成功后，数据覆盖旧 `learning` 与 `vocabulary`。
- [ ] API 失败时侧栏保持空态/加载态，并显示 Toast 警告。
