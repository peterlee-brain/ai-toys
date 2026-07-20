# Spec — KeepMark 前端规格

> 本目录覆盖 **前端架构**、**按界面面展开的 UI 规格**、**产品** 与 **交互设计稿**。  
> **API 契约**直接使用：[peter-sever/spec/svc_keepmark/api.md](../../../peter-sever/spec/svc_keepmark/api.md)。  
> **不含**后端实现、数据库、服务端分层。

## 真源声明

- **UI 行为唯一规格**：`spec/ui/*.md`（即本目录）。
- **设计稿**：`spec/design/design.html` 是可视化预览；文本化内容见 `spec/ui/design.md`。当 `spec/design` 与 `ui/*.md` 冲突时，**以 `ui/*.md` 为准**，并反向更新设计稿。
- **改代码顺序**：先改对应 `ui/*.md`（或 `architecture.md`），再改代码，再同步设计稿。

## Agent 约束

### 必读顺序

1. [architecture.md](./architecture.md) — 总纲（结构 + 分流 + 状态矩阵）
2. [ui/README.md](./ui/README.md) — **按面**：Popover / 壳 / 学习 / 词库
3. [ui/design.md](./ui/design.md) — 设计稿的 AI 可读规格（实例化映射）
4. [product.md](./product.md) — 产品边界与语境补全
5. API 契约：[peter-sever/spec/svc_keepmark/api.md](../../../peter-sever/spec/svc_keepmark/api.md)

### 修改顺序

```
先改 spec（architecture / ui / product）→ 再改 extension / spec/design
```

### 禁止

- 跳过文档直接改 UI 主流程或 API 调用字段
- 在本目录维护后端架构 / 数据表设计
- 硬编码密钥

---

## 文件索引

| 文件 | 内容 |
|------|------|
| [architecture.md](./architecture.md) | 前端总纲（结构、三角、分流、状态矩阵） |
| [ui/](./ui/README.md) | **界面面规格**（展示 + 交互 + 验收清单） |
| [product.md](./product.md) | 产品边界 |
| [design/](./design/) | 可视化交互设计稿 |

### ui/ 面列表

| 面 | 文件 |
|----|------|
| Popover | [ui/popover.md](./ui/popover.md) |
| Side Panel 壳 | [ui/sidepanel-shell.md](./ui/sidepanel-shell.md) |
| 学习 Tab | [ui/sidepanel-learning.md](./ui/sidepanel-learning.md) |
| 词库 Tab | [ui/sidepanel-bank.md](./ui/sidepanel-bank.md) |
| 设计稿（可视化实例） | [ui/design.md](./ui/design.md) |

---

## API 契约位置

后端规格：`peter-sever/spec/svc_keepmark/api.md`  
改接口字段前先改该文件，再同步 `extension/shared/api*.ts`。
