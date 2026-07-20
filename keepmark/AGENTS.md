# AGENTS.md — KeepMark

> 本目录是 **前端项目**（插件 + 设计稿）。Agent 改 keepmark 时读本文。

## 启动 checklist

1. [PLAN.md](./PLAN.md) — 当前版本目标与进度
2. [spec/architecture.md](./spec/architecture.md) — 总纲（含分流、状态矩阵）
3. [spec/ui/README.md](./spec/ui/README.md) — 按面规格
4. [spec/ui/design.md](./spec/ui/design.md) — 设计稿如何与面规格对应
5. [spec/product.md](./spec/product.md) — 产品边界
6. API 契约：[peter-sever/spec/svc_keepmark/api.md](../../../peter-sever/spec/svc_keepmark/api.md)

## 范围

- ✅ 改 `extension/`、`spec/design/`、`spec/`（architecture / ui / product）
- ❌ 不在本目录写后端架构、数据库、服务端实现文档
- ❌ 不重复维护 API 契约；后端 `api.md` 是 API 真源

改某个界面：先改对应 `spec/ui/*.md`，再改代码。  
改 API 调用字段：先改后端 `peter-sever/spec/svc_keepmark/api.md`，再同步 `extension/shared/api*.ts`。
