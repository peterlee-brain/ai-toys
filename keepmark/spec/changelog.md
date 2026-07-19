# KeepMark 规格变更日志

> 记录 `spec/` 目录的重大变更，方便 AI 和开发者追踪从 v0.5 到后续版本的迁移。

---

## v0.5（当前）

**目标**：Chrome 插件完成「查词 → 学习 → 留标」写入服务。

### 新增

- 按 Surface 拆分 UI 规格：`spec/ui/popover.md` / `sidepanel-shell.md` / `sidepanel-learning.md` / `sidepanel-bank.md`
- 交互设计稿纳入 `spec/design/`，并新增 `spec/ui/design.md` 作为 AI 可读索引
- 前端总纲 `spec/architecture.md` 含分流规则、状态矩阵、术语表、修改地图
- 产品说明 `spec/product.md` 明确 v0.5 边界：插件只写，复习不在插件
- 测试策略 `spec/test-strategy.md`、类型约定 `spec/type-contracts.md`

### 移除

- `memory-bank/` 目录（统一并入 `spec/`）
- `memory-bank/usecase.md`（交互已分散到各面文档）
- `memory-bank/api.md`（API 真源使用后端 `peter-sever/spec/svc_keepmark/api.md`）
- 插件内时间线 / 今日新增/已留标统计 / 全局生词本列表

### 关键决策

- 整句选中跳过 Popover，直接进入 Side Panel「学习」
- 选中即翻译开关移至 Side Panel 标题栏
- 复习与全局浏览由后续独立网站负责，插件只记录

---

## v0.6（规划中）

- 后端为复习网站提供只读 API：词列表、句子详情、按时间/页面过滤等
- 插件内可能增加「最近学习」的本地快速入口（仍不替代复习网站）
