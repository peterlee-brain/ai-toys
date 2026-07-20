# KeepMark · 留标

> Chrome 插件：在英文网页选中即译、按需学习、☆ 留标。

## 代码在哪

| 部分 | 路径 |
|------|------|
| Chrome 插件 | [extension/](./extension/) |
| 前端规格 + 交互设计稿 | [spec/](./spec/) |
| API 契约 | [peter-sever/spec/svc_keepmark/api.md](../../../peter-sever/spec/svc_keepmark/api.md) |

## 本地开发

```bash
cd extension
npm install
npm run dev          # 或 npm run build
npm run typecheck
```

Chrome 加载 `extension/dist/`。API 默认见 `extension/shared/api-base.ts`（可配 `VITE_API_BASE_URL`）。

## 设计稿预览

```bash
cd spec/design && python3 -m http.server 9876
# 打开 http://localhost:9876/design.html
```

样式引用 `extension/assets/styles/ui.css`，与插件实现对齐。

## 文档

1. [spec/architecture.md](./spec/architecture.md) — 前端总纲
2. [spec/ui/](./spec/ui/README.md) — 按界面面：Popover / 学习 / 词库
3. [spec/ui/design.md](./spec/ui/design.md) — 设计稿的 AI 可读规格
4. [spec/product.md](./spec/product.md) — 产品
5. API 契约：[peter-sever/spec/svc_keepmark/api.md](../../../peter-sever/spec/svc_keepmark/api.md)

## 结构

```text
keepmark/
├── spec/              # 前端规格 + 交互设计稿
│   ├── architecture.md
│   ├── ui/
│   ├── product.md
│   └── design/
├── extension/         # Chrome MV3 插件
├── AGENTS.md
└── README.md
```
