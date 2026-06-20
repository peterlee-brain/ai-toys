# KeepMark · UseCase

> 版本 **v0.5** · 实现文件 `internal/biz/keepmark.go`  
> 表 → [data-model.md](./data-model.md) · HTTP → [api.md](./api.md) · Agent 约束 → [README.md](./README.md#agent-约束须遵守)

---

## 1. KeepMarkUsecase

唯一 Biz 用例。翻译、语法/学习、留标均为 **KeepMarkUsecase 的核心逻辑**（同一 struct，三个公开入口）。

```go
// internal/biz/keepmark.go

type KeepMarkUsecase struct {
    translator translate.Translator
    kimi       *kimi.Client
    words      WordRepo
    sentences  SentenceRepo
}
```

| 入口方法 | HTTP | 主要数据 |
|----------|------|----------|
| `Translate` | `POST /v1/translate` | `words`（先查库，未命中再 Kimi） |
| `ExplainGrammar` | `POST /v1/grammar` | `sentences`（先查库，未命中再 Kimi） |
| `RecordMark` | `PUT /v1/words/mark` | `words`（仅 `mark_count++`、`recent_mark_time`） |

调用链：`service/keepmark.go` → `KeepMarkUsecase.*` → Repo / Kimi

---

### 1.1 核心依赖

| 依赖 | 用途 |
|------|------|
| `WordRepo` | 翻译查库/落库、留标、grammar vocabulary 补词 + seen_count |
| `SentenceRepo` | 语法/学习查库/落库 |
| `translate.Translator` | Popover 快译（**仅库未命中时**） |
| `kimi.Client` | 语法/学习（**仅库未命中时**） |
| `normalizeLemma` | 选中词 → `words._id` |
| `normalizeSentenceID` | 句子 → 全小写 `sentence_id` |
| `mapKimiLearningToSentence` | Kimi JSON → `biz.Sentence` |

共用：无鉴权 · 仅 Kimi · 改 Repo 必同步 [data-model.md](./data-model.md)

---

### 1.2 核心逻辑

---

#### 翻译

Popover 划词快译。**先查 `words` 缓存，命中不调 Kimi；未命中再 Kimi 并写库。**

**入口** `Translate(ctx, in) (*TranslateOutput, error)`

| 步 | 做什么 | 函数 |
|----|--------|------|
| 1 | 选中词 → **lemma** | `normalizeLemma` |
| 2 | **查库** `words.GetByLemma`；`translation` 非空 → 命中 | `loadWordByLemma` |
| 2a | **命中**：`RecordTranslateSeen` → 返回 `from_cache: true`，**不调 Kimi** | `recordTranslateSeen` |
| 3 | **未命中**：Kimi（`selection` + `sentence`）→ `UpsertFromTranslate` → `from_cache: false` | `callKimiTranslate` → `persistTranslateFromKimi` |

```text
Translate
  ├─ validateTranslateInput(in)
  ├─ lemma ← normalizeLemma(in.Selection)
  ├─ sentenceID ← normalizeSentenceID(in.Sentence)
  ├─ word ← loadWordByLemma(ctx, lemma)
  ├─ if hasCachedTranslation(word)
  │     ├─ recordTranslateSeen(ctx, lemma, sentenceID)
  │     └─ return buildTranslateOutput(word, fromCache=true)
  ├─ kimiResult ← callKimiTranslate(ctx, in)
  ├─ word ← persistTranslateFromKimi(ctx, lemma, sentenceID, kimiResult)
  └─ return buildTranslateOutput(word, fromCache=false)
```

写表：`words`（命中/未命中路径不同）· 不改 `mark_count` · 未命中时 **`words.pos = kimi.pos` 原值**

---

#### 语法 / 学习

**先查 `sentences`；命中不调 Kimi。** vocabulary 缺词写 `words`，响应合并 `seen_count`。

**入口** `ExplainGrammar(ctx, in) (*GrammarOutput, error)`

| 步 | 做什么 |
|----|--------|
| 1 | `sentence_id` normalize |
| 2 | `sentences.Get`；命中 → 不调 Kimi |
| 3 | 未命中 → Kimi → `sentences.Upsert` |
| 4 | 共用：`syncVocabularyWords` → `enrichVocabularySeenCount` → 返回 |

```text
ExplainGrammar
  ├─ validateGrammarInput(in)
  ├─ sentenceID ← normalizeSentenceID(in.Sentence)
  ├─ doc ← loadSentence(ctx, sentenceID)
  ├─ if shouldUseCache(doc, in.ForceRefresh)
  │     ├─ syncVocabularyWords(ctx, sentenceID, doc.Vocabulary)
  │     ├─ enrichVocabularySeenCount(ctx, doc.Vocabulary)
  │     └─ return buildGrammarOutput(doc, fromCache=true)
  ├─ learning ← callKimiLearning(ctx, in.Sentence)
  ├─ doc ← mapKimiLearningToSentence(sentenceID, learning)
  ├─ doc ← persistSentence(ctx, doc)
  ├─ syncVocabularyWords(ctx, sentenceID, doc.Vocabulary)
  ├─ enrichVocabularySeenCount(ctx, doc.Vocabulary)
  └─ return buildGrammarOutput(doc, fromCache=false)
```

写表：`sentences` + vocabulary 新 lemma 入 `words`

---

#### 留标

点 ★ **只累计**；**无取消留标**。每次请求仅更新 **`mark_count++`** 与 **`recent_mark_time`**。

**入口** `RecordMark(ctx, in) (*MarkOutput, error)`

| 步 | 做什么 |
|----|--------|
| 1 | `lemma` normalize |
| 2 | 文档不存在 → upsert 空壳（`seen_count:0`, `mark_count:0`） |
| 3 | **`words.RecordMark`**：`$inc mark_count:1`，`$set recent_mark_time, updated_at` |
| 4 | 返回 `lemma, mark_count, recent_mark_time` |

```text
RecordMark
  ├─ validateMarkInput(in)              // lemma 非空
  ├─ lemma ← normalizeLemma(in.Lemma)
  ├─ word ← recordMark(ctx, lemma)      // words.RecordMark
  └─ return buildMarkOutput(word)
```

| 函数 | 说明 |
|------|------|
| `validateMarkInput` | `lemma` 非空 → `400 INVALID_LEMMA` |
| `recordMark` | `words.RecordMark`；**不**改 translation / sentence / seen_count |
| `buildMarkOutput` | `lemma, mark_count, recent_mark_time, message` |

写表：仅 **`mark_count` + `recent_mark_time`**（及 `updated_at`）

---

### 1.3 能力对照

| | 翻译 | 语法 / 学习 | 留标 |
|---|------|-------------|------|
| 查库优先 | `words` | `sentences` | — |
| Kimi | 未命中才调 | 未命中才调 | — |
| `words` 写 | translate | vocabulary 缺词 insert | **仅 mark_count + recent_mark_time** |
| 取消/回退 | — | — | **无** |
| `from_cache` | 有 | 有 | — |

---

### 1.4 交互总览（待补图）

```text
Popover translate → words 缓存? → 是：RecordTranslateSeen / 否：Kimi+Upsert
Side Panel grammar → sentences 缓存? → 是：直接返回 / 否：Kimi+Upsert → sync vocabulary
Side Panel ★ → RecordMark → mark_count++ , recent_mark_time（无取消）
```
