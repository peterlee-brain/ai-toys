# KeepMark · 留标

> **线上真实项目**：Chrome 插件 + 后端 API，在英文网页选中即译、留标积累词库。

## 代码在哪

| 部分 | 路径 |
|------|------|
| Chrome 插件 | [extension/](./extension/) |
| 后端服务 | `peter-sever/app/svc_keepmark/`（不在本目录） |
| 文档与规格 | [memory-bank/](./memory-bank/) |

## 本地开发

```bash
cd extension
npm install
npm run dev          # 或 npm run build
npm run typecheck
```

Chrome 加载 `extension/dist/`。API 默认见 `extension/shared/api-base.ts`（可配 `VITE_API_BASE_URL`）。

## 设计稿预览

静态 UI 展示页（不在 `extension/` 代码目录内）：

```bash
open design/design.html
```

样式引用 `extension/assets/styles/ui.css`，与插件实现对齐。

## 用 VibeCoding 开发本项目

1. 读 [memory-bank/README.md](./memory-bank/README.md)（Agent 约束 + 文档索引）
2. 跟 Agent 按 [DEVELOP.md](../DEVELOP.md)：`keepmark plan` → `keepmark go 1`
3. 改接口/产品前先改 memory-bank 里对应 md

## 结构

```
keepmark/
├── design/            # UI 设计稿展示（静态，非插件代码）
│   ├── design.html
│   └── design-page.css
├── extension/         # 插件源码
├── memory-bank/       # 产品、API、架构、进度（唯一文档目录）
├── PLAN.md            # 当前在做哪几步
└── .cursor/rules/     # 本子项目的 Agent 规则
```
