# 文档索引（人机协作）

本目录集中存放**产品、接口、数据模型与架构**说明，便于开发与 AI 助手快速对齐上下文。

| 文档 | 用途 |
|------|------|
| [product.md](./product.md) | 产品定义、范围、页面与流程 |
| [核心功能.md](./核心功能.md) | 个人自媒体能力地图 + 分阶段开发路线 |
| [api.md](./api.md) | HTTP API 说明（与代码/API 注释互为补充） |
| [database.md](./database.md) | 数据库设计与集合/字段约定 |
| [backend-architecture.md](./backend-architecture.md) | 后端分层、模块与扩展点 |
| [frontend-architecture.md](./frontend-architecture.md) | 前端目录、数据流与约定 |
| [bird-cli.md](./bird-cli.md) | Twitter/X：`@steipete/bird`（`bird`）CLI 说明与实测 |
| [bird-cli-test-output.txt](./bird-cli-test-output.txt) | 上述 CLI 的 `help` 实测原文（可随版本重跑更新） |
| [bird-cli-integration-tests.md](./bird-cli-integration-tests.md) | 带鉴权的只读集成测试矩阵 + 运行说明 |
| [.bird-credentials.env.example](./.bird-credentials.env.example) | 本地 `AUTH_TOKEN` / `CT0` 模板（复制为 `.bird-credentials.env`） |
| [plan.md](./plan.md) | 总体规划笔记 |
| [backend-plan.md](./backend-plan.md) | 后端侧规划/备忘 |
| [others.md](./others.md) | 杂项设计与注意事项 |
| [tweet-comment-prompt.md](./tweet-comment-prompt.md) | 推文评论相关 Prompt |
| [prototype-web.html](./prototype-web.html) | Web 原型（静态页） |
| [竞品功能调研.md](./竞品功能调研.md) | 竞品调研 |

代码入口：

- 后端：`../backend/`（Go，`go.mod` 所在目录）
- 前端：`../frontend/`（Vite + React）
