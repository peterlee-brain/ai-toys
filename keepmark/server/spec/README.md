# KeepMark Server · 规格文档

> **v0.5 · 单用户 · 两表 · 仅 Kimi**

---

## 文档索引

| 文档 | 内容 |
|------|------|
| [data-model.md](./data-model.md) | **数据模型**：表字段、枚举、索引、Repo 接口 |
| [usecase.md](./usecase.md) | **KeepMarkUsecase**：核心依赖 · 核心逻辑（翻译｜语法/学习｜留标） |
| [api.md](./api.md) | HTTP 契约：参数、返回值、字段名、用途、**调用位置** |
| [architecture.md](./architecture.md) | 分层、目录、配置、实现顺序 |
| [kimi-integration.md](./kimi-integration.md) | Kimi Prompt、模型 |

---

## Agent 约束（须遵守）

实现或改 spec / Biz / data **前必读本节**。用户不必重复说明，Agent 默认按下列规则执行。

### 一、文档分工与修改顺序

| 文件 | 只写什么 |
|------|----------|
| **data-model.md** | 表字段、索引、**Repo 接口（含增删改语义）** |
| **usecase.md** | 唯一 **`KeepMarkUsecase`**：核心依赖 + 核心逻辑（翻译｜语法/学习｜留标） |
| **api.md** | HTTP **契约**：每条接口的用途、**调用位置**、Request/Response **字段名**与类型、Biz 映射 |
| **architecture.md** | 分层、目录、实现顺序 |

**强制修改顺序**

1. 动 **data 层**（Repo 方法增/删/改、Mongo 操作变化）→ **先改 `data-model.md`**
2. 动 **业务流程** → 改 **`usecase.md`**
3. 动 **HTTP 契约** → 改 **`api.md`**
4. 最后改 Go 实现（`internal/biz/keepmark.go`、`internal/data/*`）

**禁止**：在 usecase 里复制字段表；在 data-model 里写逐步业务流程；改 Repo 却不改 data-model；在 api.md 写逐步业务流程（应链到 usecase.md）。

**api.md 每条接口必写**

| 项 | 说明 |
|----|------|
| **用途** | 接口解决什么用户动作 / 读写什么表 |
| **调用位置** | Extension 哪个 UI、哪个文件路径触发（Popover / Side Panel / 右键菜单等） |
| **Biz 映射** | 对应 `KeepMarkUsecase` 哪个方法 |
| **Request** | 字段名、类型、必填、含义 + JSON 示例 |
| **Response** | 字段名、类型、含义 + JSON 示例 |
| **错误** | 常见 `reason`（如有） |

**api.md 禁止**：写逐步业务流程（→ usecase.md）；收录 v0.5 未实现 API（如 track、GET 词库、stats）；复制 data-model 整表字段说明。

**修改 API 时**：先确认 usecase / data-model 已对齐，再改 api.md，最后改 `internal/service` 与 Extension 调用。

---

### 二、架构与代码

| 项 | 约定 |
|----|------|
| Biz | 仅 **`KeepMarkUsecase`** 一个 struct（前期不拆三个 UseCase） |
| 入口 | `Translate` · `ExplainGrammar` · `RecordMark` |
| Repo | `WordRepo` + `SentenceRepo`（按表拆，不按 API 拆） |
| 实现路径 | `internal/biz/keepmark.go` · `internal/biz/repo.go` · `internal/data/word_repo.go` · `internal/data/sentence_repo.go` |
| AI | **仅 Kimi**（不用 DeepL） |
| 鉴权 | 无；单用户 |

---

### 三、数据模型（v0.5）

| 项 | 约定 |
|----|------|
| 库 | `keepmark`；仅 **`words`** + **`sentences`** |
| `words._id` | 小写 **lemma**（normalize 选中词） |
| `sentences._id` | **`toLowerCase(normalize(sentence))`** 全小写 |
| `sentences` 字段 | Kimi **平铺**：`translation`, `vocabulary`, `grammar`, `why_written`, `similar_sentences`（无 `learning` 外层） |
| `words.seen_count` | 每次 **translate 请求** +1（库命中/未命中都 +1）；UI 展示次数 |
| `words.mark_count` | 每次留标 +1，可不停点；**只增不减，无取消** |
| `words.sentence[]` | translate `$addToSet`；**留标不改** |
| 留标 | **仅** `mark_count` + `recent_mark_time`；**无 unmark API** |
| 词库 | `sentences.vocabulary[]` + 响应 `seen_count` |

