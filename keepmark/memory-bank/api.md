# KeepMark — API 契约

> **Extension 改 `shared/api*.ts` 或后端改 `svc_keepmark` 前必须先更新本文。**  
> 服务端详版：[peter-sever/spec/svc_keepmark/api.md](../../../peter-sever/spec/svc_keepmark/api.md)  
> 产品规则：[product.md](./product.md)

---

## 职责划分

| 端 | 职责 | API |
|----|------|-----|
| **Chrome 插件** | 阅读时写入：查词、学习、留标 | `POST /v1/translate`、`POST /v1/grammar`、`PUT /v1/words/mark` |
| **复习网站**（后续） | 读取积累数据、复习闭环 | `GET /v1/words`、`GET /v1/words/{lemma}`、`GET /v1/sentences/{sentence_id}`（v0.6 规划） |

插件 **不提供**：时间线、侧栏统计、词库全局查询、复习调度。

---

## 通用

- **Base URL**：`extension/shared/api-base.ts`（经 `background` 代理）
- **格式**：JSON
- **错误**：`{ "code": number, "reason": string, "message": string }`

### 共享请求字段

| 字段 | 说明 |
|------|------|
| `selection` | 用户拖选原文（词 / 短语 / 句），学习焦点 |
| `sentence` | Extension 按 [product.md §语境补全](./product.md) 推断的讲解语境 |
| `page_url` | 当前页 URL；v0.5 服务端不落库，仅日志 |

### 语境补全（Extension 侧）

```text
完整句子 → 向 .!? 扩句
语境片段 → 扩到块级元素（p / li / h* …）
仅选区   → sentence = selection
```

---

## 插件 API（v0.5 · 已实现）

### POST /v1/translate

**何时调用**：拖选 **单词或短语** 且开启「选中即翻译」；**完整句子选中时不调用**（直接走 grammar）。

**请求**

```json
{
  "selection": "notwithstanding",
  "sentence": "The court ruled that the defendant's actions, notwithstanding prior warnings, constituted a breach of contract.",
  "page_url": "https://example.com/article"
}
```

**响应**：`lemma`、`word`、`pos`、`meaning`、`collocation?`、`sentence_id`、`seen_count`、`from_cache`

**副作用**：`words.seen_count++`；`words.sentence[]` `$addToSet`

---

### POST /v1/grammar

**何时调用**：

- 拖选 **完整句子** → 自动打开 Side Panel 并请求（跳过 Popover）
- Popover 点「学习」/ `Alt+G` / 右键「语法讲解」

**请求**

```json
{
  "selection": "volatile",
  "sentence": "Although many investors understand that patience is essential, they often make impulsive decisions when the market becomes volatile, which can seriously damage their long-term returns.",
  "page_url": "https://example.com/article",
  "force_refresh": false
}
```

**响应**：`sentence_id`、`selection`、`translation`、`vocabulary[]`、`grammar`、`why_written`、`similar_sentences[]`、`from_cache`

**副作用**：`sentences` upsert；`vocabulary` 缺词写入 `words`

---

### PUT /v1/words/mark

**何时调用**：Popover ☆ 或 Side Panel 词库行 ☆

**请求**

```json
{
  "lemma": "volatile",
  "sentence_id": "although many investors understand that patience is essential, ..."
}
```

**响应**：`lemma`、`mark_count`、`recent_mark_time`、`message`

**副作用**：`words.mark_count++`、`recent_mark_time`；v0.5 **不写** `sentence[]`

---

## 复习网站 API（v0.6 · 规划，插件不调用）

> 复习闭环在独立网站完成；数据来自插件积累在 `words` / `sentences` 表。

### GET /v1/words

留标词列表、复习队列。

| 参数 | 说明 |
|------|------|
| `marked_only` | 默认 `true`（`mark_count > 0`） |
| `sort` | `recent_mark_time` \| `mark_count` \| `seen_count` |
| `limit` / `cursor` | 分页 |

### GET /v1/words/{lemma}

单词详情：释义、`seen_count`、`mark_count`、`sentence_ids[]`、关联句摘要。

### GET /v1/sentences/{sentence_id}

句子学习缓存：翻译、语法、词库、仿写例句（同 `POST /v1/grammar` 响应，只读）。

---

## 明确不提供

| 接口 | 原因 |
|------|------|
| `POST /v1/words/track` | 行为由 translate / grammar / mark 隐式记录 |
| `GET /v1/stats` | 侧栏统计已移除；汇总放复习网站 |
| 时间线 CRUD | 插件不做回溯；网站用 words + sentences 查询 |
| 取消留标 / `marked: false` | v0.5 仅累计 `mark_count` |

---

## TypeScript 映射

| 层 | 文件 |
|----|------|
| 类型 | `extension/shared/api-types.ts` |
| 客户端 | `extension/shared/api.ts` |
| normalize | `extension/shared/api-normalize.ts` |
| 语境判定 | `extension/shared/text-utils.ts`（`extractSentence`、`isFullSentenceSelection`） |
