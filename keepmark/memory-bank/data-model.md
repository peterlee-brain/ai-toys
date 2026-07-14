# KeepMark — 数据模型

> 状态：草案 · 摘自 README 数据库设计，backend 落地前以本文为准。

## 表：users

用户标识（插件 device id + 可选账号绑定）。

## 表：words

| 列 | 类型 | 说明 |
|----|------|------|
| id | UUID | PK |
| user_id | UUID | |
| lemma | VARCHAR | 原形 |
| translation | TEXT | 默认释义 |
| mastery_level | SMALLINT | 0 生词 / 1 模糊 / 2 掌握 |
| first_seen_at | TIMESTAMP | |
| last_seen_at | TIMESTAMP | |
| total_occurrences | INT | |

唯一：`(user_id, lemma)`

## 表：word_occurrences

| 列 | 类型 | 说明 |
|----|------|------|
| id | UUID | PK |
| word_id | UUID | FK words |
| original_text | TEXT | |
| sentence | TEXT | |
| context_before | TEXT | |
| context_after | TEXT | |
| page_url | TEXT | |
| page_title | TEXT | |
| domain | VARCHAR | |
| grammar_note | TEXT | nullable |
| seen_count | INT | 同语境重复 |
| occurred_at | TIMESTAMP | |

索引：`(word_id, occurred_at)`、`(user_id, domain)`

## 合并规则

1. **同一 word + 同一 URL + 同一句子** → 合并，`seen_count++`
2. **同一 word、不同 URL 或句子** → 新 occurrence

## 表：grammar_notes（可选）

整句语法讲解，与 occurrence 多对一。

## Repo 约定（server 创建后补充）

- 查询必须参数化
- 按 `user_id` 隔离
