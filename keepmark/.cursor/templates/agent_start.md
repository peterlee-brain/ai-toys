# Agent Start — 前端项目生成指令

> 用途：新建前端项目时，把本文件 + 你的需求一起交给 AI，AI 会按以下标准生成完整的 `spec/` 架构与前端代码。

---

## 你的任务

根据用户提供的需求，生成一个完整的前端项目。项目必须包含：

1. `PLAN.md`：当前版本目标 + 任务看板 + 修改流程
2. `spec/` 目录：所有架构、UI、产品、类型、测试文档
3. 生产代码目录（如 `src/` / `app/` / `extension/`，根据项目类型选择）
4. 可选的 `design/` 可视化设计稿
5. 根目录 `README.md` 和 `AGENTS.md`

---

## 必须生成的 `spec/` 结构

```text
spec/
├── README.md              # 入口：必读顺序 + 真源声明
├── architecture.md        # 总纲：结构、分流、状态、术语表、修改地图
├── product.md             # 业务边界：用户、痛点、功能、边界、成功标准
├── type-contracts.md      # 类型约定与命名规范
├── test-strategy.md       # 测试策略
├── changelog.md           # 版本变更日志
├── pages/                 # 页面级规格（Web/App 项目）
│   └── {{page-name}}.md
└── surfaces/              # 界面面规格
    ├── README.md
    ├── {{surface-1}}.md
    └── {{surface-2}}.md
```

如果项目没有明显多页面（如 Chrome 插件、单页工具），可以省略 `pages/`，直接把 Surface 放在 `spec/surfaces/`。

---

## 每个文件的内容要求

### `spec/README.md`

- 项目一句话定位
- 真源声明：UI 行为以 `spec/surfaces/*.md` 为准，API 以上游 `api.md` 为准
- 必读顺序：architecture → product → surfaces → type-contracts → 后端 api
- 修改顺序：先改 spec，再改代码，再同步设计稿

### `spec/architecture.md`

- 项目结构图
- 系统上下文 / 数据流图（Mermaid）
- 跨面/跨页分流规则
- 共享状态矩阵（字段、用途、写入者、重置时机）
- 状态流转图（Mermaid）
- 与 API 的边界
- 技术栈
- 术语表（Glossary）
- 修改地图（改什么 → 先改谁 → 再改谁）
- 阅读顺序

### `spec/product.md`

- 产品一句话
- 目标用户
- 解决痛点
- 核心功能（用户视角）
- 产品边界（明确不做）
- 成功标准

**禁止写**：技术实现细节、算法、字段格式。这些属于 `architecture.md` / `type-contracts.md`。

### `spec/surfaces/*.md`

每个 Surface 必须包含 5 块：

1. **职责** — 是什么、不属于什么
2. **展示内容** — 布局、文案、状态、空态、加载、错误
3. **交互** — 触发 → 逻辑 → 效果
4. **依赖** — API、State、消息、样式类名
5. **验收清单** — 改完后必须逐条确认的可检查项

### `spec/type-contracts.md`

- 核心状态/类型定义
- API 请求/响应类型
- 命名约定：
  - 类型：PascalCase
  - 状态字段：camelCase
  - API 字段：snake_case
  - CSS 类名：统一前缀 + kebab-case
  - 消息/事件：全大写下划线
- 与后端 API 的对齐流程

### `spec/test-strategy.md`

- 测试层级（类型/编译、构建、单元、集成、E2E、设计稿走查）
- 各 Surface 测试重点
- 关键边界用例
- CI 建议

### `spec/changelog.md`

- 版本号
- 新增/移除/变更清单
- 关键决策

---

## 代码生成要求

1. 先读完并生成 `spec/` 全部文档，再生成代码。
2. 代码必须与 `spec/` 对齐：
   - 类型命名见 `type-contracts.md`
   - 状态字段见 `architecture.md` 状态矩阵
   - UI 行为见 `surfaces/*.md`
   - API 调用字段见后端 `api.md`（如用户未提供，则先写 mock）
3. 组件/文件结构要反映 `spec/` 的 Surface 划分。
4. 保留可运行脚本：`npm install`、`npm run dev`、`npm run build`、`npm run typecheck`（或项目对应命令）。

---

## 根目录文件

### `README.md`

- 项目说明
- 代码目录
- 本地开发命令
- 文档索引

### `AGENTS.md`

- 启动 checklist（引用 `spec/README.md`）
- 范围
- 修改顺序：先改 spec，再改代码/设计稿

---

## 通用原则

