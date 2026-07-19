# KeepMark — 类型约定

> 范围：`extension/` 中的 TypeScript 类型与后端 API 类型的映射。  
> 目标：让 AI 在改代码时，字段命名、可选性、类型与规格一致。

---

## 1. 共享状态 `KeepMarkState`

```typescript
interface KeepMarkState {
  // 选区与语境
  selection: string;        // 用户拖选的原文
  sentence: string;       // 系统补全的讲解语境
  pageUrl: string;          // 当前页面 URL
  pageTitle: string;        // 当前页面标题
  contextBefore: string;   // 选区前文
  contextAfter: string;    // 选区后文

  // 偏好
  autoTranslate: boolean;   // 选中即翻译开关

  // 学习数据
  grammarReady: boolean;    // 学习是否已就绪
  learning: LearningResponse | null;
  vocabulary: VocabularyItem[];

  // API 标识
  lemma: string;            // translate 返回的标准化词元
  sentenceId: string;       // 服务端为 sentence 分配的 ID

  // 留标索引
  savedKeys: string[];      // 同句同词去重键
  markedLemmas: string[];   // 已留标词元（本地展示用）
  bank: Record<string, BankEntry>;  // 本地留标缓存，key 为 lemma

  // UI 导航
  sidePanelTab: "grammar" | "bank";
  expandedBankLemma: string;  // 当前展开的词库行
}
```

> 默认值见 `extension/shared/types.ts`。

---

## 2. API 类型

### 请求

```typescript
interface TranslateRequest {
  selection: string;
  sentence: string;
  page_url: string;
}

interface GrammarRequest {
  selection: string;
  sentence: string;
  page_url: string;
}

interface MarkRequest {
  selection: string;
  sentence: string;
  sentence_id: string;
  lemma: string;
  page_url: string;
  source: "translate" | "grammar";
}
```

### 响应

```typescript
interface TranslateResponse {
  lemma: string;
  word: string;           // 原始选中词（可能与 lemma 不同）
  pos: string;
  translation: string;
  seen_count: number;
  recent_seen_time: string;
  from_cache: boolean;
}

interface GrammarResponse {
  sentence_id: string;
  selection: string;     // 请求时传入的 selection
  from_cache: boolean;
  translation: string;
  grammar: {
    main_clause: string;
    subject: string;
    predicate: string;
    object: string;
    clauses: string[];
    modifiers: string[];
    details: string[];
  };
  why_written: string;
  similar_sentences: { english: string; translation: string }[];
  vocabulary: VocabularyItem[];
}

interface MarkResponse {
  lemma: string;
  mark_count: number;
  recent_mark_time: string;
  message: string;
}

interface VocabularyItem {
  text: string;
  kind: string;
  occurrence_count: number;
  translation: string;
  note?: string;
}

interface BankEntry {
  lemma: string;
  meaning: string;
  count: number;
}
```

---

## 3. 命名约定

| 场景 | 命名风格 | 示例 |
|------|----------|------|
| TypeScript 类型 / 接口 | PascalCase | `KeepMarkState` |
| 状态字段 | camelCase | `grammarReady`, `sidePanelTab` |
| API 字段 | snake_case | `sentence_id`, `from_cache` |
| CSS 类名 | `km-` 前缀 + kebab-case | `.km-popover-header` |
| 消息类型 | `KEEPMARK_` 大写下划线 | `KEEPMARK_OPEN_SIDE_PANEL` |
| 保存键 | `lemma::sentence前80字` | `notwithstanding::They sat...` |

---

## 4. 与后端 API 的对齐

- 后端 `api.md` 是字段真源。
- 改 API 字段时，先改后端 `api.md`，再同步：
  1. `spec/type-contracts.md`
  2. `extension/shared/api-types.ts`
  3. `extension/shared/api.ts` 调用处
  4. 对应 `spec/ui/*.md` 的展示/依赖表
