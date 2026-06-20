# KeepMark Server · Kimi 集成设计

> Kimi API 开放平台：https://platform.moonshot.cn  
> 兼容 OpenAI SDK，Base URL：`https://api.moonshot.cn/v1`

语法分析 **仅服务端调用**；API Key 存环境变量 `KIMI_API_KEY`，禁止下发 Extension。

---

## 1. 模型选型

| 场景 | 推荐模型 | 理由 |
|------|----------|------|
| **学习 / 语法** | `moonshot-v1-32k` | 长句 + `LearningResult` 结构化 JSON |
| **选中即译** | `moonshot-v1-8k` | Popover 延迟敏感，输入较短 |
| 后续升级 | `kimi-k2.6` | 更强推理；需评估 latency 与成本 |

v0.5 **学习不用 thinking 模型**（`reasoning_content` 增加延迟与复杂度）。

---

## 2. 客户端封装

路径：`internal/pkg/kimi/client.go`

```go
type Client struct {
    baseURL    string
    apiKey     string
    httpClient *http.Client
}

type ChatRequest struct {
    Model       string
    Messages    []Message
    Temperature float64  // moonshot-v1-* 可用 0.3
    MaxTokens   int
}

type ChatResponse struct {
    Content string
    Usage   Usage
}
```

实现要点：

- HTTP：`POST {baseURL}/chat/completions`
- Header：`Authorization: Bearer {apiKey}`
- 超时：25s（可配置）
- 重试：仅 429 / 5xx，最多 1 次，指数退避 500ms
- 日志：记录 `model`、`prompt_tokens`、`completion_tokens`、latency

与 OpenAI Go SDK 兼容写法：

```go
// 伪代码
client := openai.NewClient(
    option.WithBaseURL(cfg.Kimi.BaseURL),
    option.WithAPIKey(cfg.Kimi.APIKey),
)
```

---

## 3. 学习 / 语法 Prompt（`learning-v1`）

对应 `POST /v1/grammar` → `KeepMarkUsecase.ExplainGrammar` → `kimi.Client.ExplainLearning`。  
Kimi 返回 **`LearningResult`**，字段与 [data-model.md](./data-model.md) `sentences` 表、[api.md](./api.md) Response **同名平铺**。

实现：`internal/pkg/kimi/learning.go`

### 3.1 输出 JSON Schema（`LearningResult`）

```json
{
  "translation": "整句中文翻译",
  "vocabulary": [
    { "text": "volatile", "translation": "波动剧烈的；不稳定的", "note": "形容市场、价格" }
  ],
  "grammar": {
    "main_clause": "they often make impulsive decisions",
    "clauses": ["Although many investors understand …", "when the market becomes volatile"],
    "subject": "they",
    "predicate": "often make",
    "object": "impulsive decisions",
    "modifiers": ["when the market becomes volatile"],
    "details": ["主从复合句；although 引导让步状语从句"]
  },
  "why_written": "用 although 让步 + when 时间状语层层递进说明因果。",
  "similar_sentences": [
    { "english": "When prices turn volatile, many traders abandon their plans.", "translation": "当价格变得波动剧烈时，许多交易者会放弃原有计划。" }
  ]
}
```

| 字段 | 说明 |
|------|------|
| `translation` | 整句中文；**缓存命中判定**：`sentences.translation` 非空 |
| `vocabulary` | 3～8 项推荐词/短语；Side Panel **词库 Tab** 数据源 |
| `vocabulary[].text` | 英文；Biz 经 `normalizeLemma` 写入 `words._id` |
| `vocabulary[].translation` | 中文释义 |
| `vocabulary[].note` | 学习提示；可空 |
| `grammar` | 语法拆解；子字段见 [data-model.md](./data-model.md) §2.3 |
| `why_written` | 为什么这样写 |
| `similar_sentences` | 恰好 2 条仿写例句 |

**不在 Kimi JSON 内、由 Biz 合并的字段**：`vocabulary[].seen_count`（读 `words.seen_count`，见 [usecase.md](./usecase.md)）。

### 3.2 System Prompt（`learning-v1`）

与 `learning.go` 中 `learningSystemPrompt` 一致：

```text
你是 KeepMark 的英语学习助教。用户给你一句英文，请按结构化 JSON 输出学习材料。

要求：
1. 输出必须是合法 JSON，不要 Markdown 代码块。
2. 使用简体中文。
3. translation：自然、准确的中文整句翻译。
4. vocabulary：提取值得学习的生词、短语、固定搭配（3～8 项）。
5. grammar：说明主句、从句、主语、谓语、宾语、修饰成分；details 可补充时态、语态、连接词等。
6. why_written：说明这句话为什么这样写（语用、逻辑、修辞或常见写作模式）。
7. similar_sentences：恰好 2 条类似句子，每条含 english 与 translation。

JSON Schema：（同 §3.1）
```

### 3.3 User Prompt

v0.5 HTTP 仅传 **`sentence`**（`POST /v1/grammar` 的 `sentence` 字段）；**不传** `selection` / `context_before` / `context_after` 给 Kimi。

```text
请分析并输出 JSON。

英文句子：
{{sentence}}
```

模型：`moonshot-v1-32k`（配置项 `grammar_model`），`temperature=0.3`，`max_tokens=4096`

### 3.4 响应解析与 Biz 映射

1. 从 `choices[0].message.content` 取 JSON 字符串
2. 去 Markdown 代码块包裹 → `json.Unmarshal` → `LearningResult`
3. 校验 `translation` 非空；解析失败 → 重试一次（`temperature=0`），仍失败 → 503
4. `mapKimiLearningToSentence` → `biz.Sentence` → `sentences.Upsert`（平铺字段）
5. `syncVocabularyWords`：`vocabulary[]` 缺 lemma → `words.EnsureFromVocabulary`
6. `enrichVocabularySeenCount`：响应附带 `seen_count`

