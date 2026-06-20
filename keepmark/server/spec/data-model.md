# 数据模型

> 版本 **v0.5** · MongoDB · UseCase 见 [usecase.md](./usecase.md) · HTTP 见 [api.md](./api.md)

---

## 1. 单词表

### 1.1 库名 · 表名

`keepmark` · `words`

### 1.2 做什么的

存储用户划词/留标产生的 **lemma（小写单词或短语）**，一词一条文档。

- `_id` = normalize 后的小写 word
- **`seen_count`**：展示/出现次数；每次 **translate 成功** `$inc +1`（同句重复划词也累加）
- **`mark_count`**：每次 **点 ★ 留标** `$inc +1`，**可不停点**；**无取消留标**
- `mark`（留标）：**仅** `$inc mark_count` + `$set recent_mark_time`（及 `updated_at`）
- `translate`：**先** `GetByLemma`；有 `translation` → 只 `RecordTranslateSeen`（不调 Kimi）；无 → Kimi + `UpsertFromTranslate`
- `grammar vocabulary`：`EnsureFromVocabulary` **仅 insert 新 lemma**（`seen_count:0`）；已存在不覆盖 translation

### 1.3 数据库结构

#### 主键 normalize（`_id`）

| 规则 | 说明 |
|------|------|
| 处理 | `trim` → `toLowerCase()` → 去首尾非字母 |
| 短语 | 含空格时整体小写作为 `_id`（如 `"due to"`） |

#### 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `_id` | string | 是 | 小写 word / lemma |
| `pos` | string | 否 | 词性；**translate 路径**：存 Kimi 返回的 `pos` **原值**（如 `adj.`、`n.`、`sentence`）；grammar 补词可不写 |
| `seen_count` | int32 | 是 | **出现/展示次数**；每次 translate 请求 +1（命中/未命中均 +1）；默认 `0` |
| `mark_count` | int32 | 是 | 留标累计次数；每次留标 +1；**只增不减**；默认 `0` |
| `sentence` | string[] | 是 | 关联句 id（translate `$addToSet`）；**留标不改** |
| `recent_mark_time` | ISODate | 否 | 最近一次 **点留标** 时间 |
| `translation` | string | 否 | 中文释义（translate / vocabulary 写入） |
| `created_at` | ISODate | 是 | 文档创建 |
| `updated_at` | ISODate | 是 | 文档更新 |

#### `pos`（translate · Kimi 原值）

| 项 | 说明 |
|----|------|
| 来源 | Kimi `translate-v1` JSON 字段 **`pos`** |
| 落库 | **`words.pos = kimi.pos`**，不做映射、不去点、不改写 |
| 示例 | `adj.`、`n.`、`adv.`、`sentence` |
| grammar 补词 | `EnsureFromVocabulary` **不写** `pos`（Kimi learning 的 `vocabulary[]` 无 `pos`） |

缺省可空。

#### `sentence[]` 约束

- 元素 = **全小写** `sentence_id`（= `sentences._id`）
- translate 写入用 **`$addToSet sentence`**
- mark **不**改 `sentence[]`
- unmark **不存在**
- **`seen_count` ≠ `len(sentence)`**（同句多次 translate 只一条 sentence，但 seen_count 累加）
- **`mark_count` ≠ `len(sentence)`**（同句可多次点 ★，mark_count 累加）

### 1.4 索引结构

| 名称 | 键 | 用途 |
|------|-----|------|
| `_id_` | `{ _id: 1 }` | 主键 |
| `sentence` | `{ sentence: 1 }` | 按句查关联词 |
| `seen_count_desc` | `{ seen_count: -1 }` | 出现次数排序 |
| `mark_count_desc` | `{ mark_count: -1 }` | 留标点击排序 |
| `recent_mark_time_desc` | `{ recent_mark_time: -1 }` | 最近留标 |
| `updated_at_desc` | `{ updated_at: -1 }` | 最近更新 |

```javascript
db.words.createIndex({ sentence: 1 })
db.words.createIndex({ seen_count: -1 })
db.words.createIndex({ mark_count: -1 })
db.words.createIndex({ recent_mark_time: -1 })
db.words.createIndex({ updated_at: -1 })
```

### 1.5 接口结构

对应 Biz 实现层：`internal/biz` 依赖接口 · `internal/data/word_repo.go` 实现 Mongo。

#### 领域类型（`internal/biz/repo.go`）

```go
type Word struct {
    ID             string    // = _id
    Pos            string    // = Kimi translate pos 原值
    SeenCount      int
    MarkCount      int
    Sentence       []string
    RecentMarkTime *time.Time
    Translation    string
    CreatedAt      time.Time
    UpdatedAt      time.Time
}

type UpsertWordOpts struct {
    Pos         string // Kimi translate pos 原值
    Translation string
    SentenceID  string // $addToSet
}

type VocabularyWordOpts struct {
    Translation string
    SentenceID  string // $addToSet
}
```

#### `WordRepo`（`internal/data/word_repo.go`）

