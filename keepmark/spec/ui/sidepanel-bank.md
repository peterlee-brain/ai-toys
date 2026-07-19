# 面：Side Panel · 词库

> 版本：v0.5  
> Tab：`bank`  
> 代码：`sidepanel/main.ts` → `renderBank`  
> 真源：本文件；`spec/design/` 与之冲突时以本文件为准。

---

## 1. 职责

展示 **当前这次学习** 推荐的句内重点词/短语（`vocabulary[]`），由用户自行 ☆ 留标。  
不是全局生词本（全局浏览留给复习网站）。

### 1.1 明确不做

- 不提供「我的全部留标」列表（复习网站）  
- 不在本面发起 `translate` / `grammar`  
- 不支持取消留标（服务端只累计 `mark_count`）  
- 不展示非当前句的词汇  

---

## 2. 展示内容

### 2.1 有数据时

| 区块 | 内容 | 类名 / 元素约束 |
|------|------|-----------------|
| 列表头 | `重点词汇 · N 项 · 点击行展开详情，☆ 留标` | `.km-bank-header` |
| 行（收起） | 展开箭头 `›`、词文案、类型标签、出现次数、☆/★ | `.km-word-row` |
| 行（展开） | 释义区块标签 + `translation`；可选 `note` | `.km-word-row.expanded` + `.km-word-row-detail` |
| 已留标 | 按钮变 ★，行加 `marked` 类 | `.km-word-row.marked`、`.km-word-row-star.saved` |

```text
›  volatile    单词    5 次    ☆
   └ 释义：波动剧烈的；不稳定的
     note（可选）
```

### 2.2 类型标签

由 `vocabKindLabel(item)` 生成；例如：单词、短语、动词、名词等。Kimi 返回的 `kind` 优先。

### 2.3 出现次数

由 `vocabOccurrenceCount(state, item)` 生成；展示为 `N 次`。

### 2.4 状态

| 状态 | 条件 | 展示文案 / 图标 |
|------|------|-----------------|
| 空（未学习） | 无 `grammarReady` 或 `vocabulary` 空 | `📚 打开「学习」面板后<br>此处展示 Kimi 推荐的重点词汇<br><small>点击 ☆ 留标你想学的词或短语</small>` |
| 空（加载句） | 有 `sentence` 但 `!grammarReady` | `📚 请先打开「学习」面板<br><small>Kimi 会推荐本句重点词汇，由你自行选择留标</small>` |
| 就绪 | `vocabulary.length > 0` | 列表头 + 行 |

---

## 3. 交互

### 3.1 数据来源

本面数据来自 `state.vocabulary`，由 `POST /v1/grammar` 响应写入。  
不是全局生词本；只展示当前句子的推荐词汇。

| 来源 | 写入者 | 说明 |
|------|--------|------|
| 整句拖选 | content | 发起 `grammar` 后写入 `vocabulary` |
| Popover 学习 | content | 发起 `grammar` 后写入 `vocabulary` |
| 右键语法讲解 | content | 同上 |
| 新学习覆盖 | content | 新 `grammar` 响应替换 `vocabulary` |

### 3.2 本面操作

| 触发 | 逻辑 | 效果 |
|------|------|------|
| 点行主区域 | 切换 `expandedBankLemma`（再点收起） | 展开/收起详情；仅主区域点击生效，☆ 不触发 |
| 点行内 **☆** | 同句同词已在 `savedKeys` 则忽略；否则 `PUT /v1/words/mark` + `saveWord` | ☆→★；行加 `marked`；持久化 |
| 壳上点 **词库** Tab | 写 `sidePanelTab: "bank"` | 显示本面（已有数据则直接展示） |

---

## 4. 依赖

| 类型 | 项 |
|------|-----|
| API | `PUT /v1/words/mark`（仅 ☆） |
| 数据源 | `state.vocabulary`（来自 grammar 响应） |
| State | `expandedBankLemma`、`savedKeys`、`sentence`、`sentenceId` |
| 辅助 | `vocabKindLabel`、`vocabOccurrenceCount`、`isLemmaSaved` |
| 样式 | `.km-word-row*`、`.km-bank-header`、`.km-empty` |

---

## 5. 验收清单（改完需确认）

### 展示

- [ ] 空态文案与图标：`📚 打开「学习」面板后…`。
- [ ] 有 `sentence` 但未学习时，文案为「请先打开「学习」面板…」。
- [ ] 列表头展示：`重点词汇 · N 项 · 点击行展开详情，☆ 留标`。
- [ ] 每行收起态：箭头 `›`、词文案、类型标签、出现次数、☆ 按钮。
- [ ] 展开态显示「释义」+ `translation`；`note` 存在时显示。
- [ ] 已留标词显示 ★，行带 `marked` 类。

### 交互

- [ ] 点击行主区域展开/收起详情；点击 ☆ 不触发展开。
- [ ] 点击 ☆ 首次留标时调用 `PUT /v1/words/mark`；同句同词再次点击无网络请求。
- [ ] 留标成功后 `savedKeys` 更新，避免同句重复提交。

### 数据

- [ ] 整句拖选并学习成功后，词库 Tab 自动有数据。
- [ ] Popover 点「学习」成功后，词库 Tab 有数据。
- [ ] 切到词库 Tab 时，若已有 `vocabulary` 直接展示；无数据展示空态。
- [ ] 新学习覆盖旧学习时，词库列表刷新为新 `vocabulary`。