```go
// internal/pkg/kimi/learning.go

type LearningInput struct {
    Sentence string
}

type LearningResult struct {
    Translation      string            `json:"translation"`
    Vocabulary       []VocabItem       `json:"vocabulary"`
    Grammar          GrammarBreakdown  `json:"grammar"`
    WhyWritten       string            `json:"why_written"`
    SimilarSentences []SimilarSentence `json:"similar_sentences"`
}
```

> **已废弃**：旧版 `grammar-v1` / `GrammarResult`（`gist` / `bullets` / `hint`）不再使用；见 `types.go` 遗留代码，v0.5 以 **`learning-v1`** 为准。

---

## 4. 翻译 Prompt（Popover · `translate-v1`）

Popover **选中即译** 使用 Kimi（`moonshot-v1-8k`），与语法共用同一 API Key。  
HTTP 见 [api.md](./api.md) `POST /v1/translate`；**v0.5 只把划中的词和所在句传给 Kimi**，不传页面前后文。

### 4.1 System Prompt（`translate-v1`）

```text
你是 KeepMark 的阅读翻译助手。根据用户选中的英文和所在句子给出简洁中文释义。

输出 JSON：
{
  "word": "选中原词",
  "lemma": "词原形或短语",
  "pos": "词性缩写，如 n./v./adj./adv./sentence",
  "meaning": "中文释义，1～2 行",
  "collocation": "常见搭配，无则空字符串"
}

规则：
- 单词/短语：给词性 + 释义 + 搭配
- 整句选中：pos 填 sentence，meaning 为整句翻译
- 只输出 JSON
```

**落库与 API**：Kimi 字段 **`pos`** → **`words.pos` 原样写入**；API Response 字段名同为 **`pos`**（不做映射表）。`meaning` → `words.translation`；`collocation` 仅 HTTP 响应，不入库。

### 4.2 User Prompt

与 `POST /v1/translate` 一致，**仅两项**：

```text
选中：{{selection}}
句子：{{sentence}}
```

| 变量 | 来源 |
|------|------|
| `selection` | Request `selection`（用户划中的词/短语） |
| `sentence` | Request `sentence`（选区所在整句） |

**不传**：`context_before` / `context_after` / `page_url`。

模型：`moonshot-v1-8k`，`temperature=0.3`，`max_tokens=256`

---

## 5. 持久化（= 缓存）

v0.5 **无独立 cache 表**。§3 `LearningResult` **平铺**写入 **`sentences`**：

| 项 | 值 |
|----|-----|
| `_id` | `toLowerCase(normalize(sentence))`，**全小写** |
| 字段 | `translation`, `vocabulary`, `grammar`, `why_written`, `similar_sentences` |

同一句第二次 grammar 请求 → 读 `sentences` 缓存（`from_cache: true`），不调 Kimi；仍会对 `vocabulary[]` 执行缺词写入 `words` 并合并 `seen_count`。

`force_refresh: true` 时重新调 Kimi 并覆盖上述字段。

翻译结果写入 **`words`** 表：库命中走 `RecordTranslateSeen`，未命中 Kimi 后 `UpsertFromTranslate`。见 [usecase.md](./usecase.md) §1.2 翻译。

---

## 6. 流式输出（v2 可选）

Side Panel 语法 Tab 当前 UI 支持 `stream-line` 动画。后续可：

1. Server 调 Kimi `stream=true`
2. HTTP 对 Extension 用 **SSE**：`GET /v1/grammar/stream`
3. v1 先用 **非流式** 整包返回，实现简单

---

## 7. 错误与降级

| Kimi 错误 | Server 行为 | Extension 展示 |
|-----------|-------------|----------------|
| 401 Invalid API Key | `readyz` 失败，日志告警 | — |
| 429 Rate Limit | 返回 429，Retry-After | 「请求过多，请稍后」 |
| 超时 | 503 | 「语法服务超时」+ 重试按钮 |
| 内容审核拒绝 | 400 + reason | 「无法分析该句」 |

Extension 可保留 **本地 mock 降级**（Options 开关「离线演示模式」）。

---

## 8. 安全与合规

- 不向 Kimi 发送整页 HTML；translate 仅 `selection` + `sentence`，grammar 仅 `sentence`
- 日志脱敏：不打印完整 API Key
- 用户可配置「不上传页面 URL」（后续 `settings.anonymize_url`）

---

## 9. 配置示例

```yaml
ai:
  kimi:
    base_url: https://api.moonshot.cn/v1
    api_key: ${KIMI_API_KEY}
    grammar_model: moonshot-v1-32k
    translate_model: moonshot-v1-8k
    timeout: 25s
```

---

## 10. 测试建议

| 用例 | 输入句 | 断言 |
|------|--------|------|
| 状语从句 | `The decision, notwithstanding the risks, was final.` | `grammar.details` 或 `grammar.clauses` 含状语/插入语相关说明 |
| 完成时 | `Many companies have reconsidered their policies.` | `grammar.details` 含「现在完成时」 |
| vocabulary | 含 `volatile` 的长句 | `vocabulary[].text` 含该词；Upsert 后 `words` 有对应 lemma |
| 非法 JSON 重试 | mock Kimi 返回纯文本 | 第二次或返回 503 |
| 缓存命中 | 同句第二次 `POST /v1/grammar` | 响应 `from_cache: true`，无 Kimi 调用 |

单测：`internal/pkg/kimi/learning_test.go` mock Kimi；Biz：`ExplainGrammar` mock `ExplainLearning`；集成测：录制 HTTP fixture。
