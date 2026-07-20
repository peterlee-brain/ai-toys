# UI 面规格（索引）

> 对应后端「按 UseCase 分章」。前端没有传统多 page，按 **界面面（Surface）** 展开。  
> 总纲：[../architecture.md](../architecture.md)

## 真源声明（Source of Truth）

- **UI 行为唯一规格**：`spec/ui/*.md`（即本目录）。
- **设计稿**：`spec/design/design.html` 是可视化预览；设计稿的文本化内容见 [design.md](./design.md)。当 `spec/design` 与 `ui/*.md` 冲突时，**以 `ui/*.md` 为准**，并反向更新设计稿。
- **跨面全局规则**：分流、完整句子判定、语境补全见 [../architecture.md](../architecture.md) 与 [../product.md](../product.md)。
- **代码**：`extension/` 与 `spec/design/` 是 `ui/*.md` 的实例化；改代码前先改对应 `ui/*.md`。

---

## 文档规范

每篇面文档固定五块：

1. **职责** — 这个面是什么、不属于什么  
2. **展示内容** — 布局、文案、状态、空态、加载、错误  
3. **交互** — 触发 → 逻辑 → 效果  
4. **依赖** — API、State、消息、样式类名  
5. **验收清单** — 改完后必须逐条确认的可检查项  

---

## 阅读顺序

1. [popover.md](./popover.md) — 网页浮层快译  
2. [sidepanel-shell.md](./sidepanel-shell.md) — 侧栏壳（标题 / Tab / 开关）  
3. [sidepanel-learning.md](./sidepanel-learning.md) — 「学习」Tab  
4. [sidepanel-bank.md](./sidepanel-bank.md) — 「词库」Tab  
5. [design.md](./design.md) — 设计稿如何作为可视化实例与上述面规格配合

---

## 面 ↔ 代码

| 面 | 主代码 | 可视化实例 |
|----|--------|-----------|
| Popover | `extension/entrypoints/content.ts` | `../design/design.html` §阅读场景 |
| Side Panel 壳 + Tab | `extension/entrypoints/sidepanel/main.ts` | `../design/design.html` §侧栏 |
| 学习内容 HTML | `extension/shared/render-learning.ts` | `../design/design.html` §侧栏 · 学习 |
| 词库内容 | `extension/entrypoints/sidepanel/main.ts` | `../design/design.html` §侧栏 · 词库 |
| 样式 | `extension/assets/styles/ui.css` | 同左 |
| 设计稿说明 | — | [design.md](./design.md) |

---

## 跨面状态总览

所有面共享 `KeepMarkState`（`chrome.storage.local`）。见 [../architecture.md §6 状态模型](../architecture.md)。

## 全局规则速查

| 规则 | 所在文档 |
|------|----------|
| 选区 → 哪一面 | [architecture.md §5 跨面分流](../architecture.md) |
| 完整句子判定 | [architecture.md §5](../architecture.md) · [product.md](../product.md) |
| 语境补全 | [product.md](../product.md) |
| 状态重置时机 | [architecture.md §6 状态模型](../architecture.md) |
