# 面：交互设计稿（索引）

> 版本：v0.5  
> 文件：`spec/design/design.html` + `spec/design/design-interactive.js` + `spec/design/design-page.css`  
> 真源：每个面的具体交互归对应 `ui/*.md`；本文件是设计稿的 **AI 可读索引**，说明它包含哪些场景、如何启动、与四个面文档如何对应。

---

## 1. 职责

`spec/design/` 是 **UI 行为的可视化实例**：

- 在浏览器里可点击、可拖选、可预览 Popover / 侧栏 / 状态变化。
- 与插件共用 `../../extension/assets/styles/ui.css`。
- 改 UI 前先在设计稿里跑通，再改 `extension/`。

---

## 2. 文件结构

```text
spec/design/
├── design.html          # 单页交互稿：导航 + 阅读场景 + 侧栏
├── design-interactive.js # 模拟 content / sidepanel 行为
└── design-page.css      # 设计稿页面专属布局（非插件 UI）
```

---

## 3. 设计稿包含的场景

| 场景 | 操作 | 对应 `ui/*.md` | 验证点 |
|------|------|----------------|--------|
| 拖选单词 → Popover | 在阅读区拖选单个词 | [popover.md](./popover.md) | 约 300ms 出现；贴选区定位 |
| 拖选整句 → 侧栏学习 | 拖选完整句子 | [sidepanel-learning.md](./sidepanel-learning.md) | 不出现 Popover；打开「学习」Tab |
| Popover 点「学习」 | 浮层学习按钮 | [sidepanel-learning.md](./sidepanel-learning.md) | 关 Popover，开侧栏学习 |
| Popover 点 ☆ | 浮层留标按钮 | [popover.md](./popover.md) | Toast + ☆→★ |
| 打开 / 关闭 Side Panel | 导航链接或 × 按钮 | [sidepanel-shell.md](./sidepanel-shell.md) | 侧栏显隐、Tab 状态 |
| 切换学习 / 词库 Tab | 侧栏顶部 Tab | [sidepanel-shell.md](./sidepanel-shell.md) | 激活态切换 |
| 词库行展开 / 留标 | 侧栏「词库」面板 | [sidepanel-bank.md](./sidepanel-bank.md) | 展开收起、★ 状态 |
| 选中即翻译开关 | 侧栏标题栏 | [sidepanel-shell.md](./sidepanel-shell.md) | 开关样式 + 提示 |

---

## 4. 与面文档的映射

| 设计稿区域 | DOM 标识 | 对应面文档 | 必看章节 |
|------------|----------|------------|----------|
| 浮层 | `.km-popover` | [popover.md](./popover.md) | §2 展示、§3 交互 |
| 侧栏标题栏 | `.km-panel-header` | [sidepanel-shell.md](./sidepanel-shell.md) | §2 展示、§3 交互 |
| 侧栏「学习」 | `#panelGrammar` | [sidepanel-learning.md](./sidepanel-learning.md) | §2 展示、§3 交互 |
| 侧栏「词库」 | `#panelBank` | [sidepanel-bank.md](./sidepanel-bank.md) | §2 展示、§3 交互 |

---

## 5. 本地启动

```bash
cd spec/design
python3 -m http.server 9876
# 打开 http://localhost:9876/design.html
```

必须起本地服务，因为 `design-interactive.js` 用相对路径加载 `../../extension/assets/styles/ui.css`。

---

## 6. 与 AI 配合方式

1. **理解面长什么样**：先读对应 `ui/*.md` 的 §2 展示内容，再到 `../design/design.html` 里看实际渲染。
2. **改 UI 行为**：先改 `ui/*.md` 文字规格，再改 `spec/design/design.html` 可视化实例，最后改 `extension/` 代码。
3. **冲突时**：以 `ui/*.md` 为准，反向同步 `spec/design/design.html`。

---

## 7. 修改顺序

```text
ui/*.md 文字规格 → spec/design/design.html 可视化实例 → extension/ 代码
```

如需改共享样式，直接改 `extension/assets/styles/ui.css`（会同时影响插件与设计稿）。

---

## 8. 详细实现

具体 DOM 结构、mock 数据、事件绑定、定位算法等实现细节，直接阅读源文件：

- `spec/design/design.html`
- `spec/design/design-interactive.js`
- `spec/design/design-page.css`
