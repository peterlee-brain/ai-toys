# AGENTS.md — {{ProjectName}}

> 本目录是 **{{项目类型}}**。Agent 改代码时读本文。

## 启动 checklist

1. [PLAN.md](./PLAN.md) — 当前版本目标与进度
2. [spec/architecture.md](./spec/architecture.md) — 总纲（结构 + 分流 + 状态矩阵）
3. [spec/product.md](./spec/product.md) — 业务边界
4. [spec/surfaces/README.md](./spec/surfaces/README.md) — 按面规格
5. [spec/type-contracts.md](./spec/type-contracts.md) — 类型约定
6. {{后端/上游 API 契约}} — API 真源

## 范围

- ✅ 改 `src/`、`design/`、`spec/`（architecture / surfaces / product / type-contracts）
- ❌ 不在本目录写后端架构、数据库、服务端实现文档
- ❌ 不重复维护 API 契约；上游 `api.md` 是 API 真源

## 修改顺序

```
PLAN.md → spec/ 文字规格 → design/ 可视化实例 → src/ 代码
```

改某个界面：先读 `PLAN.md`，再改对应 `spec/surfaces/*.md`，再改代码。  
改 API 调用字段：先改上游 `api.md`，再同步 `spec/type-contracts.md` 与 `src/api*.ts`。