```go
type WordRepo interface {
    GetByLemma(ctx context.Context, lemma string) (*biz.Word, error)
    RecordTranslateSeen(ctx context.Context, lemma, sentenceID string) (*biz.Word, error)
    UpsertFromTranslate(ctx context.Context, lemma string, opts biz.UpsertWordOpts) (*biz.Word, error)
    EnsureFromVocabulary(ctx context.Context, lemma string, opts biz.VocabularyWordOpts) (*biz.Word, error)
    RecordMark(ctx context.Context, lemma string) (*biz.Word, error)
}
```

| 方法 | 说明 | Mongo 操作 | 调用场景 |
|------|------|------------|----------|
| `GetByLemma` | 按 `_id` 取文档 | `findOne({ _id })` | translate 查库；grammar enrich |
| `RecordTranslateSeen` | translate 库命中 | `$inc seen_count:1`；`$addToSet sentence`；`$set updated_at` | translate ②a |
| `UpsertFromTranslate` | translate Kimi 后 | upsert；`$inc seen_count:1`；`$set translation,pos,updated_at`；`$addToSet sentence` | translate ③ |
| `EnsureFromVocabulary` | grammar 新 lemma | upsert insert：`translation,seen_count:0,mark_count:0`；`$addToSet sentence`；**不写 pos** | grammar |
| `RecordMark` | 点 ★ | **`$inc mark_count:1`**；**`$set recent_mark_time, updated_at`** | 留标 |

**实现要点**

- `lemma`、`sentenceID` 写入前 normalize。
- **留标**：仅 **`mark_count` + `recent_mark_time`**；无取消留标 API
- 词库展示次数：读 **`seen_count`**（非 `mark_count`）。

#### Biz 调用

| Biz | Repo 方法 | usecase |
|-----|-----------|---------|
| `KeepMarkUsecase.Translate`（命中） | `GetByLemma` → `RecordTranslateSeen` | §1.2 翻译 ②a |
| `KeepMarkUsecase.Translate`（未命中） | `GetByLemma` → `UpsertFromTranslate` | §1.2 翻译 ③ |
| `KeepMarkUsecase.ExplainGrammar` | `Get` →（未命中）Kimi → `Upsert`；`EnsureFromVocabulary` × N；`GetByLemma` enrich | §1.2 语法/学习 |
| `KeepMarkUsecase.RecordMark` | `RecordMark` | §1.2 留标 |

### 1.6 设计注意

| # | 项 | 说明 |
|---|-----|------|
| 1 | **一词多义** | 单一 `translation`：后写覆盖前写 |
| 2 | **`pos` 全局** | 同词不同句词性可能不同；以 **最新 Kimi translate 的 `pos` 原值** 覆盖 |
| 3 | **两计数分工** | `seen_count` = 划词/出现（translate）；`mark_count` = 点 ★ 次数（可狂点）；互不替代 |
| 4 | **留标** | 只 `$inc mark_count`、`$set recent_mark_time`；**无 unmark** |
| 5 | **grammar vocabulary** | 新 lemma 经 `EnsureFromVocabulary` 入 `words`（`seen_count` 初始 0） |

```javascript
{
  _id: "volatile",
  pos: "adj.",
  seen_count: 12,
  mark_count: 5,
  sentence: [
    "although many investors understand that markets can be volatile.",
    "oil prices remain volatile this quarter."
  ],
  recent_mark_time: ISODate("2026-06-20T10:00:00Z"),
  translation: "波动剧烈的；不稳定的",
  created_at: ISODate("…"),
  updated_at: ISODate("…")
}
```

---

## 2. 语法句子表

### 2.1 库名 · 表名

`keepmark` · `sentences`

### 2.2 做什么的

存储 **句子 id** 及 Kimi **`learning-v1`** 解析结果（Side Panel「学习」+「词库」Tab）。

- 主键 `_id` = **全小写** `sentence_id`
- 字段与 Kimi JSON **平铺**落库（无 `learning` 外层、无 `page_url`）
- `POST /v1/grammar`：缓存命中直接读表；未命中调 Kimi 后 upsert
- 词库 Tab 推荐词来自 **`vocabulary[]`**；展示 **`seen_count`** 读 `words`（响应字段，grammar 会把 **不存在** 的 vocab 写入 `words`）

### 2.3 数据库结构

#### 主键 · `sentence_id` / `_id`

| 规则 | 说明 |
|------|------|
| 抽句 | Extension 与 Server 共用 `normalize(sentence)`：trim → 合并空白 → 按 `.!?` 切句 |
| **id** | `sentence_id = toLowerCase(normalize(sentence))` → 作为 `_id` **全小写** |

示例：原句 `"Although Markets Are Volatile."` → `_id` `"although markets are volatile."`