---

### 四、核心业务逻辑（必须与 usecase.md 一致）

#### 翻译 `Translate`

1. **选中词 → lemma**（`normalizeLemma`）
2. **查库** `words.GetByLemma`；若已有 **`translation` 非空** → **`RecordTranslateSeen`**（`seen_count++`，`$addToSet sentence`）→ **直接返回**，`from_cache: true`，**不调 Kimi**
3. **未命中** → Kimi（仅 `selection` + `sentence`）→ **`UpsertFromTranslate`** 写库 → 返回，`from_cache: false`

#### 语法 / 学习 `ExplainGrammar`

1. **sentence → 全小写 sentence_id**
2. **查库** `sentences.Get`；有 `translation` 且非 `force_refresh` → **不调 Kimi**，`from_cache: true`
3. **未命中** → Kimi `ExplainLearning` → **`sentences.Upsert`**
4. **共用（命中/未命中）**：`vocabulary[]` 中 **不在 `words` 的 lemma** → **`EnsureFromVocabulary` 写入**（`seen_count:0`，带 `translation`）；响应合并各词 **`words.seen_count`**（**grammar 本身不 +seen_count**）

#### 留标 `RecordMark`

1. **lemma** normalize
2. **`words.RecordMark`**：仅 **`mark_count++`** + **`recent_mark_time`**
3. **无取消留标**；无 `marked:false`；不改 translation / sentence / seen_count

---

### 五、usecase.md 写作格式

```text
## 1. KeepMarkUsecase
   ### 1.1 核心依赖
   ### 1.2 核心逻辑
       #### 翻译 | 语法/学习 | 留标   ← 逐步 + 函数名 + 写表说明
   ### 1.3 能力对照
   ### 1.4 交互总览
```

新增 Biz 步骤 → **先更新 usecase.md 流程树**，再写代码。

---

### 六、api.md 写作格式

与 usecase 三能力一一对应，**仅** 3 个业务 API + 健康检查：

```text
## 总览（API ↔ Biz ↔ 调用位置 对照表）
## 通用约定（normalize、错误体）
## 1. POST /v1/translate
## 2. POST /v1/grammar
## 3. PUT /v1/words/mark
## 4. 健康检查
## 5. API ↔ Biz ↔ 表
```

每个业务接口固定小节：**用途 · 调用位置 · Biz 映射 · Request · Response · 数据副作用**。

---

### 七、Extension 对齐

| UI | API |
|----|-----|
| Popover 快译 | `POST /v1/translate`（先查 words） |
| Side Panel 学习 | `POST /v1/grammar`（先查 sentences） |
| Side Panel 词库 | `vocabulary[]` + `PUT /v1/words/mark`（仅累计，无取消） |
| UI 预览 | `extension/docs/ui-preview.html` |

项目根：`ai-toys/keepmark/`。

---

## 两表主键速查

| 表 | 库·表 | `_id` |
|----|-------|-------|
| 单词表 | `keepmark.words` | 小写 lemma |
| 语法句子表 | `keepmark.sentences` | 全小写 sentence_id |

```javascript
// words 示例（sentence[] 元素 = 全小写 sentence_id，非原文句子）
{
  _id: "notwithstanding",
  pos: "adv.",
  seen_count: 7,
  mark_count: 3,
  sentence: [
    "the decision, notwithstanding the risks, was final.",
    "notwithstanding the delay, the project continued."
  ],
  translation: "尽管；虽然",
  recent_mark_time: ISODate("…")
}
```

---

## 技术栈

- Kratos v3 + MongoDB
- Kimi → `sentences` 平铺字段 + `words`（seen_count / mark_count）
- 无用户 / 无鉴权
