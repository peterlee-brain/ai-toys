# PLAN — KeepMark

> 状态：进行中  
> 子项目：keepmark（**线上项目**）

## 用法

```
keepmark go 1
```

## 当前：设计稿 HTML 展示页

### 目标

- 新增 `keepmark/design/design.html`，静态展示 Popover / Toast / Popup / Side Panel 设计稿
- **直接引用** `assets/styles/ui.css`（`--km-*` tokens），DOM 结构与 `entrypoints/` 实现对齐
- 便于产品 / 设计评审，无需加载 Chrome 插件

### 非目标

- 不替换 `ui-preview.html`（旧版交互预览，使用 `--era-*` 独立样式）
- 不接入真实 API 或 Chrome Extension API
- 不改插件运行时逻辑

### 步骤

| # | 内容 | 验收 |
|---|------|------|
| 1 | 新增 `design/design.html` + `design/design-page.css` | 浏览器打开 `keepmark/design/design.html`，各区块样式正常 |
| 2 | 更新 `extension/README.md`、`docs/ui-spec.md` 引用 | 文档含打开方式 |
| 3 | 更新 `memory-bank/progress.md` | 有变更记录 |

### 打开方式

```bash
open keepmark/design/design.html
# 或 VS Code / Cursor Live Preview
```

## 话术

见 [DEVELOP.md](../DEVELOP.md)