- **Spec-first**：任何 UI / API / 状态改动，先写文档再写代码。
- **Source of Truth**：`spec/surfaces/*.md` 是 UI 行为真源；上游 `api.md` 是 API 字段真源。
- **明确不做**：每个文档都要写「明确不做」或「产品边界」，防止范围蔓延。
- **可验收**：每个 Surface 必须有验收清单。
- **少即是多**：不要写注释式代码，不要写废话，只保留必要文档。

---

## 输出顺序

请按以下顺序生成并输出：

1. `spec/README.md`
2. `spec/architecture.md`
3. `spec/product.md`
4. `spec/surfaces/README.md`
5. `spec/surfaces/*.md`（每个面一个文件）
6. `spec/type-contracts.md`
7. `spec/test-strategy.md`
8. `spec/changelog.md`
9. 生产代码（`src/` / `app/` / `extension/` 等）
10. 可选的 `design/` 设计稿
11. 根目录 `README.md` 和 `AGENTS.md`
12. 项目根 `PLAN.md` — 当前版本目标 + 任务看板 + 修改流程

---

## 后续追加需求的处理流程

项目已建成后，如果用户提出新需求，请按以下流程执行，不要直接改代码。

### 第一步：读计划

1. 先读 `PLAN.md`，了解当前版本目标、已完成项、进行中和待办。
2. 判断新需求属于：
   - 当前版本内（移到「进行中」）
   - 下版本规划（移到「待办」或新建版本）
   - 超出产品边界（建议用户不做，并说明原因）

### 第二步：分析影响范围

根据需求类型，定位需要修改的 `spec/` 文件：

| 需求类型 | 先改 | 可能还要改 |
|----------|------|------------|
| 新增/修改 UI 面 | `spec/surfaces/{{面}}.md` | `spec/architecture.md`（分流/状态）、`spec/type-contracts.md`（类型）、`spec/test-strategy.md` |
| 改变业务边界 | `spec/product.md` | `spec/architecture.md`、`spec/surfaces/*.md` |
| 改变跨面分流或状态 | `spec/architecture.md` + `spec/product.md` | 所有相关 `spec/surfaces/*.md` |
| 新增/修改 API 字段 | 先确认上游 `api.md` | `spec/type-contracts.md`、调用该 API 的 `spec/surfaces/*.md`、代码中的 API 层 |
| 新增页面 | `spec/pages/{{page}}.md` | `spec/architecture.md`、相关 `spec/surfaces/*.md` |
| 改样式/主题 | `spec/surfaces/*.md` 的样式类名 | `design/`、共享样式文件 |

### 第三步：更新 PLAN.md

在 `PLAN.md` 中新增一条「进行中」任务，格式：

```markdown
- [ ] {{任务简述}}（来自需求：{{需求摘要}}）
  - 影响：{{spec 文件列表}}
  - 风险：{{如有}}
```

### 第四步：改 spec

按第二步确定的影响范围，依次修改相关 `spec/` 文档。  
每改一个 spec 文件，同步更新该文件的验收清单。

### 第五步：改代码

1. 按 `spec/surfaces/*.md` 的交互和验收清单改 UI 代码。
2. 按 `spec/type-contracts.md` 改类型和 API 调用。
3. 按 `spec/architecture.md` 状态矩阵改状态管理。

### 第六步：同步设计稿

如果改了 UI 行为或布局，同步 `design/`（或 `spec/design/`）可视化设计稿。  
如果设计稿只是演示框架样式，可只改 `design-page.css` 等页面级样式。

### 第七步：验证

1. 运行类型检查：`npm run typecheck`（或项目对应命令）
2. 运行构建：`npm run build`
3. 按相关 `spec/surfaces/*.md` 的 §5 验收清单逐条勾选
4. 如有测试，运行对应测试

### 第八步：归档

1. 把 `PLAN.md` 中该任务从「进行中」移到「已完成」。
2. 更新 `spec/changelog.md`：新增/变更/关键决策。
3. 如果涉及产品边界变化，同步更新 `spec/product.md` 和 `AGENTS.md`。

---

## 追加需求示例格式

用户后续可以这样提需求：

> **需求**：在 Popover 上增加一个「复制原句」按钮，点击后把 `sentence` 复制到剪贴板。

AI 应自动执行：读 `PLAN.md` → 改 `spec/ui/popover.md` → 改 `extension/entrypoints/content.ts` → 验收 → 更新 `PLAN.md` + `changelog.md`。

---

## 用户现在给你的需求是

{{请在这里粘贴你的初始需求}}
