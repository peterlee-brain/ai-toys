# VibeCoding 标准作业程序（SOP）

> AI Toys 实验仓库强制执行流程。人与 Agent 均须遵守。  
> **日常跟 Agent 怎么说话** → 见 [DEVELOP.md](../../DEVELOP.md)。

## 一、核心理念

| 原则 | 说明 |
|------|------|
| 上下文第一 | 垃圾进，垃圾出；规格即上下文 |
| 规划驱动 | 先结构，后代码；无 PLAN 不进 Code |
| 增量交付 | 一次只做一个 PLAN 步骤 |
| 验证闭环 | lint/test/build + 人工 review |
| 人机分工 | 人定架构与验收，AI 执行与起草 |

## 二、五段式工作流

```
探索(Ask) → 规划(Plan) → 执行(Code) → 验证(Verify) → 同步(Sync)
```

### 1. 探索（Ask Mode）

**目标**：完全理解需求，禁止写业务代码。

产出：
- 需求分析（核心功能、非目标、约束）
- 技术方案对比（可选）
- 风险清单

提示词示例：
```
目标：实现 keepmark 选词 Popover
非目标：不做后端、不做 Side Panel
约束：遵循 keepmark/extension/docs/ui-spec.md
请先对比 2 种实现方案，不要写代码
```

### 2. 规划（Plan Mode）

**目标**：模块拆解、接口定义、文件清单。

产出：
- 更新 **子项目** `PLAN.md`（如 `keepmark/PLAN.md`）
- 复杂功能：在子项目 `memory-bank/` 下补充说明

**门禁**：无 PLAN.md 中「当前步骤」的完整定义 → 禁止进入 Code。

PLAN 必含：
- 目标 / 非目标
- 涉及文件清单
- 接口或行为契约
- 验收标准（可执行的命令）
- 风险与回滚

模板：[templates/PLAN.template.md](./templates/PLAN.template.md)

### 3. 执行（Agent Mode）

**目标**：只实现 PLAN 当前步骤。

规则：
- 一次一步；不顺手改无关文件
- 匹配现有命名、目录、类型风格
- 奥卡姆剃刀：不加无用抽象

提示词示例：
```
按 PLAN.md 步骤 1 实现。
只改列出的文件。完成后跑 quality-gate 命令。
```

### 4. 验证（Verify）

**目标**：证明改动可用。

必做（见 `.cursor/rules/quality-gate.mdc`）：
- 子项目 lint / typecheck / test / build
- 人工 smoke test（UI/API）
- 对照 PLAN 验收标准逐项勾选

Debug 只给：**预期 vs 实际 + 最小复现 + 文件路径**。

### 5. 同步（Sync）

**目标**：上下文不丢失。

必更新 **子项目**：

- `memory-bank/progress.md`
- `memory-bank/implementation-plan.md`

## 三、Memory Bank

**只在子项目内**：`<project>/memory-bank/`

参考：[keepmark/memory-bank/](../../keepmark/memory-bank/)

Agent 写代码 → 读 **当前子项目** 的 memory-bank。

## 四、Cursor 配置

| 路径 | 层级 |
|------|------|
| [README.md](../../README.md) | 仓库索引 |
| [DEVELOP.md](../../DEVELOP.md) | 日常话术 |
| [.cursor/rules/](../../.cursor/rules/) | 通用 alwaysApply |
| [keepmark/AGENTS.md](../../keepmark/AGENTS.md) | keepmark Agent 入口 |
| [keepmark/.cursor/rules/](../../keepmark/.cursor/rules/) | 子项目专用 |

**新项目**：复制 [scaffold-from-keepmark.md](./scaffold-from-keepmark.md)

## 五、人机决策矩阵

| 人 | AI |
|----|-----|
| 定架构、选型 | 生成实现代码 |
| 写/批 PLAN | 按 PLAN 执行 |
| Code Review | 写测试草稿 |
| 验收、merge | 探索方案、写文档初稿 |
| 安全审查 | 格式化、重复劳动 |

## 六、安全红线

- 禁止硬编码 API Key / token / 密码
- 禁止 `.env` 入库；用 `.env.example`
- 禁止 SQL/命令字符串拼接用户输入
- 最小权限原则（插件 manifest、API scope）

## 七、会话纪律

1. **一功能一会话** — 避免上下文污染
2. **代码一多就切** — 新窗口 + 读 Memory Bank 接力
3. **压缩前留锚点** — 关键决策写入 architecture.md 或 PLAN
4. **不盲信 AI** — 「应该可以」≠ 验证通过

## 八、新功能快速启动

```bash
# 1. 复制模板
cp docs/vibecoding/templates/PLAN.template.md <project>/PLAN.md

# 「读 <project>/AGENTS.md 和 <project>/PLAN.md，执行步骤 1」

# 3. 完成后
# 更新 memory-bank/progress.md
```

## 九、SpecCoding 进阶（可选）

三层规格：
1. **项目级** — `memory-bank/architecture.md`
2. **任务级** — `PLAN.md`
3. **功能级** — `docs/vibecoding/features/<feature>.md`

功能级模板：[templates/feature-spec.template.md](./templates/feature-spec.template.md)
