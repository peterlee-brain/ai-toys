# KeepMark Server

KeepMark 后端 · **单用户 · MongoDB 两表** · **Kimi**（翻译 + 语法 + 学习）。

## 规格（请先读）

- **[spec/README.md](./spec/README.md)** — 索引与 **Agent 约束**
- **[spec/data-model.md](./spec/data-model.md)** — 表字段、枚举、索引、Repo 接口
- **[spec/usecase.md](./spec/usecase.md)** — UseCase 业务逻辑（格式见 spec/README）
- **[spec/architecture.md](./spec/architecture.md)** — 架构与目录
- **[spec/api.md](./spec/api.md)** — HTTP API

## 数据模型摘要（v0.5）

```text
keepmark.words       _id = 小写 lemma · seen_count · mark_count · sentence[]

keepmark.sentences   _id = 全小写 sentence_id
                     translation, vocabulary[], grammar, why_written, similar_sentences[]
```

一词一条文档；多句语境在 `contexts` 数组。详见 [spec/data-model.md](./spec/data-model.md)。

## 本地开发

```bash
# MongoDB
docker run -d -p 27017:27017 mongo:7

export KIMI_API_KEY=...

cd server
make config && make build && make run
```

## 代码（AI 客户端已实现）

```text
internal/pkg/kimi/       # 翻译 + 语法 + 学习
internal/pkg/translate/  # Translator 接口（Kimi 实现）
internal/biz/keepmark.go # Usecase 骨架
```

Mongo Repository 与 HTTP 路由按 `spec/` 待实现。
