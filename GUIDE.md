# ai-toys 文件说明

> **看不懂根目录有啥？看这一份就够。**  
> 日常跟 Agent 开发 → 只需 **[DEVELOP.md](./DEVELOP.md)**。

---

## 一、整体长什么样

```
ai-toys/                      ← 总文件夹（monorepo）
│
├── 【你只需要常看的】
│   ├── README.md             项目索引、有哪些子工程
│   ├── DEVELOP.md            ★ 跟 Agent 怎么说话（plan/go/fix）
│   └── GUIDE.md              本文件：每个东西是干什么的
│
├── 【Cursor 自动用的，不用每天看】
│   └── .cursor/rules/*.mdc   Agent 自动遵守的规则
│
├── 【需要时再翻】
│   └── docs/vibecoding/      完整 SOP、模板、开新项目指南
│
├── keepmark/                 子工程 1：线上英文阅读插件
└── true-social/              子工程 2：社媒 + K 线
```

**ai-toys** = 你的真实项目集合 + 用 VibeCoding 规范跟 Agent 协作。不是「空练习题库」。

---

## 二、根目录每个文件/文件夹

| 路径 | 干什么 | 你要不要看 |
|------|--------|------------|
| **README.md** | 总索引：有哪些子项目、怎么进 | 偶尔 |
| **DEVELOP.md** | 话术模板：`keepmark plan` / `go 1` / `fix` | **经常** |
| **GUIDE.md** | 文件地图（本文件） | 不熟悉结构时 |
| **.cursor/rules/** | Cursor Agent **自动执行**的规范（`.mdc`） | 一般不看；要加规则时改这里 |
| **docs/vibecoding/** | 完整流程 SOP、PLAN 空模板、复制 keepmark 开新项目 | 开新项目或深入学时 |
| **.gitignore** | git 忽略 node_modules 等 | 不用管 |

---

## 三、`.cursor/rules/*.mdc` 是什么

**Cursor 专用规则文件**，对话时 **自动** 塞进 Agent，不用你每次重复。

| 文件 | 作用 |
|------|------|
| `vibecoding-core.mdc` | 先 Plan 再 Code；一次只改一个子工程 |
| `memory-bank.mdc` | 写代码前读 **子工程** 的 memory-bank |
| `quality-gate.mdc` | 改完要验证，不能硬编码密钥 |

子工程里还有各自的 `.mdc`（见 keepmark 一节）。

---

## 四、子工程：keepmark

```
keepmark/
├── extension/          ★ Chrome 插件代码
├── memory-bank/        ★ 架构、规格、计划、进度（唯一文档目录）
├── .cursor/rules/
├── PLAN.md
└── README.md
```

| 路径 | 干什么 | 你要不要看 |
|------|--------|------------|
| **extension/** | TS 源码 | 写插件时 |
| **memory-bank/README.md** | Agent 约束 + 文件索引 | 不熟悉时 |
| **memory-bank/product.md** | 产品做什么 | 定需求时 |
| **memory-bank/usecase.md** | 用户流程 | 做功能前 |
| **memory-bank/api.md** | 接口契约 | 改 API 前 |
| **memory-bank/data-model.md** | 数据库 | 改 DB 前 |
| **extension/docs/ui-spec.md** | UI 定稿 | 改界面时 |
| **memory-bank/progress.md** | 进度日志 | 偶尔 |
| **PLAN.md** | 当前任务步骤 | 开新功能时 |

**后端 API** 不在 keepmark 里，在：`peter-sever/app/svc_keepmark/`。

---

## 五、子工程：true-social

```
true-social/
├── backend/            Go 后端
├── frontend/           React 前端
├── docs/               产品、API、架构文档
├── agent/AGENTS.md     Agent 说明（旧结构）
└── README.md           怎么启动
```

| 路径 | 干什么 |
|------|--------|
| **docs/** | 业务文档 |
| **backend/、frontend/** | 代码 |

文档结构与 keepmark 的 memory-bank 不同；开发时读 `true-social/docs/` 即可。

---

## 六、你日常只需要记住

```
1. 看 DEVELOP.md → 复制 plan / go / fix 话术
2. 进对应子工程干活（keepmark 或 true-social）
3. 其余 .mdc、AGENTS、SOP 都是给 Agent 或以后查阅的
```

**开新子工程**：在本仓库新建文件夹，可参考 keepmark 的 `memory-bank/` 结构。  
详见 [docs/vibecoding/scaffold-from-keepmark.md](./docs/vibecoding/scaffold-from-keepmark.md)。

---

## 七、跟 Agent 说话示例

```text
keepmark plan：Popover 翻译优化
keepmark go 1
keepmark fix：kimi empty json / 预期有释义 / 实际报错
```

```text
true-social plan：…
true-social go 1
```
