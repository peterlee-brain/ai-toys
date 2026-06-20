# KeepMark Server · API 契约

> 版本 **v0.5 · 单用户 · 无鉴权 · 仅 Kimi**  
> 业务流程 → [usecase.md](./usecase.md) · 架构 → [architecture.md](./architecture.md) · 表字段 → [data-model.md](./data-model.md)

---

## 总览

v0.5 对外 **3 个业务 API**，一一对应 `KeepMarkUsecase` 三个入口。无鉴权；全库个人数据。

| HTTP | Biz 方法 | 用途 | Extension 调用位置 |
|------|----------|------|-------------------|
| `POST /v1/translate` | `Translate` | 划词快译；先查 `words`，命中不调 Kimi | Content Script Popover（选区 debounce 后自动请求） |
| `POST /v1/grammar` | `ExplainGrammar` | 整句学习；先查 `sentences`，命中不调 Kimi | Content Script「学习」按钮；右键菜单「KeepMark 学习」 |
| `PUT /v1/words/mark` | `RecordMark` | 点 ★ 留标；仅 `mark_count++` + `recent_mark_time` | Popover ★；Side Panel 词库 Tab 每行 ★ |

**服务端调用链**：`HTTP` → `internal/service/keepmark.go` → `KeepMarkUsecase.*` → Repo / Kimi

**v0.5 不提供**：`POST /v1/words/track`、`GET /v1/words`、`GET /v1/stats` 等查询/统计接口。

---

## 通用约定

### Base URL

```text
http://{host}:8080
```

### 请求头

| Header | 值 |
|--------|-----|
| `Content-Type` | `application/json`（POST / PUT body） |

### 标识符 normalize

| 字段 | 规则 | 存储 |
|------|------|------|
| `lemma` | `trim` → `toLowerCase()` → 去首尾非字母；短语保留空格 | `words._id` |
| `sentence` / `sentence_id` | 抽句 normalize 后 **`toLowerCase()`** | `sentences._id` |

### 错误响应

HTTP 4xx / 5xx，body：

```json
{
  "code": 40001,
  "reason": "INVALID_LEMMA",
  "message": "lemma 不能为空"
}
```

| `reason` | HTTP | 说明 |
|----------|------|------|
| `INVALID_SELECTION` | 400 | translate：`selection` 为空 |
| `INVALID_SENTENCE` | 400 | translate / grammar：`sentence` 为空 |
| `INVALID_LEMMA` | 400 | mark：`lemma` 为空 |

---

## 1. 翻译 · `POST /v1/translate`

### 用途

用户在网页 **选中英文** 后，Popover 展示释义与出现次数。服务端 **先查 `words`**：已有 `translation` 则直接返回并 `seen_count++`；否则调 Kimi 翻译后写库。

### 调用位置

| 位置 | 文件 | 触发 |
|------|------|------|
| Content Script Popover | `extension/entrypoints/content.ts` | 选区变化 debounce ~250ms 后请求 |
| UI 预览（mock 对照） | `extension/docs/ui-preview.html` | 同上交互，当前为本地 mock |

### Biz 映射

`KeepMarkUsecase.Translate` → `WordRepo.GetByLemma` →（命中）`RecordTranslateSeen` /（未命中）Kimi + `UpsertFromTranslate`

**Kimi 输入（v0.5）**：仅 `selection` + `sentence`；**不传**页面前后文（`context_before` / `context_after`）。

### Request

