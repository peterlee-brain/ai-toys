# AI / Agent 协作说明

面向在本仓库内改代码的助手：请先建立上下文再动手。

## 必读顺序（建议）

1. 根目录 `README.md` — 如何启动、目录布局。
2. `docs/README.md` — 文档索引。
3. 任务相关：`docs/product.md` +（涉及接口则）`docs/api.md` +（涉及库表则）`docs/database.md`。
4. 全栈改动时同时浏览 `docs/backend-architecture.md` 与 `docs/frontend-architecture.md`。

## 约束

- **只改与任务相关的文件**，避免大范围格式化或与需求无关的重构。
- **API / 数据模型变更**时，同步更新 `docs/api.md` 或 `docs/database.md`（至少其一与代码一致）。
- **勿提交** `.env`、真实密钥与本地大文件；参照仓库根目录 `.env.example`。
- 后端默认监听 **`8080`**（见 `backend/configs/config.yaml`），前端 Vite 代理 `/api` 到该端口。

## 脚本与依赖

- 本地 MongoDB / Redis：`docker compose up -d`（仓库根目录）。
- 一键开发：`./start-dev.sh` 或 `./start-all.sh`（详见根 `README.md`）。
