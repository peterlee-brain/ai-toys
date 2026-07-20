# AI Toys 开发标准

> **日常开发按本文执行。** 跟 Agent 怎么说话、加功能、修 bug，都看这一份。  
> 完整工程流程见 [docs/vibecoding/SOP.md](./docs/vibecoding/SOP.md)。  
> keepmark 是 **线上真实项目**，在开发过程中实践下列流程。

---

## 1. 核心公式

```
[子项目名] + [动词] + [内容]
```

当前子项目通常是 **`keepmark`**，以后新项目替换名称即可。

| 动词 | 用途 | 会不会写代码 |
|------|------|-------------|
| **plan** | 新功能，先出计划 | 否 |
| **go** | 按计划写代码 | 是 |
| **ask** | 先讨论方案 | 否 |
| **fix** | 修 bug，先分析 | 先分析，通常你确认后改 |
| **go fix** | 方案已定，直接修 | 是 |

---

## 2. 加功能

### 2.1 标准流程（推荐）

**第 1 条 — 出计划**

```
keepmark plan：[一句话功能描述]
非目标：[明确不做啥，可省略]
```

**第 2 条 — 开干**

```
keepmark go 1
```

**第 3 条 — 下一步**

```
keepmark go 2
```

**完整示例**

```
keepmark plan：选中英文词 300ms 后自动弹出翻译 Popover
非目标：不做 Side Panel、不接新 API

keepmark go 1

keepmark go 2
```

### 2.2 小改动（跳过 plan）

范围很小、你心里有数时：

```
keepmark go：在 Popover 上加 ★ 留标按钮，遵循 ui-spec
非目标：不改 background 逻辑
```

### 2.3 先讨论再决定

```
keepmark ask：[问题]
```

**示例**

```
keepmark ask：语法讲解放 Side Panel 还是 Popover 里？各有什么代价？
```

### 2.4 用 @ 引用（Cursor 更省事）

```
@keepmark/memory-bank/usecase.md plan：实现 UC-2 语法讲解
```

```
@keepmark/PLAN.md go 1
```

---

## 3. 修 Bug

### 3.1 标准 fix（最常用）

```
keepmark fix：[报错原文或现象]
预期：[应该怎样]
实际：[现在怎样]
```

**示例**

```
keepmark fix：kimi translate: kimi: empty json content
预期：选中词弹出中文释义
实际：翻译失败，Popover 无内容
```

### 3.2 没有报错原文

```
keepmark fix：[现象]
预期：[应该怎样]
复现：[怎么触发，一句话]
```

**示例**

```
keepmark fix：选中词后 Popover 不出现
预期：300ms 后自动弹出翻译
复现：任意英文网页选中单词
```

### 3.3 第一轮没修好

```
keepmark fix：还是 [现象/报错]，加日志看 [接口/函数] 原始返回再修
```

或：

```
keepmark go fix：按你上条方案改，范围只限 [文件/模块]
```

### 3.4 已知原因，直接修

```
keepmark go fix：[原因] → [改什么]
非目标：[可选，不改啥]
```

**示例**

```
keepmark go fix：Kimi 返回空 content，在 completeTranslateJSON 加日志并处理空响应
非目标：不改 prompt
```

---

## 4. 续句表（按需加一行）

| 场景 | 加这一行 |
|------|----------|
| 卡范围 | `非目标：不动 server / 不改 api.ts` |
| 步骤过了 | `go 2` 或 `继续下一步` |
| 先别写码 | `先分析，我确认再改` |
| 换项目 | 把 `keepmark` 换成 `true-social` 等子项目名 |
| 涉及后端 | `后端在 peter-sever svc_keepmark` |

---

## 5. 怎么选模板

```
新功能？
  ├─ 不确定怎么做 → ask
  ├─ 需要先拆步骤 → plan → go 1 → go 2
  └─ 很小改动     → go：一句话

出错了？
  ├─ 不知道原因   → fix（预期 / 实际 / 复现）
  ├─ 修过一次还不行 → fix：还是…加日志
  └─ 已知怎么修   → go fix
```

---

## 6. 收藏版（4 条覆盖 90%）

复制到 Cursor，把 `[…]` 换成你的情况：

```
# 新功能
keepmark plan：[功能]
非目标：[…]

# 开干
keepmark go 1

# 修 bug
keepmark fix：[报错或现象]
预期：[…]
实际：[…]

# 讨论
keepmark ask：[问题]
```

---

## 7. 你不需要每次说的

以下已由 **`.cursor/rules/`** 和 **keepmark/memory-bank/** 配置，Agent 会自动遵守：

- 读子项目 AGENTS.md、memory-bank/README、quality-gate
- 大功能无 PLAN 不写代码
- 一次只做一个步骤
- 完成后跑 typecheck 等检查

---

## 8. 文档分层（遇到 deeper 问题时查）

| 文档 | 什么时候看 |
|------|------------|
| **本文 DEVELOP.md** | 日常：怎么跟 Agent 说话 |
| [docs/vibecoding/SOP.md](./docs/vibecoding/SOP.md) | 完整五段式流程 |
| `<project>/memory-bank/` | 子项目架构、进度 |
| [GUIDE.md](./GUIDE.md) | **文件都是干啥的** |

---

## 9. 推荐节奏

**新功能**

```
plan → 你看一眼 PLAN → go 1 → go 2 → …
```

通常 **2～4 条消息**，不用写小作文。

**修 bug**

```
fix →（必要时）go fix
```

通常 **1～2 条消息**。

---

*你负责说「做什么」；规范负责说「怎么做」。*