```json
{
  "selection": "Notwithstanding",
  "sentence": "The decision, notwithstanding the risks, was final.",
  "page_url": "https://example.com/article"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `selection` | string | 是 | 用户选中的英文词或短语（原文大小写） |
| `sentence` | string | 是 | 选区所在完整句子（Extension 按 `.!?` 抽句） |
| `page_url` | string | 否 | 当前页 URL；**v0.5 服务端不落库、不传 Kimi**，仅日志/调试 |

### Response 200

```json
{
  "lemma": "notwithstanding",
  "word": "Notwithstanding",
  "pos": "adv.",
  "sentence_id": "the decision, notwithstanding the risks, was final.",
  "meaning": "尽管；虽然",
  "collocation": "notwithstanding the fact that",
  "seen_count": 7,
  "from_cache": true
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `lemma` | string | normalize 后小写 id（= `words._id`） |
| `word` | string | 回显 Kimi / 用户选中原文 |
| `pos` | string | Kimi `pos` 原值（= `words.pos`）；库命中读库；未命中来自 Kimi |
| `meaning` | string | 中文释义（= `words.translation`） |
| `collocation` | string | Kimi 返回的搭配；**仅 translate 响应**，不落 `words` 表 |
| `sentence_id` | string | 全小写句子 id（= `sentences._id` 格式） |
| `seen_count` | int | 该 lemma **全局** translate 累计次数（本次请求已 +1） |
| `from_cache` | bool | `true` = 库命中未调 Kimi；`false` = 本次 Kimi 写库 |

### 数据副作用

| 路径 | Mongo |
|------|--------|
| 库命中 | `RecordTranslateSeen`：`seen_count += 1`，`$addToSet sentence`，`updated_at` |
| 库未命中 | `UpsertFromTranslate`：`seen_count += 1`，`$set translation,pos,updated_at`（`pos` = Kimi 原值），`$addToSet sentence` |

不改 `mark_count`。

---

## 2. 语法 / 学习 · `POST /v1/grammar`

### 用途

用户点击 **「学习」** 后，Side Panel 展示整句翻译、语法拆解、推荐词库（`vocabulary[]`）、仿写例句等。服务端 **先查 `sentences`**；命中且非强制刷新则不调 Kimi。返回前对 `vocabulary[]` 缺词执行 `EnsureFromVocabulary`，并合并各词 `words.seen_count` 到响应。

### 调用位置

| 位置 | 文件 | 触发 |
|------|------|------|
| Content Script Popover | `extension/entrypoints/content.ts` | 点击「学习」→ 打开 Side Panel 并请求 |
| 右键菜单 | `extension/entrypoints/background.ts` | 菜单项 `keepmark-grammar` |
| Side Panel 展示 | `extension/entrypoints/sidepanel/main.ts` | 消费响应渲染「学习」「词库」Tab |
| UI 预览 | `extension/docs/ui-preview.html` | mock 对照 |

词库 Tab 的推荐词列表来自本接口响应的 **`vocabulary[]`**（非单独 GET）。

### Biz 映射

`KeepMarkUsecase.ExplainGrammar` → `SentenceRepo.Get` →（未命中）Kimi + `Upsert` → `EnsureFromVocabulary` × N → `enrichVocabularySeenCount`

### Request

```json
{
  "selection": "volatile",
  "sentence": "Although many investors understand that patience is essential, they often make impulsive decisions when the market becomes volatile, which can seriously damage their long-term returns.",
  "page_url": "https://example.com/article",
  "force_refresh": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `selection` | string | 否 | 当前选中词；**v0.5 服务端不参与缓存键**，仅回显 |
| `sentence` | string | 是 | 待学习的完整英文句 |
| `page_url` | string | 否 | 当前页 URL；**不落库** |
| `force_refresh` | bool | 否 | 默认 `false`；`true` 时跳过 `sentences` 缓存，强制 Kimi |

### Response 200

```json
{
  "sentence_id": "although many investors understand that patience is essential, they often make impulsive decisions when the market becomes volatile, which can seriously damage their long-term returns.",
  "selection": "volatile",
  "from_cache": false,
  "translation": "尽管许多投资者明白耐心至关重要，但当市场变得波动剧烈时，他们往往会做出冲动决策，这可能严重损害其长期回报。",
  "vocabulary": [
    {
      "text": "volatile",
      "translation": "波动剧烈的；不稳定的",
      "note": "形容市场、价格",
      "seen_count": 5
    },
    {
      "text": "impulsive",
      "translation": "冲动的",
      "note": "",
      "seen_count": 0
    }
  ],
  "grammar": {
    "main_clause": "they often make impulsive decisions",
    "clauses": [
      "Although many investors understand that patience is essential",
      "when the market becomes volatile",
      "which can seriously damage their long-term returns"
    ],
    "subject": "they",
    "predicate": "often make",
    "object": "impulsive decisions",
    "modifiers": ["when the market becomes volatile"],
    "details": ["主从复合句；although 引导让步状语从句"]
  },
  "why_written": "作者用 although 让步 + when 时间状语 + which 非限定定语，层层递进说明冲动决策的成因与后果。",
  "similar_sentences": [
    {
      "english": "When prices turn volatile, many traders abandon their plans.",
      "translation": "当价格变得波动剧烈时，许多交易者会放弃原有计划。"
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `sentence_id` | string | 全小写 id（= `sentences._id`） |
| `selection` | string | 回显请求中的选中词 |
| `from_cache` | bool | `true` = `sentences` 库命中未调 Kimi |
| `translation` | string | 整句中文（= `sentences.translation`） |
| `vocabulary` | array | Side Panel **词库 Tab** 数据源 |
| `vocabulary[].text` | string | 英文词/短语 |
| `vocabulary[].translation` | string | 中文释义 |
| `vocabulary[].note` | string | 学习提示；可空 |
| `vocabulary[].seen_count` | int | **响应字段**：读 `words.seen_count`；新插入词为 `0`；**不写入** `sentences` 表 |
| `grammar` | object | 语法拆解（字段同 `sentences.grammar`） |
| `grammar.main_clause` | string | 主句 |
| `grammar.clauses` | string[] | 从句列表 |
| `grammar.subject` | string | 主语 |
| `grammar.predicate` | string | 谓语 |
| `grammar.object` | string | 宾语/表语 |
| `grammar.modifiers` | string[] | 修饰成分 |
| `grammar.details` | string[] | 时态、连接词等补充 |
| `why_written` | string | 为什么这样写 |
| `similar_sentences` | array | 仿写例句 |
| `similar_sentences[].english` | string | 英文例句 |
| `similar_sentences[].translation` | string | 中文翻译 |

### 数据副作用

| 路径 | Mongo |
|------|--------|
| sentences 命中 | 读 `sentences`；`EnsureFromVocabulary` 补全缺词 |
| sentences 未命中 | `sentences.Upsert`（Kimi 平铺字段）+ `EnsureFromVocabulary` |

grammar **本身不** `seen_count++`；`seen_count` 仅由 translate 累加。

---

## 3. 留标 · `PUT /v1/words/mark`

### 用途

用户点 **★** 记录「我要学这个词」。每次请求 **只累计**：`mark_count += 1`，更新 `recent_mark_time`。**无取消留标**；不改 `translation` / `sentence[]` / `seen_count`。

### 调用位置

| 位置 | 文件 | 触发 |
|------|------|------|
| Content Script Popover | `extension/entrypoints/content.ts` | Popover 右上角 ★ 按钮 |
| Side Panel 词库 Tab | `extension/entrypoints/sidepanel/main.ts` | 词库每行 ★ 按钮 |
| UI 预览 | `extension/docs/ui-preview.html` | Popover / 词库行 ★ |

Extension 本地可维护「本句已留标」状态（`savedKeys`）；同句重复点 ★ 可前端拦截提示，服务端仍允许同一 lemma 多次累计 `mark_count`。

### Biz 映射

`KeepMarkUsecase.RecordMark` → `WordRepo.RecordMark`

### Request

```json
{
  "lemma": "volatile",
  "sentence_id": "although many investors understand that patience is essential, they often make impulsive decisions when the market becomes volatile, which can seriously damage their long-term returns."
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `lemma` | string | 是 | 小写 lemma（= `words._id`）；服务端 normalize |
| `sentence_id` | string | 否 | 客户端上下文；**v0.5 服务端留标不写 `sentence[]`** |

无 `marked` 字段；无 `marked: false` 取消语义。

### Response 200

```json
{
  "lemma": "volatile",
  "mark_count": 5,
  "recent_mark_time": "2026-06-20T10:00:00Z",
  "message": "已留标"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `lemma` | string | normalize 后小写 id |
| `mark_count` | int | 该 lemma 累计留标次数（本次已 +1） |
| `recent_mark_time` | string | ISO8601；最近一次留标时间 |
| `message` | string | 人类可读提示 |

### 数据副作用

- 文档不存在时 upsert 空壳（`seen_count:0`, `mark_count:0`）后 `$inc mark_count`
- `$set recent_mark_time`, `updated_at`
- **不**改 `translation` / `sentence` / `seen_count`

---

## 4. 健康检查

| 方法 | 路径 | 用途 | 调用位置 |
|------|------|------|----------|
| GET | `/healthz` | 进程存活 | 部署探针 |
| GET | `/readyz` | Mongo 可达 | 部署探针 |

**Response 200**：空 body 或 `{ "status": "ok" }`（实现自定）。

---

## 5. API ↔ Biz ↔ 表

| API | Biz | `words` | `sentences` | Kimi |
|-----|-----|---------|-------------|------|
| `POST /v1/translate` | `Translate` | 读；命中 `RecordTranslateSeen` / 未命中 `UpsertFromTranslate` | — | 未命中时 translate |
| `POST /v1/grammar` | `ExplainGrammar` | `EnsureFromVocabulary`；读 `seen_count` enrich | 读 / upsert | 未命中时 learning |
| `PUT /v1/words/mark` | `RecordMark` | `RecordMark` | — | — |
