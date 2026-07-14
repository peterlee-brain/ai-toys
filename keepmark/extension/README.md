# KeepMark Extension

Chrome 插件（Manifest V3），对接 **线上 KeepMark API**。

## 功能

- 英文网页 **选中即译**（Popover）
- **语法** Side Panel、**★ 留标**
- API 见 [../memory-bank/api.md](../memory-bank/api.md)

## 本地开发

```bash
npm install
npm run dev          # 开发
npm run build        # 生产构建
npm run typecheck
```

加载 `dist/chrome-mv3`（或 dev 输出目录）。  
API 地址：`VITE_API_BASE_URL` 或 `shared/api-base.ts` 默认值。

## 设计稿预览

静态展示页位于 keepmark 根目录（非 extension 代码内）：

```bash
open ../design/design.html
```

详见 [docs/ui-spec.md](./docs/ui-spec.md)。

## 目录

```
extension/
├── entrypoints/       background, content, sidepanel
├── shared/            api, api-types, 业务逻辑
├── assets/styles/     ui.css（插件与设计稿共用）
└── docs/
    ├── ui-spec.md     UI 定稿说明
    └── ui-preview.html  旧版交互预览
```

## VibeCoding

改代码前更新 [../memory-bank/](../memory-bank/)；跟 Agent 用 [../../DEVELOP.md](../../DEVELOP.md)。
