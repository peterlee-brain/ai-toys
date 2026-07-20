# 前端项目 Spec-first 模板

> 通用模板：适用于 Web、React、Chrome 插件、Electron 等前端项目。  
> 复用来源：KeepMark 项目实践。新项目启动时复制本目录到项目根，重命名为 `spec/` 并填充内容。

---

## 目录结构

```text
{project}/
├── spec/                    # 前端规格（本模板）
│   ├── README.md            # Spec 入口 + 必读顺序
│   ├── architecture.md      # 总纲：结构、分流、状态、术语表、修改地图
│   ├── product.md           # 业务边界 + 用户故事
│   ├── type-contracts.md    # TypeScript 类型与命名约定
│   ├── test-strategy.md     # 测试策略
│   ├── changelog.md         # 规格变更日志
│   ├── pages/               # 页面级规格（Web 项目）
│   │   └── home.md
│   └── surfaces/            # 界面面规格
│       ├── nav-bar.md
│       ├── modal-auth.md
│       └── ...
├── src/ 或 app/             # 生产代码
├── AGENTS.md                # Agent 启动 checklist
└── README.md                # 项目说明
```

---

## 文件规范

### 0. `PLAN.md`（项目根）

- 当前版本目标
- 已完成 / 进行中 / 待办
- 待确认问题
- **修改流程**：每次需求变更如何更新计划、改 spec、改代码、同步设计稿

### 1. `architecture.md` 必须包含

- 项目一句话定位
- 目录结构
- 系统上下文 / 数据流图
- 跨面/跨页分流规则
- 共享状态矩阵（含：字段、用途、写入者、重置时机）
- 状态流转图（Mermaid）
- 与 API 的边界
- 技术栈
- 术语表（Glossary）
- 修改地图（改什么 → 先改谁 → 再改谁）
- 阅读顺序

### 2. `product.md` 必须包含

- 产品一句话
- 目标用户
- 解决痛点
- 核心功能（用户视角）
- 产品边界（明确不做）
- 成功标准

**禁止**：把技术实现细节、算法、字段格式写进 `product.md`；这些属于 `architecture.md` / `type-contracts.md`。

### 3. 每个 Surface 规格必须包含

1. **职责** — 是什么、不属于什么
2. **展示内容** — 布局、文案、状态、空态、加载、错误
3. **交互** — 触发 → 逻辑 → 效果
4. **依赖** — API、State、消息、样式类名
5. **验收清单** — 改完后必须逐条确认的可检查项

### 4. `type-contracts.md` 必须包含

- 核心状态/类型定义
- API 请求/响应类型
- 命名约定（类型、变量、CSS、消息、API 字段）
- 与后端 API 的对齐流程

### 5. `test-strategy.md` 必须包含

- 测试层级（类型/编译、构建、单元、集成、E2E、设计稿走查）
- 各 Surface 测试重点
- 关键边界用例
- CI 建议

### 6. `changelog.md` 必须包含

- 版本号
- 新增/移除/变更清单
- 关键决策
- 规划中版本

---

## 真源声明（每个项目必须写入 `spec/README.md`）

```markdown
- **UI 行为唯一规格**：`spec/surfaces/*.md`。
- **设计稿**：`design/` 是可视化预览；冲突时以 `spec/surfaces/*.md` 为准。
- **API 契约**：后端 `api.md` 是字段真源。
- **当前进度**：`PLAN.md` 是任务看板。
- **改代码顺序**：先读 `PLAN.md` → 改 `spec/`（architecture / surfaces / product）→ 改代码 → 同步设计稿。
```

---

## Agent 约束（每个项目必须写入 `AGENTS.md`）

```markdown
## 启动 checklist

1. PLAN.md — 当前版本目标与进度
2. spec/architecture.md — 总纲
3. spec/product.md — 业务边界
4. spec/surfaces/README.md — 面规格索引
5. spec/type-contracts.md — 类型约定
6. 后端 api.md — API 契约

## 修改顺序

PLAN.md → spec/*.md → 代码 → 设计稿
```

---

## 使用方式

1. 复制 `.cursor/templates/spec-first-template/` 到新项目根目录。
2. 重命名为 `spec/`。
3. 按项目实际情况填充 `architecture.md` / `product.md` / `surfaces/*.md`。
4. 在项目根创建 `AGENTS.md`，引用 `spec/README.md`。
5. 在 `.cursor/rules/` 创建 `spec-first.mdc`，强制 Agent 先读 spec。