#### 字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `_id` | string | 是 | 全小写 sentence_id |
| `translation` | string | 是 | 整句中文翻译 |
| `vocabulary` | array | 是 | Kimi 推荐词/短语 |
| `vocabulary[].text` | string | 是 | 英文 |
| `vocabulary[].translation` | string | 是 | 中文释义 |
| `vocabulary[].note` | string | 否 | 学习提示 |
| `grammar` | object | 是 | 语法结构 |
| `grammar.main_clause` | string | 否 | 主句 |
| `grammar.clauses` | string[] | 否 | 从句 |
| `grammar.subject` | string | 否 | 主语 |
| `grammar.predicate` | string | 否 | 谓语 |
| `grammar.object` | string | 否 | 宾语/表语 |
| `grammar.modifiers` | string[] | 否 | 修饰成分 |
| `grammar.details` | string[] | 否 | 时态、连接词等 |
| `why_written` | string | 否 | 为什么这样写 |
| `similar_sentences` | array | 否 | 仿写例句（Kimi 字段名；用户称 similar_sentence） |
| `similar_sentences[].english` | string | 是 | 英文例句 |
| `similar_sentences[].translation` | string | 是 | 中文翻译 |
| `created_at` | ISODate | 是 | 首次写入 |
| `updated_at` | ISODate | 是 | 最后更新 |

#### 与 Kimi JSON 映射

Kimi `LearningResult` → Mongo **字段同名、同级**写入（`pkg/kimi/learning.go`）：

```json
{
  "translation": "string",
  "vocabulary": [{ "text": "string", "translation": "string", "note": "string" }],
  "grammar": {
    "main_clause": "string",
    "clauses": ["string"],
    "subject": "string",
    "predicate": "string",
    "object": "string",
    "modifiers": ["string"],
    "details": ["string"]
  },
  "why_written": "string",
  "similar_sentences": [{ "english": "string", "translation": "string" }]
}
```

### 2.4 索引结构

| 名称 | 键 | 用途 |
|------|-----|------|
| `_id_` | `{ _id: 1 }` | 主键 |
| `updated_at_desc` | `{ updated_at: -1 }` | 按更新时间列表 |

```javascript
db.sentences.createIndex({ updated_at: -1 })
```

### 2.5 接口结构

对应 Biz：`internal/biz` · Mongo：`internal/data/sentence_repo.go`  
领域类型与 `pkg/kimi.LearningResult` 对齐，**另加** `CreatedAt` / `UpdatedAt`。

#### 领域类型（`internal/biz/repo.go`）

```go
type VocabItem struct {
    Text        string
    Translation string
    Note        string
}

type GrammarBreakdown struct {
    MainClause string
    Clauses    []string
    Subject    string
    Predicate  string
    Object     string
    Modifiers  []string
    Details    []string
}

type SimilarSentence struct {
    English     string
    Translation string
}

type Sentence struct {
    ID               string // = _id，全小写
    Translation      string
    Vocabulary       []VocabItem
    Grammar          GrammarBreakdown
    WhyWritten       string
    SimilarSentences []SimilarSentence
    CreatedAt        time.Time
    UpdatedAt        time.Time
}
```

#### `SentenceRepo`（`internal/data/sentence_repo.go`）

```go
type SentenceRepo interface {
    Get(ctx context.Context, sentenceID string) (*biz.Sentence, error)
    Upsert(ctx context.Context, sentenceID string, s *biz.Sentence) error
}
```

| 方法 | 说明 | Mongo 操作 |
|------|------|------------|
| `Get` | 按 `_id` 读整文档 | `findOne({ _id })` |
| `Upsert` | grammar 写 Kimi 结果 | upsert：`$setOnInsert created_at`；`$set translation, vocabulary, grammar, why_written, similar_sentences, updated_at` |

**实现要点**

- 写入前：`sentenceID = strings.ToLower(normalize(sentence))`。
- `Get` 无文档 → `(nil, nil)` 或 `ErrNotFound`，由 Biz 决定是否调 Kimi。
- Kimi 返回可直接 `json` 解到 `LearningResult` 再映射到 `Sentence`（字段一一对应）。

#### Biz 调用

| Biz | Repo 方法 | usecase |
|-----|-----------|---------|
| `KeepMarkUsecase.ExplainGrammar` | `Get` → Kimi → `Upsert` | usecase §1.2 语法/学习 |

```javascript
// 示例
{
  _id: "although many investors understand that markets can be volatile.",
  translation: "尽管许多投资者明白市场可能剧烈波动。",
  vocabulary: [
    { text: "volatile", translation: "波动剧烈的", note: "形容市场、价格" }
  ],
  grammar: {
    main_clause: "many investors understand …",
    clauses: ["that markets can be volatile"],
    subject: "many investors",
    predicate: "understand",
    object: "that markets can be volatile",
    modifiers: [],
    details: ["一般现在时"]
  },
  why_written: "用 that 从句补充说明 understand 的内容。",
  similar_sentences: [
    { english: "…", translation: "…" }
  ],
  created_at: ISODate("…"),
  updated_at: ISODate("…")
}
```

---

## 3. 表关系

```text
sentences._id  ←──  words.sentence[]
     1                      N（同一 lemma 可关联多句）
```

无用户表、无事件表、无独立 cache 表。
