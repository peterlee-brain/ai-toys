# KeepMark — 用例与流程

> 状态：草案 · 与 [product.md](./product.md) 对齐

## UC-1 选中即译

**触发**：用户在英文网页拖选文本（词/短语/句）

**主流程**

1. content 监听 `selectionchange`（300ms 防抖）
2. 抽取选区、前后语境、所在句子
3. 自动展示翻译 Popover（无需二次点击）
4. background 调用 `POST /v1/translate`（线上 API）
5. 展示释义；失败则降级提示

**非目标**：不翻译整页；不自动打开 Side Panel

## UC-2 语法讲解

**触发**：用户点击浮条「语法」或快捷键 `Alt+G`

1. 将当前选区（句子级）送 Side Panel
2. 调用 `POST /grammar`
3. 展示成分、从句、时态、难点、简化复述

## UC-3 ★ 留标

**触发**：Popover Header 点击 ★ 或 `Alt+S`

1. 标记当前词为「留标」
2. 写入词库（`PUT /v1/words/mark`）
3. Toast 反馈；句内词库更新出现次数

**规则**（见 product.md）

- 已 ★ 词：持久保留
- 未 ★ 且重复出现：自动略过（降噪）

## UC-4 句内词库

**触发**：Side Panel「词库」Tab

- 展示当前句拆分词汇 + 出现次数
- 点击词可重新查译

## 状态（extension 本地）

| 状态 | 说明 |
|------|------|
| idle | 无选区 |
| selecting | 防抖中 |
| translating | 请求中 |
| shown | Popover 展示 |
| error | 可重试 |

## 相关

- UI：[extension/docs/ui-spec.md](../extension/docs/ui-spec.md)
- API：[api.md](./api.md)
