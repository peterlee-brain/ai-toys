# Memory Bank — KeepMark

> 本项目的 **产品、API、架构、进度** 全在这里。Agent 写代码前必读。

## Agent 约束

### 必读顺序

1. [architecture.md](./architecture.md)
2. [implementation-plan.md](./implementation-plan.md) · [../PLAN.md](../PLAN.md)
3. 按任务读 [product.md](./product.md)、[usecase.md](./usecase.md)、[api.md](./api.md)、[data-model.md](./data-model.md)
4. UI：[extension/docs/ui-spec.md](../extension/docs/ui-spec.md)

### 修改顺序

```
先改 memory-bank → 再改 PLAN → 再改代码（extension / peter-sever）
```

### 禁止

- 跳过文档直接改 API/DB/UI 行为
- 无 PLAN 做大功能
- 硬编码密钥

---

## 文件索引

| 文件 | 内容 |
|------|------|
| [architecture.md](./architecture.md) | 模块、目录、决策 |
| [tech-stack.md](./tech-stack.md) | 技术选型 |
| [product.md](./product.md) | 产品边界 |
| [usecase.md](./usecase.md) | 用户流程 |
| [api.md](./api.md) | HTTP 接口 |
| [data-model.md](./data-model.md) | 数据库 |
| [implementation-plan.md](./implementation-plan.md) | backlog |
| [progress.md](./progress.md) | 进度日志 |
