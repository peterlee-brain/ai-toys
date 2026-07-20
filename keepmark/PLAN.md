# KeepMark — 项目计划

> 用途：当前版本目标 + 任务看板 + 修改流程。  
> 每次 AI 进入项目时先读本文，再决定从哪开始改。

---

## 当前版本目标

**v0.5**：完成 KeepMark Chrome 插件的前端实现，与 `spec/` 文档完全对齐。  
插件在真实英文网页中完成：选中即译 → 语法讲解 → 留标，所有数据通过 API 写入服务。

---

## 状态总览

| 阶段 | 状态 |
|------|------|
| 产品边界定义 | 已完成 |
| 前端架构文档（spec/） | 已完成 |
| UI 面规格（spec/ui/） | 已完成 |
| 设计稿整理到 spec/design/ | 已完成 |
| 代码与 spec/ 对齐 | 进行中 |
| 类型约定落地 | 待办 |
| 测试策略落地 | 待办 |
| 后端联调 | 待办 |
| 发布前 E2E | 未开始 |

---

## 已完成

- [x] 产品边界明确：插件只写，复习由独立网站负责
- [x] 移除插件内时间线 / 统计 / 全局生词本
- [x] 按 Surface 拆分 UI 规格：Popover / 侧栏壳 / 学习 / 词库
- [x] 整理交互设计稿到 `spec/design/`
- [x] 创建 `spec/ui/design.md` 作为设计稿索引
- [x] 创建 `architecture.md` 总纲：分流、状态矩阵、术语表、修改地图
- [x] 创建 `product.md` / `type-contracts.md` / `test-strategy.md` / `changelog.md`
- [x] 创建通用 `agent_start.md` 模板供新项目复用
- [x] 更新 `.cursor/rules` 与 `AGENTS.md`

---

## 进行中

- [ ] 代码与 spec/ 对齐
  - 检查 `extension/entrypoints/content.ts` 是否按 `spec/ui/popover.md` 实现
  - 检查 `extension/entrypoints/sidepanel/main.ts` 是否按 `spec/ui/sidepanel-*.md` 实现
  - 检查 `extension/shared/types.ts` 是否与 `spec/type-contracts.md` 一致
  - 检查状态重置逻辑是否与 `spec/architecture.md` 状态矩阵一致

---

## 待办

- [ ] 类型约定落地：补全 `extension/shared/api-types.ts` 与 `api.ts`
- [ ] 测试策略落地：为完整句子判定、Popover 定位、状态重置添加单元测试
- [ ] 设计稿验证：在 `spec/design/design.html` 中跑通所有验收清单
- [ ] 后端联调：配置 `VITE_API_BASE_URL`，验证 `translate` / `grammar` / `mark`
- [ ] 发布前 E2E：真实 Chrome 网页 + 侧栏走完整流程
- [ ] 更新 `spec/changelog.md` v0.5 完成日期

---

## 待确认

暂无。

---

## 修改流程（每次需求变更）

```text
用户提需求
    ↓
AI 读 PLAN.md（了解当前进度）
    ↓
将需求拆成任务，更新 PLAN.md（移到「进行中」）
    ↓
按需求改 spec/ 相关文档
    - 产品边界 → spec/product.md
    - 分流/状态 → spec/architecture.md + spec/type-contracts.md
    - UI 行为 → spec/surfaces/*.md
    - 测试 → spec/test-strategy.md
    ↓
改代码（extension/ / src/）
    ↓
同步设计稿（spec/design/）
    ↓
运行检查
    - npm run typecheck
    - npm run build
    - 按验收清单走查
    ↓
任务完成
    - 移到 PLAN.md「已完成」
    - 更新 spec/changelog.md
```

---

## 真源提醒

- UI 行为：`spec/surfaces/*.md`
- API 字段：`peter-sever/spec/svc_keepmark/api.md`
- 状态与结构：`spec/architecture.md`
- 当前进度：**本文**
